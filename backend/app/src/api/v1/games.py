from typing import Annotated

from fastapi import APIRouter, Query

from app.src.rate_limiting import limiter
from app.src.dependencies import GamesServiceDep
from app.src.schemas.games import GameAnalysisResponse, GameBoardDetailsResponse, GameResponse, PaginatedGameListResponse, PlayerGameHistoryListQuery, PlayerGameSearchQuery


router = APIRouter(prefix="/players/{username}/games", tags=["games"])

# GET /api/v1/players/{username}/games/list/?year={int}&month={int}&timeClass={bullet|blitz|rapid|daily}&sortBy={avgRating|matchDateTime}&sortOrder={asc|desc}&pagingLimit={5|10|15|30|50|100}&page={int}
@router.get(
    "/list",
)
async def get_player_game_history_list(username: str, query: Annotated[PlayerGameHistoryListQuery, Query()], service: GamesServiceDep) -> PaginatedGameListResponse:
    return await service.get_game_history_list(username, query)

# GET /api/v1/players/{username}/games/?year={int}&month={int}&search={game_id|url}
@router.get(
    "/",
)
async def get_game_board_details(username: str, query: Annotated[PlayerGameSearchQuery, Query()], service: GamesServiceDep) -> GameBoardDetailsResponse:
    return await service.get_game_board_details(username, query)

# GET /api/v1/players/{username}/games/analyze/?year={int}&month={int}&search={game_id|url}
@router.get(
    "/analyze",
)
async def analyze_game_board(username: str, query: Annotated[PlayerGameSearchQuery, Query()], service: GamesServiceDep) -> GameAnalysisResponse:
    return await service.analyze_game_board(username, query)