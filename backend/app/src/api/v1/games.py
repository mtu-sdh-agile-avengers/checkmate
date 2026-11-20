from typing import Annotated

from fastapi import APIRouter, Query, Request

from src.api.v1.common import COMMON_RESPONSES
from src.dependencies import GamesServiceDep
from src.rate_limiting import limiter
from src.schemas.common import ErrorResponse
from src.schemas.games import (
    GameAnalysisResponse,
    GameBoardDetailsResponse,
    PaginatedGameListResponse,
    PlayerGameHistoryListQuery,
    PlayerGameSearchQuery,
)

router = APIRouter(
    prefix="/players/{username}/games",
    tags=["games"],
    responses=COMMON_RESPONSES,
)


# GET /api/v1/players/{username}/games/list?year={int}&month={int}&timeClass={bullet|blitz|rapid|daily}&sortBy={avgRating|matchDateTime}&sortOrder={asc|desc}&pagingLimit={5|10|15|30|50|100}&page={int}
@router.get(
    "/list",
    summary="Get game history list",
    description=(
        "Returns one page of the player's game for the game history list. "
        "Games are taken from the `year` / `month` archive of a player "
        "(the month the game ended, UTC); without them, from the latest available archive month. "
        "`timeClass` filters by time class (i.e., time control), with all time classes included by default (if null). "
        "Games are sorted by: `matchDateTime` (end time, default) or `avgRating` (average Elo of both players; then on matchDateTime "
        "incase they are the same), sorted in `SortOrder` (DESC by default). `pagingLimit` games per page (50 by default), `page` starts at 1.\n\n"
        "Every item is the game from the point of `username` (selected player)."
    ),
    responses={
        404: {"model": ErrorResponse, "description": "Player does not exist"},
        422: {"model": ErrorResponse, "description": "Player does not exist"},
    },
)
@limiter.limit("1/second")
async def get_player_game_history_list(
    request: Request,
    username: str,
    query: Annotated[PlayerGameHistoryListQuery, Query()],
    service: GamesServiceDep,
) -> PaginatedGameListResponse:
    return await service.get_game_history_list(username, query)


# GET /api/v1/players/{username}/games?year={int}&month={int}&search={game_id|url}
@router.get(
    "/",
    summary="Get game details",
    description=(
        "Returns one game of the player for the game page: both players "
        "with their rating after the game, the player's color and result, time "
        "class, end time, and the PGN / FEN to replay it. `search` is a Chess.com "
        "game id or game URL. The game is looked up in the `year` / `month` archive "
        "of the player (the month the game ended, UTC); without them, in the "
        "latest archive month."
    ),
    responses={
        404: {
            "model": ErrorResponse,
            "description": "Player does not exist or the game is not in the archive",
        },
        422: {"description": "Invalid `search`, or only one of `year` / `month`"},
    },
)
@limiter.limit("1/second")
async def get_game_board_details(
    request: Request,
    username: str,
    query: Annotated[PlayerGameSearchQuery, Query()],
    service: GamesServiceDep,
) -> GameBoardDetailsResponse:
    return await service.get_game_board_details(username, query)


# GET /api/v1/players/{username}/games/analyze?year={int}&month={int}&search={game_id|url}
@router.get("/analyze", summary="Get game analysis details")
@limiter.limit("1/second")
async def analyze_game_board(
    request: Request,
    username: str,
    query: Annotated[PlayerGameSearchQuery, Query()],
    service: GamesServiceDep,
) -> GameAnalysisResponse:
    return await service.analyze_game_board(username, query)
