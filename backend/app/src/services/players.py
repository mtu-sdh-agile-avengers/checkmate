"""Players service backed by the Chess.com PubAPI (used when RUN_MODE=prod).

The `PlayersService` protocol it implements lives in `src/services/users.py`;
the DEV-mode mock lives in `src/services/mocks/players.py`.
"""

import asyncio
from collections.abc import Callable
from datetime import UTC, datetime

from src.chesscom.client import ExternalChessComAPIClient
from src.chesscom.models import ChessComGame, ChessComRecord, ChessComTimeClassStats
from src.chesscom.parser import (
    parse_games_archives,
    parse_monthly_games,
    parse_player_stats,
)
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
from src.services.statistics import (
    months_between,
    period_start,
    select_games,
    summarize_period,
)
from src.services.users import PlayersService


def _utc_now() -> datetime:
    return datetime.now(UTC)


class ChessComPlayersService(PlayersService):
    def __init__(
        self,
        chess_client: ExternalChessComAPIClient,
        now: Callable[[], datetime] = _utc_now,  # replaceable clock for tests
    ) -> None:
        self._client = chess_client
        self._now = now

    async def search(self, username: str) -> PlayerSearchProfileResponse:
        raise NotImplementedError("Player search is not implemented yet (CMG4-83)")

    async def compare(self, query: PlayerComparisonQuery) -> PlayerComparisonResponse:
        raise NotImplementedError("Player comparison is not implemented yet (CMG4-89)")

    async def get_profile(self, username: str) -> PlayerProfileResponse:
        raise NotImplementedError("Player profile is not implemented yet (CMG4-82)")

    async def get_summary(
        self, username: str, query: PlayerSummaryQuery
    ) -> PlayerStatisticSummaryResponse:
        now = self._now()
        since = period_start(query.period, now)

        if since is None:
            # "all": all-time record straight from the stats endpoint (1 request)
            stats = parse_player_stats(await self._client.get_player_stats(username))
            time_class_stats = stats.for_time_class(query.time_class)
            record = time_class_stats.record if time_class_stats else ChessComRecord()
            wins, losses, draws = record.win, record.loss, record.draw
            rating_change, history = None, []
        else:
            # recent period: count games from the monthly archives
            raw_stats, games = await asyncio.gather(
                self._client.get_player_stats(username),
                self._load_games(username, since, now),
            )
            time_class_stats = parse_player_stats(raw_stats).for_time_class(
                query.time_class
            )
            selected = select_games(games, username, query.time_class)
            summary = summarize_period(selected, username, since)
            wins, losses, draws = summary.wins, summary.losses, summary.draws
            rating_change = summary.rating_change
            history = [
                RatingPointResponse(date=point.date, rating=point.rating)
                for point in summary.rating_history
            ]

        return PlayerStatisticSummaryResponse(
            username=username,
            day_period=query.period,
            time_class=query.time_class,
            wins=wins,
            losses=losses,
            draws=draws,
            rating=_rating_summary(time_class_stats, rating_change),
            rating_history=history,
        )

    async def _load_games(
        self, username: str, since: datetime, until: datetime
    ) -> list[ChessComGame]:
        """Loads the player's games of every archive month between since and until."""
        archives = parse_games_archives(
            await self._client.get_player_games_archives(username)
        )
        available = set(archives.months)
        months = [m for m in months_between(since, until) if m in available]

        monthly_responses = await asyncio.gather(
            *(
                self._client.get_player_monthly_games(
                    username, str(month.year), f"{month.month:02d}"
                )
                for month in months
            )
        )
        return [game for raw in monthly_responses for game in parse_monthly_games(raw)]


def _rating_summary(
    time_class_stats: ChessComTimeClassStats | None, change: int | None
) -> RatingSummaryResponse:
    last = time_class_stats.last if time_class_stats else None
    best = time_class_stats.best if time_class_stats else None
    return RatingSummaryResponse(
        current=last.rating if last else None,
        highest=best.rating if best else None,
        expected=None,  # ML-estimated rating comes with CMG4-11
        change=change,
    )
