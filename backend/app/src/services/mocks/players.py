"""Mock players service, used when RUN_MODE=dev (CMG4-48).

Returns realistic, deterministic sample data without calling Chess.com, so the frontend
can be built and tested independently of the real implementation.

Special usernames for testing frontend states:
- "notfound": the player does not exist -> 404
- "nogames": the player exists but has no games in the selected period
"""

from datetime import UTC, datetime, timedelta

import json

from src.chesscom.exceptions import ChessAPINotFoundError
from src.enums import SummaryPeriod, TimeClass
from src.schemas.players import (
    PlayerComparisonQuery,
    PlayerComparisonResponse,
    PlayerProfileResponse,
    PlayerSearchProfileResponse,
    PlayerStatisticSummaryResponse,
    PlayerSummaryQuery,
    RatingPointResponse,
    RatingSummaryResponse,
)
from src.services.users import PlayersService

MOCK_NOT_FOUND_USERNAME = "notfound"
MOCK_NO_GAMES_USERNAME = "nogames"

# (current, highest) rating per time class
_MOCK_RATINGS: dict[TimeClass, tuple[int, int]] = {
    TimeClass.BULLET: (2250, 2333),
    TimeClass.BLITZ: (2318, 2401),
    TimeClass.RAPID: (2210, 2275),
    TimeClass.DAILY: (1987, 2054),
}

# (wins, losses, draws, rating change) per period
_MOCK_RESULTS: dict[SummaryPeriod, tuple[int, int, int, int | None]] = {
    SummaryPeriod.DAYS_1: (5, 3, 1, 6),
    SummaryPeriod.DAYS_7: (23, 15, 4, 18),
    SummaryPeriod.DAYS_15: (51, 33, 9, -12),
    SummaryPeriod.DAYS_30: (98, 70, 17, 35),
    SummaryPeriod.OVERALL: (4210, 3895, 402, None),
}

_MOCK_HISTORY_POINTS = 10

_MOCK_PROFILE = PlayerProfileResponse(
    username="mock_player",
    player_id=15448422,
    url="https://www.chess.com/member/mock_player",
    avatar="https://images.chesscomfiles.com/uploads/v1/user/15448422.png",
    name="Mock Player",
    title="GM",
    followers=1000,
    country_url="https://api.chess.com/pub/country/US",
    location="Florida",
    last_online=datetime.now(UTC),
    joined=datetime(2020, 1, 1, tzinfo=UTC),
    status="premium",
    is_streamer=True,
    twitch_url="https://twitch.tv/mockplayer",
    fide_rating=2700,
    verified=True,
    league="Legend",
)


def _mock_rating_history(
    current: int, change: int, days: int
) -> list[RatingPointResponse]:
    """Builds a zig-zag rating trend that ends at the current rating."""
    now = datetime.now(UTC).replace(microsecond=0)
    step = timedelta(days=days) / _MOCK_HISTORY_POINTS
    start = current - change
    history = []
    for i in range(1, _MOCK_HISTORY_POINTS + 1):
        rating = round(start + change * i / _MOCK_HISTORY_POINTS)
        if i < _MOCK_HISTORY_POINTS:
            rating += 4 if i % 2 else -4  # small ups and downs between games
        date = now - step * (_MOCK_HISTORY_POINTS - i)
        history.append(RatingPointResponse(date=date, rating=rating))
    return history


class MockPlayersService(PlayersService):
    async def search(self, username: str) -> PlayerSearchProfileResponse:
        raise NotImplementedError("Mock player search is not implemented yet")

    async def compare(self, query: PlayerComparisonQuery) -> PlayerComparisonResponse:
        raise NotImplementedError("Mock player comparison is not implemented yet")

    async def get_profile(self, username: str) -> PlayerProfileResponse:
        if username.casefold() == MOCK_NOT_FOUND_USERNAME:
            raise ChessAPINotFoundError(f"/player/{username}")

        return _MOCK_PROFILE.model_copy(
            update={
                "username": username,
                "url": f"https://www.chess.com/member/{username}",
                "twitch_url": f"https://twitch.tv/{username}",
            }
        )

    async def get_summary(
        self, username: str, query: PlayerSummaryQuery
    ) -> PlayerStatisticSummaryResponse:
        if username.casefold() == MOCK_NOT_FOUND_USERNAME:
            raise ChessAPINotFoundError(f"/player/{username}/stats")

        current, highest = _MOCK_RATINGS[query.time_class]
        wins, losses, draws, change = _MOCK_RESULTS[query.period]
        history: list[RatingPointResponse] = []

        if username.casefold() == MOCK_NO_GAMES_USERNAME:
            wins = losses = draws = 0
            change = None
        elif change is not None:
            history = _mock_rating_history(current, change, int(query.period))

        return PlayerStatisticSummaryResponse(
            username=username,
            day_period=query.period,
            time_class=query.time_class,
            wins=wins,
            losses=losses,
            draws=draws,
            rating=RatingSummaryResponse(
                current=current, highest=highest, expected=None, change=change
            ),
            rating_history=history,
        )
