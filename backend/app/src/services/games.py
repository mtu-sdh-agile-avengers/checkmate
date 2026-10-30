from typing import Protocol

from src.schemas.games import (
    GameAnalysisResponse,
    GameBoardDetailsResponse,
    PaginatedGameListResponse,
    PlayerGameHistoryListQuery,
    PlayerGameSearchQuery,
)


class GamesService(Protocol):
    async def get_game_history_list(
        self, username: str, query: PlayerGameHistoryListQuery
    ) -> PaginatedGameListResponse: ...
    async def get_game_board_details(
        self, username: str, query: PlayerGameSearchQuery
    ) -> GameBoardDetailsResponse: ...
    async def analyze_game_board(
        self, username: str, query: PlayerGameSearchQuery
    ) -> GameAnalysisResponse: ...
