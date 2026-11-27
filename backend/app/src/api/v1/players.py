from typing import Annotated

from fastapi import APIRouter, Query, Request

from src.api.v1.common import COMMON_RESPONSES
from src.dependencies import PlayersServiceDep
from src.rate_limiting import limiter
from src.schemas.common import ErrorResponse
from src.schemas.players import (
    PlayerComparisonQuery,
    PlayerComparisonResponse,
    PlayerProfileResponse,
    PlayerSearchProfileResponse,
    PlayerSearchQuery,
    PlayerStatisticSummaryResponse,
    PlayerSuggestionsQuery,
    PlayerSuggestionsResponse,
    PlayerSummaryQuery,
)

router = APIRouter(
    prefix="/players",
    tags=["players"],
    responses=COMMON_RESPONSES,
)


# GET /api/v1/players/?search={username|url}
@router.get(
    "/",
    summary="Find player",
    description=(
        "Finds a Chess.com player by username or member profile URL "
        "(e.g. `https://www.chess.com/member/Hikaru`). Returns the short profile "
        "the search page needs to open the player view."
    ),
    responses={
        404: {"model": ErrorResponse, "description": "Player does not exist"},
        422: {"description": "`search` is not a valid username or profile URL"},
    },
)
@limiter.limit("1/second")
async def search_player(
    request: Request,
    query: Annotated[PlayerSearchQuery, Query()],
    service: PlayersServiceDep,
) -> PlayerSearchProfileResponse:
    return await service.search(query.username)


# GET /api/v1/players/suggestions?q={start of a username}
@router.get(
    "/suggestions",
    summary="Suggest players",
    description=(
        "Accounts for the search box's suggestions while typing, at most 8: the account "
        "with exactly the username `q`, if it exists (with its picture), then Chess.com's "
        "titled players (GM, IM, FM...) whose username starts with `q`, highest title "
        "first. The titled players are loaded from Chess.com once a day. If Chess.com "
        "cannot be reached, the suggestions are only those already known (maybe none)."
    ),
    responses={
        422: {"description": "`q` is not 2-25 letters, numbers, _ or -"},
    },
)
@limiter.limit("5/second")  # while typing, after a short pause (debounced)
async def suggest_players(
    request: Request,
    query: Annotated[PlayerSuggestionsQuery, Query()],
    service: PlayersServiceDep,
) -> PlayerSuggestionsResponse:
    return await service.suggest(query.q)


# GET /api/v1/players/compare?p1={username|url}&p2={username|url}&timeClass={bullet|blitz|rapid|daily}
@router.get(
    "/compare",
    summary="Compare two players",
    description=(
        "Compares two players side by side in one time class: the all-time summary of "
        "each player (the same as `/{username}/summary?period=all`) and the estimated "
        "win likelihood of each, from the Elo expected score of their current ratings. "
        "`p1` and `p2` are usernames or member profile URLs and must be different players."
    ),
    responses={
        404: {
            "model": ErrorResponse,
            "description": 'One or both players do not exist, e.g. "Players ghost1, ghost2 data is unavailable"',
        },
        422: {
            "description": "Invalid `p1` / `p2` / `timeClass`, or the same player twice"
        },
    },
)
@limiter.limit("1/second")
async def compare_players(
    request: Request,
    query: Annotated[PlayerComparisonQuery, Query()],
    service: PlayersServiceDep,
) -> PlayerComparisonResponse:
    return await service.compare(query)


# GET api/v1/players/{username}/profile
@router.get(
    "/{username}/profile",
    summary="Get player profile",
    description="Returns Chess.com player profile record.",
    responses={
        404: {"model": ErrorResponse, "description": "Player does not exist"},
    },
)
@limiter.limit("1/second")
async def get_player_profile(
    request: Request, username: str, service: PlayersServiceDep
) -> PlayerProfileResponse:
    return await service.get_profile(username)


# GET /api/v1/players/{username}/summary?period={1|7|15|30|all}&timeClass={bullet|blitz|rapid|daily}
@router.get(
    "/{username}/summary",
    summary="Get player summary",
    description=(
        "Returns Chess.com player statistics summary for one time class: overall "
        "(`period=all`) or recent (last 1 / 7 / 15 / 30 days). Includes wins, losses, "
        "draws, win rate, current / highest / expected rating, rating change and "
        "rating history. Only rated standard chess games are counted. If the player "
        "has no games in the period, `totalGamesPlayed` is 0 (the client shows "
        '"No games in the last X days").'
    ),
    responses={
        404: {"model": ErrorResponse, "description": "Player does not exist"},
    },
)
@limiter.limit("1/second")
async def get_player_summary(
    request: Request,
    username: str,
    query: Annotated[PlayerSummaryQuery, Query()],
    service: PlayersServiceDep,
) -> PlayerStatisticSummaryResponse:
    return await service.get_summary(username, query)
