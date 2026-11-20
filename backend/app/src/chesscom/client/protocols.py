from typing import ClassVar, Protocol


class ExternalChessAPIClient(Protocol):
    """Base class for every chess platform. For now only Chess.com is supported."""

    API_BASE_URL: ClassVar[str]


class ExternalChessComAPIClient(ExternalChessAPIClient, Protocol):
    """Chess.com PubAPI client (implemented by `ExternalChessComAPIClient`)."""

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
