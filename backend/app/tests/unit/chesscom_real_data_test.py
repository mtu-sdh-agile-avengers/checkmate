"""Parsing REAL Chess.com responses (CMG4-30).

Fixtures `hikaru_*` are a snapshot of GM Hikaru Nakamura's public PubAPI data, taken on
4 Nov 2026. The October 2026 archive is trimmed to 13 games (all kinds of endings);
the PGN file to 3 of those games. Values below are frozen in the snapshot.
"""

from datetime import UTC, datetime
from itertools import pairwise

import pytest

from src.chesscom.models import ArchiveMonth
from src.chesscom.parser import (
    parse_games_archives,
    parse_monthly_games,
    parse_monthly_pgn,
    parse_player_profile,
    parse_player_stats,
)
from src.enums import GameResult, SummaryPeriod, TimeClass
from src.schemas.players import PlayerSummaryQuery
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient

USERNAME = "hikaru"


@pytest.fixture
def games(chesscom_fixture):
    return parse_monthly_games(chesscom_fixture("hikaru_games_2026_10.json"))


@pytest.fixture
def stats(chesscom_fixture):
    return parse_player_stats(chesscom_fixture("hikaru_stats.json"))


def test_real_profile(chesscom_fixture):
    profile = parse_player_profile(chesscom_fixture("hikaru_profile.json"))

    assert profile.player_id == 15448422
    assert profile.username == "hikaru"
    assert profile.name == "Hikaru Nakamura"
    assert profile.title == "GM"
    assert profile.country_code == "US"
    assert profile.is_streamer is True
    assert profile.twitch_url == "https://twitch.tv/gmhikaru"
    assert profile.joined == datetime(2014, 1, 6, 21, 20, 58, tzinfo=UTC)


def test_real_stats(stats):
    blitz = stats.for_time_class(TimeClass.BLITZ)
    assert blitz is not None and blitz.last is not None and blitz.best is not None
    assert blitz.last.rating == 3467
    assert blitz.best.rating == 3503
    assert (blitz.record.win, blitz.record.loss, blitz.record.draw) == (
        36098,
        5551,
        4384,
    )

    daily = stats.for_time_class(TimeClass.DAILY)
    assert daily is not None and daily.record.time_per_move == 32755

    assert stats.fide == 2814


def test_real_archives(chesscom_fixture):
    archives = parse_games_archives(chesscom_fixture("hikaru_archives.json"))

    assert len(archives.months) == 155
    assert archives.months[0] == ArchiveMonth(2014, 1)
    assert archives.months[-1] == ArchiveMonth(2026, 11)


def test_real_games_all_parsed(chesscom_fixture, games):
    raw_games = chesscom_fixture("hikaru_games_2026_10.json")["games"]

    assert len(games) == len(raw_games) == 13  # no game skipped as malformed
    assert {game.time_class for game in games} == {TimeClass.BLITZ, TimeClass.BULLET}
    assert all(game.rated and game.is_standard_chess for game in games)
    assert all(game.accuracies is not None for game in games)


def test_real_games_results(games):
    results = [game.result_for(USERNAME) for game in games]

    assert results.count(GameResult.WIN) == 5
    assert results.count(GameResult.LOSS) == 4  # checkmated, timeout, 2x resigned
    assert results.count(GameResult.DRAW) == 4  # repetition, timevsinsufficient,
    # stalemate, agreed
    # Chess.com spells the name "Hikaru"; lookups are case-insensitive
    assert {game.side_of(USERNAME).username for game in games} == {"Hikaru"}


def test_real_game_rating_is_rating_after_the_game(games, stats):
    # The latest bullet rating in /stats has the same timestamp and value as the
    # player's rating in his last bullet game -> a game stores the rating AFTER it.
    last_bullet = [g for g in games if g.time_class == TimeClass.BULLET][-1]
    bullet_stats = stats.for_time_class(TimeClass.BULLET)
    assert bullet_stats is not None and bullet_stats.last is not None

    assert last_bullet.end_time == bullet_stats.last.date
    assert last_bullet.side_of(USERNAME).rating == bullet_stats.last.rating == 3393


def test_real_games_rating_moves_with_results(games):
    # 7 consecutive blitz games of 31 Oct: rating goes up after a win, down after a loss
    blitz = [g for g in games if g.time_class == TimeClass.BLITZ][-7:]

    for previous, current in pairwise(blitz):
        change = current.side_of(USERNAME).rating - previous.side_of(USERNAME).rating
        if current.result_for(USERNAME) == GameResult.WIN:
            assert change > 0
        else:
            assert change < 0


def test_real_pgn(chesscom_fixture, games):
    pgn_games = parse_monthly_pgn(chesscom_fixture("hikaru_games_2026_10.pgn"))
    json_by_url = {game.url: game for game in games}

    assert len(pgn_games) == 3
    for pgn_game in pgn_games:
        game = json_by_url[pgn_game.url]  # every PGN game is also in the JSON archive
        assert int(pgn_game.headers["WhiteElo"]) == game.white.rating
        assert int(pgn_game.headers["BlackElo"]) == game.black.rating
    first = pgn_games[0]
    assert first.headers["Termination"] == "jumpingknight20 won by checkmate"
    assert first.pgn.endswith("54. Qb4# {[%clk 0:00:01.2]} 1-0")


@pytest.mark.anyio
async def test_real_data_summary_last_day(chesscom_fixture):
    client = FakeChessComClient(
        stats=chesscom_fixture("hikaru_stats.json"),
        archive_months=[(2026, 10)],
        monthly_games={
            (2026, 10): chesscom_fixture("hikaru_games_2026_10.json")["games"]
        },
    )
    service = ChessComPlayersService(
        client, now=lambda: datetime(2026, 11, 1, tzinfo=UTC)
    )
    query = PlayerSummaryQuery(period=SummaryPeriod.DAYS_1, timeClass=TimeClass.BLITZ)

    summary = await service.get_summary(USERNAME, query)

    assert (summary.wins, summary.losses, summary.draws) == (5, 2, 0)
    assert [p.rating for p in summary.rating_history] == [
        3455,
        3444,
        3449,
        3454,
        3443,
        3448,
        3453,
    ]
    # baseline = last earlier blitz game in the snapshot (3 Oct, rating 3483)
    assert summary.rating.change == 3453 - 3483
    assert summary.rating.current == 3467
    assert summary.rating.highest == 3503
