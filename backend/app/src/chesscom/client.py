import asyncio
from enum import Enum
from typing import Awaitable, Callable, ClassVar, Protocol, TypeVar
import httpx
from fastapi import status
from loguru import logger

from src.chesscom.exceptions import (
    ChessAPIError,
    ChessAPINotFoundError,
    ChessAPIRateLimitError,
    ChessAPITooManyRetriesError,
    ChessAPIUnavailiableError,
)
from src.config import get_config


class ExternalTimeout(float, Enum):
    DEFAULT_TIMEOUT_SECONDS = 3.0
    LONG_TIMEOUT_SECONDS = 7.5
    DOUBLE_LONG_TIMEOUT_SECONDS = LONG_TIMEOUT_SECONDS * 2


# NOTE: protocol for Chess.com API; there is NO need for more basic interface at the moment (like: ExternalChessAPIClient)
class ExternalChessComAPIClient(Protocol):
    API_BASE_URL: ClassVar[str]

    async def get_player_profile(self, username: str) -> dict: ...
    async def get_player_stats(self, username: str) -> dict: ...
    async def get_player_games_archives(self, username) -> dict: ...
    async def get_player_monthly_games(
        self, username: str, year: str, month: str
    ) -> dict: ...
    async def get_player_monthly_pgn(
        self, username: str, year: str, month: str
    ) -> str: ...
    async def get_player_current_games(self, username: str) -> dict: ...


# NOTE: serial access for Chess.com PubAPI is unlimited, but parallel are limited => semaphor used;
class ChessComClient(ExternalChessComAPIClient):
    CONCURRENT_REQUESTS_LIMIT: ClassVar[int] = 2
    API_BASE_URL: ClassVar[str] = get_config().api_chesscom_base_url

    def __init__(self):
        self.api_client = httpx.AsyncClient(
            base_url=self.API_BASE_URL,
            headers={"User-Agent": get_config().api_chesscom_user_agent},
        )

        self._semaphore = asyncio.Semaphore(self.CONCURRENT_REQUESTS_LIMIT)

    async def _request(
        self, request_func: Callable[[httpx.AsyncClient], Awaitable[httpx.Response]]
    ) -> httpx.Response:
        """Executes an HTTP Request using semaphore as as an asynchronous context manager.

        Args:
            request_func (Callable[[httpx.AsyncClient], Awaitable[httpx.Response]]): Callback function doing actual request.

        Returns:
            httpx.Response: HTTP Response object if successfull.
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
            ChessAPIUnavailiableError: Raised when external chess API is down or encounters server errors (5xx).
            ChessAPIError: Raised when an unexpected error occured.

        Returns:
            httpx.Response: HTTP Response object if successfull.
        """
        try:
            return await self._request(lambda client: client.get(path, timeout=timeout))
        except httpx.HTTPStatusError as e:
            r_status_code = e.response.status_code

            match r_status_code:
                case status.HTTP_404_NOT_FOUND:
                    raise ChessAPINotFoundError(path) from e
                case status.HTTP_429_TOO_MANY_REQUESTS:
                    raise ChessAPIRateLimitError(path) from e
                case _ if r_status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
                    raise ChessAPIUnavailiableError from e
                case _:
                    raise ChessAPIError(f"Unexpected error occured: {r_status_code}")
        except httpx.TimeoutException as e:
            raise ChessAPIUnavailiableError(f"Timeout on {path}") from e
        except httpx.RequestError as e:
            raise ChessAPIUnavailiableError(f"Network error occured on {path}") from e

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
