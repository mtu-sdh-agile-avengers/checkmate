"""Mock players service, used when RUN_MODE=dev.

Returns realistic, deterministic sample data without calling Chess.com, so the frontend
can be built and tested independently of the real implementation.

Special usernames for testing frontend states:
- "notfound": the player does not exist -> 404
- "nogames": the player exists but has no games in the selected period
- comparison: every username starting with "notfound" (e.g. "notfound2") does not
  exist, so both players can be missing at once

Comparison: player 1 gets the sample all-time statistics; player 2 the same sample
with a lower rating, fewer wins and fewer losses, so both players have better fields.
"""

from datetime import UTC, datetime, timedelta

from src.chesscom.client.exceptions import (
    ChessAPINotFoundError,
    ChessComPlayersNotFoundError,
)
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
from src.services.processing.comparison import compare_summaries
from src.services.protocols import PlayersService

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

# How much the second player of a comparison differs from the sample (fewer / lower)
_MOCK_SECOND_PLAYER = {
    "wins": 410,
    "losses": 120,
    "draws": 35,
    "current": 64,
    "highest": 40,
}

_MOCK_PROFILE = PlayerProfileResponse(
    username="mock_player",
    player_id=15448422,
    url="https://www.chess.com/member/mock_player",
    # No picture: a made-up Chess.com image link does not exist (the image server refuses
    # it), so every mock player would show a broken picture. Without one, the frontend
    # shows its own stand-in (silhouette or initial), as for a real player with no avatar.
    avatar=None,
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


def _mock_second_player(
    summary: PlayerStatisticSummaryResponse,
) -> PlayerStatisticSummaryResponse:
    """The sample summary made a bit weaker, so the comparison has a favourite."""
    rating = summary.rating
    played = summary.total_games_played > 0  # "nogames" stays without games
    return summary.model_copy(
        update={
            "wins": max(0, summary.wins - _MOCK_SECOND_PLAYER["wins"]),
            "losses": max(0, summary.losses - _MOCK_SECOND_PLAYER["losses"]),
            "draws": summary.draws + (_MOCK_SECOND_PLAYER["draws"] if played else 0),
            "rating": rating.model_copy(
                update={
                    "current": rating.current - _MOCK_SECOND_PLAYER["current"],
                    "highest": rating.highest - _MOCK_SECOND_PLAYER["highest"],
                }
            ),
        }
    )


class MockPlayersService(PlayersService):
    async def search(self, username: str) -> PlayerSearchProfileResponse:
        if username.casefold() == MOCK_NOT_FOUND_USERNAME:
            raise ChessAPINotFoundError(f"/player/{username}")

        return PlayerSearchProfileResponse(
            username=username,
            url=f"https://www.chess.com/member/{username}",
            avatar=_MOCK_PROFILE.avatar,
            title=_MOCK_PROFILE.title,
        )

    async def compare(self, query: PlayerComparisonQuery) -> PlayerComparisonResponse:
        missing = [
            username
            for username in (query.p1, query.p2)
            if username.casefold().startswith(MOCK_NOT_FOUND_USERNAME)
        ]
        if missing:
            raise ChessComPlayersNotFoundError(missing)

        all_time = PlayerSummaryQuery.model_validate(
            {"period": SummaryPeriod.OVERALL, "timeClass": query.time_class}
        )
        player1 = await self.get_summary(query.p1, all_time)
        player2 = _mock_second_player(await self.get_summary(query.p2, all_time))
        return compare_summaries(query.time_class, player1, player2)

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
