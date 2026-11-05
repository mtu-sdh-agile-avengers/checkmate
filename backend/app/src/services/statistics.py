"""Player statistics calculations for the summary endpoint (CMG4-84).

Pure functions without I/O, so they are easy to unit test. They work with parsed
Chess.com games; the rating stored in a game is the player's rating after that game.
"""

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import NamedTuple

from src.chesscom.models import ArchiveMonth, ChessComGame
from src.enums import GameResult, SummaryPeriod, TimeClass


class RatingPoint(NamedTuple):
    date: datetime  # game end time (UTC)
    rating: int  # player's rating after the game


@dataclass(frozen=True)
class PeriodSummary:
    """Results of a player's games in a period."""

    wins: int = 0
    losses: int = 0
    draws: int = 0
    rating_change: int | None = None  # None when there are no games in the period
    rating_history: list[RatingPoint] = field(default_factory=list)


def period_start(period: SummaryPeriod, now: datetime) -> datetime | None:
    """Returns the start of the period, or None for "all"."""
    if period == SummaryPeriod.OVERALL:
        return None
    return now - timedelta(days=int(period))


def months_between(start: datetime, end: datetime) -> list[ArchiveMonth]:
    """Returns every month from start's month to end's month (inclusive), oldest first."""
    months = []
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        months.append(ArchiveMonth(year, month))
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return months


def _played_by(game: ChessComGame, username: str) -> bool:
    name = username.casefold()
    return name in (game.white.username.casefold(), game.black.username.casefold())


def select_games(
    games: Iterable[ChessComGame], username: str, time_class: TimeClass
) -> list[ChessComGame]:
    """Returns rated standard chess games of the time class played by the user.

    Unrated games and variants (chess960, ...) are skipped, because they do not affect
    the player's rating of the time class. Result is sorted by end time, oldest first.
    """
    selected = [
        game
        for game in games
        if game.time_class == time_class
        and game.rated
        and game.is_standard_chess
        and _played_by(game, username)
    ]
    return sorted(selected, key=lambda game: game.end_time)


def summarize_period(
    games: list[ChessComGame], username: str, since: datetime
) -> PeriodSummary:
    """Summarizes the user's games that ended at or after `since`.

    Args:
        games: games from `select_games` (sorted, oldest first). Games that ended
            before `since` are only used to find the rating at the start of the period.
        username: player whose results are counted.
        since: start of the period (UTC).
    """
    earlier = [game for game in games if game.end_time < since]
    in_period = [game for game in games if game.end_time >= since]
    if not in_period:
        return PeriodSummary()

    results = Counter(game.result_for(username) for game in in_period)
    history = [
        RatingPoint(game.end_time, game.side_of(username).rating) for game in in_period
    ]

    # Rating at the start of the period = rating after the last earlier game.
    # If there is no earlier game in the loaded data, use the rating after the first
    # game of the period (the change then misses that first game's +/- points).
    baseline = earlier[-1].side_of(username).rating if earlier else history[0].rating

    return PeriodSummary(
        wins=results[GameResult.WIN],
        losses=results[GameResult.LOSS],
        draws=results[GameResult.DRAW],
        rating_change=history[-1].rating - baseline,
        rating_history=history,
    )
