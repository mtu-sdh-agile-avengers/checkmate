"""Unit tests for ChessComPlayersService.get_summary (CMG4-84)."""

from datetime import UTC, datetime

import pytest

from src.chesscom.exceptions import ChessAPINotFoundError
from src.enums import SummaryPeriod, TimeClass
from src.schemas.players import PlayerSummaryQuery
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient, make_raw_game

# run async tests with the anyio pytest plugin (installed together with FastAPI)
pytestmark = pytest.mark.anyio

USERNAME = "hikaru"
NOW = datetime(2026, 11, 3, 12, 0, tzinfo=UTC)


def at(month: int, day: int, hour: int = 12) -> datetime:
    return datetime(2026, month, day, hour, tzinfo=UTC)


def blitz(end_time: datetime, result: str, rating: int, game_id: int) -> dict:
    return make_raw_game(
        username="Hikaru",  # Chess.com returns the username with its own letter case
        end_time=end_time,
        result=result,
        rating=rating,
        game_id=game_id,
    )


MONTHLY_GAMES = {
    (2026, 9): [blitz(at(9, 20), "win", 2250, game_id=1)],
    (2026, 10): [
        blitz(at(10, 25), "win", 2290, game_id=2),  # before the 7-day period
        blitz(at(10, 30), "win", 2298, game_id=3),
    ],
    (2026, 11): [
        blitz(at(11, 1), "resigned", 2290, game_id=4),
        make_raw_game(
            username="Hikaru", end_time=at(11, 2), time_class="rapid", game_id=5
        ),
        blitz(at(11, 2, 20), "win", 2318, game_id=6),
    ],
}


@pytest.fixture
def client(chesscom_fixture) -> FakeChessComClient:
    # player_stats.json: blitz current 2318, best 2401, record 4210 / 3895 / 402;
    # no bullet games at all
    return FakeChessComClient(
        stats=chesscom_fixture("player_stats.json"),
        archive_months=[(2026, 9), (2026, 10), (2026, 11)],
        monthly_games=MONTHLY_GAMES,
    )


async def get_summary(client, period, time_class=TimeClass.BLITZ):
    service = ChessComPlayersService(client, now=lambda: NOW)
    query = PlayerSummaryQuery(period=period, timeClass=time_class)
    return await service.get_summary(USERNAME, query)


async def test_summary_last_7_days(client):
    summary = await get_summary(client, SummaryPeriod.DAYS_7)

    assert summary.username == USERNAME
    assert summary.day_period == SummaryPeriod.DAYS_7
    assert summary.time_class == TimeClass.BLITZ
    assert (summary.wins, summary.losses, summary.draws) == (2, 1, 0)
    assert summary.total_games_played == 3
    assert summary.rating.current == 2318
    assert summary.rating.highest == 2401
    assert summary.rating.expected is None
    assert summary.rating.change == 2318 - 2290
    assert [p.rating for p in summary.rating_history] == [2298, 2290, 2318]
    # only archive months that overlap the period are requested
    assert client.calls == [
        "/player/hikaru/stats",
        "/player/hikaru/games/archives",
        "/player/hikaru/games/2026/10",
        "/player/hikaru/games/2026/11",
    ]


async def test_summary_last_day(client):
    summary = await get_summary(client, SummaryPeriod.DAYS_1)

    assert (summary.wins, summary.losses, summary.draws) == (1, 0, 0)
    assert summary.rating.change == 2318 - 2290  # baseline: game of 1 Nov
    assert "/player/hikaru/games/2026/10" not in client.calls


async def test_summary_all_time_uses_stats_record_only(client):
    summary = await get_summary(client, SummaryPeriod.OVERALL)

    assert (summary.wins, summary.losses, summary.draws) == (4210, 3895, 402)
    assert summary.rating.current == 2318
    assert summary.rating.change is None
    assert summary.rating_history == []
    assert client.calls == ["/player/hikaru/stats"]


async def test_summary_time_class_never_played(client):
    summary = await get_summary(client, SummaryPeriod.DAYS_7, TimeClass.BULLET)

    assert summary.total_games_played == 0
    assert summary.win_rate == 0.0
    assert summary.rating.current is None
    assert summary.rating.highest is None
    assert summary.rating.change is None


async def test_summary_all_time_never_played(client):
    summary = await get_summary(client, SummaryPeriod.OVERALL, TimeClass.BULLET)

    assert summary.total_games_played == 0
    assert summary.rating.current is None


async def test_summary_no_games_in_period(client):
    client.monthly_games = {}

    summary = await get_summary(client, SummaryPeriod.DAYS_30)

    assert summary.total_games_played == 0
    assert summary.rating.current == 2318  # rating is still known from stats
    assert summary.rating.change is None
    assert summary.rating_history == []


async def test_summary_skips_months_missing_from_archives(client):
    client.archive_months = [(2026, 11)]  # player did not play in October

    await get_summary(client, SummaryPeriod.DAYS_30)

    assert "/player/hikaru/games/2026/10" not in client.calls


async def test_summary_unknown_player_raises_not_found():
    client = FakeChessComClient(not_found=True)

    with pytest.raises(ChessAPINotFoundError):
        await get_summary(client, SummaryPeriod.DAYS_7)
