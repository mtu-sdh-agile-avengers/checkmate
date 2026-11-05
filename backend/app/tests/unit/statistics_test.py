"""Unit tests for statistics calculations (CMG4-84)."""

from datetime import UTC, datetime, timedelta

import pytest

from src.chesscom.models import ArchiveMonth, ChessComGame
from src.enums import SummaryPeriod, TimeClass
from src.services.statistics import (
    PeriodSummary,
    months_between,
    period_start,
    select_games,
    summarize_period,
)
from tests.fakes import make_raw_game

USERNAME = "hikaru"
SINCE = datetime(2026, 10, 27, 12, 0, tzinfo=UTC)


def game(days_after_since: float, **kwargs) -> ChessComGame:
    """Builds a parsed game that ended `days_after_since` days after SINCE."""
    end_time = SINCE + timedelta(days=days_after_since)
    return ChessComGame.model_validate(
        make_raw_game(username=USERNAME, end_time=end_time, **kwargs)
    )


# period_start / months_between ----------------------------------------------------


def test_period_start():
    now = datetime(2026, 11, 3, 12, 0, tzinfo=UTC)

    assert period_start(SummaryPeriod.OVERALL, now) is None
    assert period_start(SummaryPeriod.DAYS_1, now) == now - timedelta(days=1)
    assert period_start(SummaryPeriod.DAYS_30, now) == now - timedelta(days=30)


@pytest.mark.parametrize(
    ("start", "end", "expected"),
    [
        ((2026, 11, 2), (2026, 11, 3), [ArchiveMonth(2026, 11)]),
        (
            (2026, 10, 4),
            (2026, 11, 3),
            [ArchiveMonth(2026, 10), ArchiveMonth(2026, 11)],
        ),
        ((2025, 12, 20), (2026, 1, 5), [ArchiveMonth(2025, 12), ArchiveMonth(2026, 1)]),
    ],
)
def test_months_between(start, end, expected):
    start_dt = datetime(*start, tzinfo=UTC)
    end_dt = datetime(*end, tzinfo=UTC)

    assert months_between(start_dt, end_dt) == expected


# select_games -----------------------------------------------------------------------


def test_select_games_filters_and_sorts():
    blitz_late = game(3, game_id=1)
    blitz_early = game(1, game_id=2)
    games = [
        blitz_late,
        game(2, time_class="rapid", game_id=3),  # other time class
        game(2, rated=False, game_id=4),  # unrated
        game(2, rules="chess960", game_id=5),  # variant
        blitz_early,
    ]

    selected = select_games(games, USERNAME, TimeClass.BLITZ)

    assert [g.game_id for g in selected] == ["2", "1"]  # oldest first


def test_select_games_skips_games_of_other_players():
    other = ChessComGame.model_validate(
        make_raw_game(username="someone", opponent="else", end_time=SINCE)
    )

    assert select_games([other], USERNAME, TimeClass.BLITZ) == []


def test_select_games_username_is_case_insensitive():
    games = [game(1)]

    assert len(select_games(games, "HiKaRu", TimeClass.BLITZ)) == 1


# summarize_period -------------------------------------------------------------------


def test_summarize_period_counts_results_and_rating_change():
    games = [
        game(-2, result="win", rating=2300),  # before the period: baseline only
        game(1, result="win", rating=2308),
        game(2, result="checkmated", rating=2300),
        game(3, result="agreed", rating=2301),
        game(4, result="win", rating=2309, color="black"),
    ]

    summary = summarize_period(games, USERNAME, SINCE)

    assert (summary.wins, summary.losses, summary.draws) == (2, 1, 1)
    assert summary.rating_change == 2309 - 2300
    assert [point.rating for point in summary.rating_history] == [
        2308,
        2300,
        2301,
        2309,
    ]
    assert summary.rating_history[0].date == SINCE + timedelta(days=1)


def test_summarize_period_without_earlier_game_uses_first_game_as_baseline():
    games = [game(1, rating=2308), game(2, rating=2316)]

    summary = summarize_period(games, USERNAME, SINCE)

    assert summary.rating_change == 2316 - 2308


def test_summarize_period_game_exactly_at_start_is_counted():
    summary = summarize_period([game(0, rating=2300)], USERNAME, SINCE)

    assert summary.wins == 1


def test_summarize_period_no_games_in_period():
    summary = summarize_period([game(-1)], USERNAME, SINCE)

    assert summary == PeriodSummary()
    assert summary.rating_change is None
    assert summary.rating_history == []
