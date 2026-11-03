"""Unit tests for Chess.com response parsing (CMG4-30)."""

from datetime import UTC, datetime

import pytest

from src.chesscom.exceptions import ChessAPIError, ChessAPIParseError
from src.chesscom.models import ArchiveMonth, result_code_to_game_result
from src.chesscom.parser import (
    parse_daily_games,
    parse_games_archives,
    parse_monthly_games,
    parse_monthly_pgn,
    parse_pgn_headers,
    parse_player_profile,
    parse_player_stats,
)
from src.enums import GameResult, PlayerColor, TimeClass

USERNAME = "checkmate_tester"


# Player profile ---------------------------------------------------------------------


def test_parse_player_profile_full(chesscom_fixture):
    profile = parse_player_profile(chesscom_fixture("player_profile.json"))

    assert profile.player_id == 123456789
    assert profile.username == USERNAME
    # "@id" and "country" keys are mapped to api_url and country_url
    assert profile.api_url == "https://api.chess.com/pub/player/checkmate_tester"
    assert profile.url == "https://www.chess.com/member/Checkmate_Tester"
    assert profile.name == "Test Player"
    assert profile.title == "FM"
    assert profile.followers == 1520
    assert profile.country_url == "https://api.chess.com/pub/country/IE"
    assert profile.country_code == "IE"
    assert profile.location == "Cork"
    assert profile.joined == datetime(2015, 3, 14, 10, 0, tzinfo=UTC)
    assert profile.last_online == datetime(2026, 11, 3, 9, 15, tzinfo=UTC)
    assert profile.status == "premium"
    assert profile.is_streamer is True
    assert profile.twitch_url == "https://twitch.tv/checkmate_tester"
    assert profile.league == "Champion"


def test_parse_player_profile_missing_optional_fields(chesscom_fixture):
    profile = parse_player_profile(chesscom_fixture("player_profile_minimal.json"))

    assert profile.username == "new_player_42"
    assert profile.avatar is None
    assert profile.name is None
    assert profile.title is None
    assert profile.location is None
    assert profile.twitch_url is None
    assert profile.league is None
    assert profile.is_streamer is False


def test_parse_player_profile_invalid_raises_parse_error(chesscom_fixture):
    data = chesscom_fixture("player_profile.json")
    del data["player_id"]
    data["joined"] = "not a date"

    with pytest.raises(ChessAPIParseError) as exc_info:
        parse_player_profile(data)

    message = str(exc_info.value)
    assert "player profile" in message
    assert "player_id" in message
    assert "joined" in message


@pytest.mark.parametrize("data", [None, [], "text", 42])
def test_parse_player_profile_not_an_object_raises_parse_error(data):
    with pytest.raises(ChessAPIParseError):
        parse_player_profile(data)


def test_parse_error_is_a_chess_api_error():
    # Lets one exception handler catch every Chess.com related error.
    assert issubclass(ChessAPIParseError, ChessAPIError)


# Player stats -----------------------------------------------------------------------


def test_parse_player_stats(chesscom_fixture):
    stats = parse_player_stats(chesscom_fixture("player_stats.json"))

    blitz = stats.for_time_class(TimeClass.BLITZ)
    assert blitz is not None
    assert blitz.last is not None
    assert blitz.last.rating == 2318
    assert blitz.last.rd == 40
    assert blitz.last.date == datetime(2026, 11, 2, 20, 5, 40, tzinfo=UTC)
    assert blitz.best is not None
    assert blitz.best.rating == 2401
    assert blitz.best.game_url == "https://www.chess.com/game/live/150000000002"
    assert (blitz.record.win, blitz.record.loss, blitz.record.draw) == (4210, 3895, 402)

    daily = stats.for_time_class(TimeClass.DAILY)
    assert daily is not None
    assert daily.record.time_per_move == 5120

    assert stats.fide == 2205


def test_parse_player_stats_time_class_never_played(chesscom_fixture):
    stats = parse_player_stats(chesscom_fixture("player_stats.json"))

    assert stats.for_time_class(TimeClass.BULLET) is None


def test_parse_player_stats_empty_response():
    stats = parse_player_stats({})

    assert all(stats.for_time_class(time_class) is None for time_class in TimeClass)
    assert stats.fide is None


def test_parse_player_stats_zero_fide_is_none():
    assert parse_player_stats({"fide": 0}).fide is None


# Game archives ----------------------------------------------------------------------


def test_parse_games_archives(chesscom_fixture):
    archives = parse_games_archives(chesscom_fixture("games_archives.json"))

    assert len(archives.urls) == 4
    assert archives.months == [
        ArchiveMonth(2025, 12),
        ArchiveMonth(2026, 9),
        ArchiveMonth(2026, 10),
        ArchiveMonth(2026, 11),
    ]


def test_parse_games_archives_months_are_sorted():
    archives = parse_games_archives(
        {
            "archives": [
                "https://api.chess.com/pub/player/x/games/2026/10",
                "https://api.chess.com/pub/player/x/games/2024/02",
            ]
        }
    )

    assert archives.months == [ArchiveMonth(2024, 2), ArchiveMonth(2026, 10)]


def test_parse_games_archives_no_games():
    assert parse_games_archives({"archives": []}).months == []


# Monthly games ----------------------------------------------------------------------


def test_parse_monthly_games_skips_malformed_game(chesscom_fixture):
    games = parse_monthly_games(chesscom_fixture("monthly_games.json"))

    # The fixture has 6 games; the last one has no "white" side and is skipped.
    assert len(games) == 5
    assert "169599999999" not in [game.game_id for game in games]


