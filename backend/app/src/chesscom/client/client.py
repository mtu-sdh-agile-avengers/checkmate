import asyncio
from collections import OrderedDict
from collections.abc import Awaitable, Callable
from enum import Enum
from typing import ClassVar

import httpx
from fastapi import status
from loguru import logger

from src.chesscom.client.exceptions import (
    ChessAPIError,
    ChessAPINotFoundError,
    ChessAPIRateLimitError,
    ChessAPITooManyRetriesError,
    ChessAPIUnavailableError,
)
from src.chesscom.client.protocols import ExternalChessComAPIClient


class ExternalTimeout(float, Enum):
    DEFAULT_TIMEOUT_SECONDS = 3.0
    LONG_TIMEOUT_SECONDS = 7.5
    DOUBLE_LONG_TIMEOUT_SECONDS = LONG_TIMEOUT_SECONDS * 2.0


# NOTE: serial access for Chess.com PubAPI is unlimited, but parallel are limited => semaphor used;
class ChessComClient(ExternalChessComAPIClient):
    DEFAULT_CONCURRENT_REQUESTS_LIMIT: ClassVar[int] = 2

    # max number of cached responses
    CACHE_MAX_ENTRIES: ClassVar[int] = 512

    # max total size of cached bodies (64 MiB)
    CACHE_MAX_BYTES: ClassVar[int] = 64 * 1024 * 1024

    def __init__(
        self,
        base_url: str,
        user_agent: str,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        concurrent_requests_limit: int = DEFAULT_CONCURRENT_REQUESTS_LIMIT,
        use_http2: bool = True,
        allow_retry: bool = True,
        follow_redirects: bool = True,
    ):
        if transport is not None and use_http2:
            raise ValueError(
                "http2=True has no effect with a custom transport;"
                "pass httpx.AsyncHTTPTransport(http2=True) instead"
            )

        # ETag cache (LRU): request path -> (ETag, response); used for conditional requests (If-None-Match -> 304)
        # OrderedDict keeps insertion order: the first item is the Least Recently Used one, so it is evicted (pop out) first
        self._etag_cache: OrderedDict[str, tuple[str, httpx.Response]] = OrderedDict()
        self._etag_cache_bytes = 0

        # single-flight: path -> the request in progress; concurrent callers of the same path await it
        self._in_flight: dict[str, asyncio.Task[httpx.Response]] = {}

        self.api_client = httpx.AsyncClient(
            base_url=base_url,  # base url (prepended) for all outgoing requests
            headers={
                "User-Agent": user_agent,  # chess.com requires User-Agent header to prevent temporary blocking due to "abnormal activity"
                "Accept-Encoding": "gzip, deflate, br, zstd",  # chess.com gzips responses (for data >200 bytes); it may reduce download bandwidth by up to 80%; httpx provides encoding out of the box
            },
            transport=transport,  # allows to mock out HTTPTransport, and return pre-determined responses; None means real network
            follow_redirects=follow_redirects,  # allows to automatically follow redirect response (i.e., useful when change in API contacts appears)
            http2=use_http2,  # use of HTTP/2 may slightly improve performance (header compression, binary transfer, multiplexed responses)
        )
        self._allow_retry = allow_retry  # if True, then "transient errors" (429, 5xx, timeouts, network errors) are retried
        self._semaphore = asyncio.Semaphore(
            concurrent_requests_limit
        )  # semaphore is required due to limited parallel access (which may lead to 429)

    async def _request(
        self, request_func: Callable[[httpx.AsyncClient], Awaitable[httpx.Response]]
    ) -> httpx.Response:
        """Executes an HTTP Request using semaphore as an asynchronous context manager.

        Args:
            request_func (Callable[[httpx.AsyncClient], Awaitable[httpx.Response]]): Callback function doing actual request.

        Returns:
            httpx.Response: HTTP Response object if successful.
        """
        async with self._semaphore:
            r = await request_func(self.api_client)

        if (
            r.status_code != status.HTTP_304_NOT_MODIFIED
        ):  # 304 is a valid answer to a conditional request (If-None-Match): it means the cached response is still up to date
            r.raise_for_status()

        return r

    async def aclose(self) -> None:
        await self.api_client.aclose()

    async def retry[T](
        self,
        coro: Callable[[], Awaitable[T]],
        *,
        max_retries: int = 3,
        retry_interval: float = 1.0,
    ) -> T:
        """Calls `coro` (coroutine) until it succeeds or retries limit exceeded.

        Only `ChessAPIUnavailableError` and `ChessAPIRateLimitError` are retried.

        Args:
            coro (Callable[[], Awaitable[T]]): Zero-arg factory returning a fresh awaitable per attempt.
            max_retries (int): Limit to the amount of the attempts (>=1).
            retry_interval (float): Delay in seconds between attempts.

        Raises:
            ValueError: If `max_retries` < 1.
            ChessAPITooManyRetriesError: If retries limit (every attempt failed) exceeded.

        Returns:
            T: Result of the first successful attempt.
        """
        if max_retries < 1:
            raise ValueError("max_retries must be >=1")

        for retry_num in range(1, max_retries + 1):
            try:
                return await coro()
            except (ChessAPIUnavailableError, ChessAPIRateLimitError) as e:
                if retry_num == max_retries:
                    raise ChessAPITooManyRetriesError() from e
                logger.warning(
                    f"Attempt {retry_num}/{max_retries} failed ({e}), retrying in {retry_interval:.2f}s."
                )
                await asyncio.sleep(retry_interval)

        raise ChessAPITooManyRetriesError()

    def _remember(self, key: str, etag: str, r: httpx.Response) -> None:
        """Caches the response (ETag); evicts least recently used ones over the count or size limit."""
        self._forget(key)
        self._etag_cache[key] = (etag, r)
        self._etag_cache_bytes += len(r.content)

        while self._etag_cache and (
            len(self._etag_cache) > self.CACHE_MAX_ENTRIES
            or self._etag_cache_bytes > self.CACHE_MAX_BYTES
        ):
            _, (_, evicted) = self._etag_cache.popitem(last=False)
            self._etag_cache_bytes -= len(evicted.content)

    def _forget(self, key: str) -> None:
        if (old := self._etag_cache.pop(key, None)) is not None:
            self._etag_cache_bytes -= len(old[1].content)

    async def _get(self, path: str, timeout: float) -> httpx.Response:
        """Executes GET HTTP Request; concurrent requests of the same path share one request.

        Without it, two simultaneous requests of e.g. `/player/hikaru/stats` both go to
        Chess.com: the ETag cache cannot help, the first response has not arrived yet.
        """
        key = path.lower()

        task = self._in_flight.get(key)
        if task is None:
            task = asyncio.create_task(self._get_with_retry(path, timeout))
            self._in_flight[key] = task
            task.add_done_callback(lambda done: self._forget_in_flight(key, done))

        # shield: a disconnected client cancels only its own wait, not the shared request
        return await asyncio.shield(task)

    def _forget_in_flight(self, key: str, task: asyncio.Task[httpx.Response]) -> None:
        """Removes a finished request, so the next request of the path goes to Chess.com again."""
        if self._in_flight.get(key) is task:
            del self._in_flight[key]

        if not task.cancelled():
            task.exception()  # marks a failure as seen, in case every caller has gone

    async def _get_with_retry(self, path: str, timeout: float) -> httpx.Response:
        """Executes GET HTTP Request, retrying transient errors if `allow_retry` is set.

        Each attempt is a separate conditional request (see `_get_once`).
        """
        if not self._allow_retry:
            return await self._get_once(path, timeout)

        return await self.retry(lambda: self._get_once(path, timeout))

    async def _get_once(self, path: str, timeout: float) -> httpx.Response:
        """Executes single GET HTTP Request, revalidating the cached response with its ETag.

        If a response for `path` was cached before, its ETag is sent in `If-None-Match`:
        `304 Not Modified` -> the cached response is returned (Chess.com sends no body);
        `200 OK` -> the new response is returned and replaces the cached one.

        Args:
            path (str): HTTP request path.
            timeout (float): Amount of time in seconds for request execution.

        Raises:
            ChessAPINotFoundError: Raised when requested resource is not found (404).
            ChessAPIRateLimitError: Raised when API rate limit is exceeded (429).
            ChessAPIUnavailableError: Raised when external chess API is down or encounters server errors (5xx).
            ChessAPIError: Raised when an unexpected error occurred.

        Returns:
            httpx.Response: HTTP Response object if successful.
        """
        cache_key = path.lower()  # chess.com usernames are case-insensitive
        cached = self._etag_cache.get(
            cache_key
        )  # cached response of the previous 200, or None
        headers = (
            {"If-None-Match": cached[0]} if cached else {}
        )  # conditional request: the header is sent only if there is something cached to revalidate

        try:
            r = await self._request(
                lambda client: client.get(path, timeout=timeout, headers=headers)
            )
        except httpx.HTTPStatusError as e:
            r_status_code = e.response.status_code

            match r_status_code:
                case status.HTTP_404_NOT_FOUND | status.HTTP_410_GONE:
                    raise ChessAPINotFoundError(path) from e
                case status.HTTP_429_TOO_MANY_REQUESTS:
                    raise ChessAPIRateLimitError(path) from e
                case _ if r_status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
                    raise ChessAPIUnavailableError(f"{r_status_code} on {path}") from e
                case _:
                    raise ChessAPIError(
                        f"Unexpected status {r_status_code} on {path}"
                    ) from e
        except httpx.TimeoutException as e:
            raise ChessAPIUnavailableError(f"Timeout on {path}") from e
        except httpx.RequestError as e:
            raise ChessAPIUnavailableError(f"Network error occurred on {path}") from e

        # 304 Not Modified: data have not changed since the cached response, and the body is empty
        if r.status_code == status.HTTP_304_NOT_MODIFIED:
            if cached is None:
                raise ChessAPIError(f"Unexpected 304 Not Modified on {path}")

            logger.debug(f"Etag cache hit (304): {path}")
            self._etag_cache.move_to_end(
                cache_key
            )  # mark entry as the most recently used
            return cached[1]

        # 200 OK: remember the response and its ETag for the next conditional request
        if etag := r.headers.get("ETag"):
            self._remember(cache_key, etag, r)
        else:
            self._forget(cache_key)  # no validator -> nothing to revalidate later

        return r

    async def get_player_profile(self, username: str) -> dict:
        r = await self._get(
            f"/player/{username}", ExternalTimeout.DEFAULT_TIMEOUT_SECONDS
        )
        return r.json()

    async def get_player_stats(self, username: str) -> dict:
        r = await self._get(
            f"/player/{username}/stats", ExternalTimeout.DEFAULT_TIMEOUT_SECONDS
        )
        return r.json()

    async def get_player_games_archives(self, username: str) -> dict:
        r = await self._get(
            f"/player/{username}/games/archives",
            ExternalTimeout.DEFAULT_TIMEOUT_SECONDS,
        )
        return r.json()

    async def get_player_monthly_games(
        self, username: str, year: str, month: str
    ) -> dict:
        r = await self._get(
            f"/player/{username}/games/{year}/{month}",
            ExternalTimeout.DOUBLE_LONG_TIMEOUT_SECONDS,
        )
        return r.json()

    async def get_player_monthly_pgn(self, username: str, year: str, month: str) -> str:
        r = await self._get(
            f"/player/{username}/games/{year}/{month}/pgn",
            ExternalTimeout.DOUBLE_LONG_TIMEOUT_SECONDS,
        )
        return r.text

    async def get_player_current_games(self, username: str) -> dict:
        r = await self._get(
            f"/player/{username}/games", ExternalTimeout.LONG_TIMEOUT_SECONDS
        )
        return r.json()
