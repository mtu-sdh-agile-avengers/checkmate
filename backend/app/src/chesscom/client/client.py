import asyncio
from collections.abc import Awaitable, Callable
from enum import Enum
from typing import ClassVar, TypeVar

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
        self._allow_retry = allow_retry  # if True, then if request had exceeds timeout limit server will try N times to send it again
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

        r.raise_for_status()

        return r

    async def aclose(self) -> None:
        await self.api_client.aclose()

    # TODO: impl. proper retry func., after it will be possible to test client.
    T = TypeVar("T")

    async def retry(
        self,
        coro: Callable[[], Awaitable[T]],
        max_retries: int,
        timeout: float,
        retry_interval: float,
    ) -> T:
        for retry_num in range(0, max_retries):
            try:
                return await asyncio.wait_for(coro(), timeout=timeout)
            except Exception as e:
                logger.warning(
                    f"Exception while waiting (tried {retry_num} times, retrying.",
                    exc_info=e,
                )
                await asyncio.sleep(retry_interval)
        raise ChessAPITooManyRetriesError()

    async def _get(self, path: str, timeout: float) -> httpx.Response:
        """Executes GET HTTP Request.

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
        try:
            return await self._request(lambda client: client.get(path, timeout=timeout))
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