def test_parse_monthly_games_win_as_white(chesscom_fixture):
    game = parse_monthly_games(chesscom_fixture("monthly_games.json"))[0]

    assert game.game_id == "169586417316"
    assert game.time_class == TimeClass.BLITZ
    assert game.time_control == "180+2"
    assert game.end_time == datetime(2026, 11, 1, 18, 20, 11, tzinfo=UTC)
    assert game.is_standard_chess is True
    assert game.pgn is not None and game.pgn.startswith('[Event "Live Chess"]')
    assert game.accuracies is not None and game.accuracies.white == 91.4
    assert game.eco_url is not None and game.eco_url.endswith("Morphy-Defense")

    # Chess.com username case ("Checkmate_Tester") differs from the searched one.
    assert game.color_of(USERNAME) == PlayerColor.WHITE
    assert game.side_of(USERNAME).rating == 2310
    assert game.opponent_of(USERNAME).username == "opponent_one"
    assert game.result_for(USERNAME) == GameResult.WIN
    assert game.result_for("opponent_one") == GameResult.LOSS


def test_parse_monthly_games_results_from_player_perspective(chesscom_fixture):
    games = parse_monthly_games(chesscom_fixture("monthly_games.json"))

    assert [game.result_for(USERNAME) for game in games] == [
        GameResult.WIN,  # opponent resigned
        GameResult.LOSS,  # checkmated
        GameResult.DRAW,  # agreed
        GameResult.WIN,  # daily game, opponent timed out
        GameResult.LOSS,  # chess960, resigned
    ]


def test_parse_monthly_games_daily_and_variant(chesscom_fixture):
    games = parse_monthly_games(chesscom_fixture("monthly_games.json"))
    daily, chess960 = games[3], games[4]

    assert daily.time_class == TimeClass.DAILY
    assert daily.start_time == datetime(2026, 10, 15, 16, 42, 30, tzinfo=UTC)
    assert daily.color_of(USERNAME) == PlayerColor.BLACK
    assert chess960.rules == "chess960"
    assert chess960.is_standard_chess is False


def test_game_color_of_unknown_player_raises(chesscom_fixture):
    game = parse_monthly_games(chesscom_fixture("monthly_games.json"))[0]

    with pytest.raises(ValueError):
        game.color_of("someone_else")


@pytest.mark.parametrize("data", [{}, {"games": None}, [], None])
def test_parse_monthly_games_invalid_response_raises_parse_error(data):
    with pytest.raises(ChessAPIParseError):
        parse_monthly_games(data)


def test_parse_monthly_games_empty_month():
    assert parse_monthly_games({"games": []}) == []


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        ("win", GameResult.WIN),
        ("agreed", GameResult.DRAW),
        ("repetition", GameResult.DRAW),
        ("stalemate", GameResult.DRAW),
        ("insufficient", GameResult.DRAW),
        ("50move", GameResult.DRAW),
        ("timevsinsufficient", GameResult.DRAW),
        ("checkmated", GameResult.LOSS),
        ("resigned", GameResult.LOSS),
        ("timeout", GameResult.LOSS),
        ("abandoned", GameResult.LOSS),
        ("lose", GameResult.LOSS),
    ],
)
def test_result_code_to_game_result(code, expected):
    assert result_code_to_game_result(code) == expected


# Ongoing daily games ----------------------------------------------------------------


def test_parse_daily_games(chesscom_fixture):
    first, second = parse_daily_games(chesscom_fixture("daily_games.json"))

    assert first.game_id == "700000555"
    assert first.white_username == USERNAME
    assert first.black_username == "opponent_seven"
    assert first.turn == PlayerColor.BLACK
    assert first.move_by == datetime(2026, 11, 5, 8, 0, tzinfo=UTC)
    assert first.time_class == TimeClass.DAILY
    assert first.draw_offer is None

    assert second.move_by is None  # 0 in the response means "no deadline"
    assert second.rated is False
    assert second.draw_offer == PlayerColor.WHITE


# Monthly PGN ------------------------------------------------------------------------


def test_parse_monthly_pgn(chesscom_fixture):
    games = parse_monthly_pgn(chesscom_fixture("monthly_games.pgn"))

    assert len(games) == 2
    first, second = games
    assert first.headers["White"] == "Checkmate_Tester"
    assert first.headers["Result"] == "1-0"
    assert first.url == "https://www.chess.com/game/live/169586417316"
    assert first.pgn.startswith('[Event "Live Chess"]')
    assert first.pgn.endswith("1-0")
    assert "[%clk" not in first.headers  # move comments are not headers
    assert second.headers["Black"] == "Checkmate_Tester"
    assert second.headers["Annotator"] == 'Nick "The Quote" Name'  # escaped quotes
    assert "Qh4#" in second.pgn


def test_parse_monthly_pgn_windows_line_endings(chesscom_fixture):
    text = chesscom_fixture("monthly_games.pgn").replace("\n", "\r\n")

    games = parse_monthly_pgn(text)

    assert len(games) == 2
    assert games[1].url == "https://www.chess.com/game/live/169586499999"


@pytest.mark.parametrize("text", ["", "   \n\n "])
def test_parse_monthly_pgn_no_games(text):
    assert parse_monthly_pgn(text) == []


def test_parse_pgn_headers_ignores_moves():
    pgn = '[White "a"]\n[Black "b"]\n\n1. e4 {[%clk 0:03:00]} e5 *'

    assert parse_pgn_headers(pgn) == {"White": "a", "Black": "b"}
