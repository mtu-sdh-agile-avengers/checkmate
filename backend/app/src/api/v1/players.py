from typing import Annotated

from fastapi import APIRouter, Query

from app.src.rate_limiting import limiter
from app.src.dependencies import PlayersServiceDep
from app.src.schemas.players import PlayerComparisonQuery, PlayerComparisonResponse, PlayerProfileResponse, PlayerSearchProfileResponse, PlayerStatisticSummaryResponse, PlayerSummaryQuery

router = APIRouter(prefix="/players", tags=["players"])

# GET /api/v1/players/?search={username|url}
@router.get(
    "/",
    summary="Find player",
    description="Finds a player by username or profile URL."
)
async def search_player(search: str, service: PlayersServiceDep) -> PlayerSearchProfileResponse:
    return await service.search(search)
    
# GET /api/v1/players/compare?p1={username|url}&p2={username|url}&timeClass={bullet|blitz|rapid|daily}
@router.get(
    "/compare",
    summary="Compare two players",
    description="Compares two players side-by-side and determines the winner (with more win likelihood)."
)
async def compare_players(query: Annotated[PlayerComparisonQuery, Query()], service: PlayersServiceDep) -> PlayerComparisonResponse:
    return await service.compare(query)

# GET api/v1/players/{username}/profile
@router.get(
    "/{username}/profile",
    summary="Get player profile",
    description="Returns Chess.com player profile record."
)
async def get_player_profile(username: str, service: PlayersServiceDep) -> PlayerProfileResponse:
    return await service.get_profile(username)
    
# GET /api/v1/players/{username}/summary?period={1|7|15|30|all}&timeClass={bullet|blitz|rapid|daily}
@router.get(
    "/{username}/summary",
    summary="Get player summary",
    description="Returns Chess.com player profile statistics summary."
)
async def get_player_summary(username: str, query: Annotated[PlayerSummaryQuery, Query()], service: PlayersServiceDep) -> PlayerStatisticSummaryResponse:
    return await service.get_summary(username, query)
