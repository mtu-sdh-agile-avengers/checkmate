from typing import Protocol

from src.schemas.games import (
    GameAnalysisResponse,
    GameBoardDetailsResponse,
    PaginatedGameListResponse,
    PlayerGameHistoryListQuery,
    PlayerGameSearchQuery,
)
from src.schemas.players import (
    PlayerComparisonQuery,
    PlayerComparisonResponse,
    PlayerProfileResponse,
    PlayerSearchProfileResponse,
    PlayerStatisticSummaryResponse,
    PlayerSuggestionsResponse,
    PlayerSummaryQuery,
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


class PlayersService(Protocol):
    async def search(self, username: str) -> PlayerSearchProfileResponse: ...
    async def suggest(self, prefix: str) -> PlayerSuggestionsResponse: ...
    async def compare(
        self, query: PlayerComparisonQuery
    ) -> PlayerComparisonResponse: ...
    async def get_profile(self, username: str) -> PlayerProfileResponse: ...
    async def get_summary(
        self, username: str, query: PlayerSummaryQuery
    ) -> PlayerStatisticSummaryResponse: ...
