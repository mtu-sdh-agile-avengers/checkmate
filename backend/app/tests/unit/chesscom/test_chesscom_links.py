"""Tests for parsing usernames / game ids and Chess.com links typed by the end-user."""

import pytest

from src.chesscom.parser.links import (
    InvalidChessComInputError,
    parse_game_query,
    parse_player_query,
)


@pytest.mark.parametrize(
    "value",
    [
        "hikaru",
        "Hikaru",
        "  hikaru  ",
        "https://www.chess.com/member/Hikaru",
        "https://www.chess.com/member/hikaru/",
        "http://chess.com/member/hikaru",
        "https://m.chess.com/member/hikaru",
        "www.chess.com/member/hikaru",
        "chess.com/member/hikaru?ref=share#top",
        "HTTPS://WWW.CHESS.COM/MEMBER/HIKARU",
    ],
)
def test_parse_player_query_accepts_username_and_member_url(value):
    assert parse_player_query(value) == "hikaru"


def test_parse_player_query_keeps_dash_and_underscore():
    assert parse_player_query("Sina-Movahed") == "sina-movahed"
    assert parse_player_query("new_player_42") == "new_player_42"


@pytest.mark.parametrize(
    ("value", "message"),
    [
        ("", "Enter a Chess.com username"),
        ("   ", "Enter a Chess.com username"),
        ("ab", "3-25 characters"),
        ("a" * 26, "3-25 characters"),
        ("hik aru", "3-25 characters"),
        ("hikaru!", "3-25 characters"),
        ("https://example.com/member/hikaru", "Chess.com link"),
        ("https://chess.com.evil.io/member/hikaru", "Chess.com link"),
        ("https://www.chess.com/game/live/169586417316", "chess.com/member/username"),
        ("https://www.chess.com/member/", "chess.com/member/username"),
        ("https://www.chess.com/member/hikaru/games", "chess.com/member/username"),
    ],
)
def test_parse_player_query_rejects_invalid_input(value, message):
    with pytest.raises(InvalidChessComInputError, match=message):
        parse_player_query(value)


@pytest.mark.parametrize(
    "value",
    [
        "169586417316",
        " 169586417316 ",
        "https://www.chess.com/game/live/169586417316",
        "https://www.chess.com/game/live/169586417316?move=10",
        "https://www.chess.com/analysis/game/live/169586417316",
        "https://www.chess.com/live/game/169586417316",
        "chess.com/game/live/169586417316/",
    ],
)
def test_parse_game_query_accepts_id_and_game_url(value):
    assert parse_game_query(value) == "169586417316"


def test_parse_game_query_accepts_daily_game_url():
    assert parse_game_query("https://www.chess.com/game/daily/912345678") == "912345678"


@pytest.mark.parametrize(
    "value",
    [
        "",
        "abc",
        "12a",
        "https://lichess.org/game/live/169586417316",
        "https://www.chess.com/member/hikaru",
        "https://www.chess.com/game/live/",
        "https://www.chess.com/game/live/abc",
    ],
)
def test_parse_game_query_rejects_invalid_input(value):
    with pytest.raises(InvalidChessComInputError):
        parse_game_query(value)
