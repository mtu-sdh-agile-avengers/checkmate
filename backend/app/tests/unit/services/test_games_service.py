"""Tests for ChessComGamesService.get_game_board_details: the game detail endpoint.

Uses the real Chess.com snapshot of Hikaru's October 2026 games (13 games).
"""

import pytest
from fastapi import status

from src.chesscom.client.exceptions import (
    ChessAPINotFoundError,
    ChessAPIParseError,
    ChessComGameNotFoundError,
)
from src.chesscom.parser.models import STANDARD_START_FEN
from src.chesscom.parser.parser import parse_monthly_games
from src.dependencies import get_games_service
from src.schemas.games import PlayerGameSearchQuery
from src.services.games import (
    ChessComGamesService,
    to_game_board_details,
    to_game_response,
)
from tests.fakes import FakeChessComClient

URL = "/api/v1/players/{username}/games/"
OCTOBER = (2026, 10)


@pytest.fixture
def october_games(chesscom_fixture) -> list[dict]:
    return chesscom_fixture("hikaru/hikaru_games_2026_10.json")["games"]


@pytest.fixture
def fake_client(october_games) -> FakeChessComClient:
    return FakeChessComClient(
        archive_months=[(2026, 9), OCTOBER],
        monthly_games={OCTOBER: october_games},
    )


def search(game: str, year: int | None = 2026, month: int | None = 10):
    params = {"search": game}
    if year is not None:
        params |= {"year": year, "month": month}
    return PlayerGameSearchQuery.model_validate(params)


@pytest.mark.anyio
async def test_game_details_of_a_lost_game_as_white(fake_client):
    service = ChessComGamesService(fake_client)

    game = await service.get_game_board_details("hikaru", search("186299458406"))

    assert game.id == "186299458406"
    assert game.url == "https://www.chess.com/game/live/186299458406"
    assert game.time_class == "blitz"
    assert game.time_control == "180"
    assert game.end_time.isoformat() == "2026-10-31T19:29:21+00:00"
    assert game.rated is True
    assert game.rules == "chess"
    assert game.color == "white"
    assert game.result == "loss"  # Hikaru resigned
    assert (game.player.username, game.player.rating) == ("Hikaru", 3443)
    assert (game.opponent.username, game.opponent.rating) == ("Sina-Movahed", 3309)
    assert game.avg_rating == 3376.0
    assert game.pgn.startswith('[Event "Live Chess"]')
    assert '[Link "https://www.chess.com/game/live/186299458406"]' in game.pgn
    assert game.initial_setup == STANDARD_START_FEN
    assert game.fen.count("/") == 7  # a FEN board has 8 ranks
    # only the requested monthly archive is downloaded
    assert fake_client.calls == ["/player/hikaru/games/2026/10"]


@pytest.mark.anyio
async def test_game_details_from_the_point_of_view_of_black(fake_client):
    service = ChessComGamesService(fake_client)

    game = await service.get_game_board_details("hikaru", search("186299125430"))

    assert game.color == "black"
    assert game.result == "win"  # Sina-Movahed lost on time
    assert (game.player.username, game.player.rating) == ("Hikaru", 3454)
    assert game.opponent.username == "Sina-Movahed"


@pytest.mark.anyio
async def test_game_details_of_the_opponent_and_a_draw(fake_client):
    service = ChessComGamesService(fake_client)

    # the same game seen by the other player (case-insensitive username)
    game = await service.get_game_board_details(
        "narek_ghimoyan", search("184774524962")
    )

    assert game.color == "white"
    assert game.result == "draw"  # repetition
    assert game.player.username == "Narek_Ghimoyan"
    assert game.opponent.username == "Hikaru"


@pytest.mark.anyio
async def test_game_details_accepts_a_game_url(fake_client):
    service = ChessComGamesService(fake_client)
    query = search("https://www.chess.com/game/live/186299800014?move=0")

    game = await service.get_game_board_details("hikaru", query)

    assert game.id == "186299800014"


@pytest.mark.anyio
async def test_game_details_uses_the_latest_month_without_year_and_month(fake_client):
    service = ChessComGamesService(fake_client)

    game = await service.get_game_board_details(
        "hikaru", search("186299800014", year=None)
    )

    assert game.id == "186299800014"
    assert fake_client.calls == [
        "/player/hikaru/games/archives",
        "/player/hikaru/games/2026/10",
    ]


@pytest.mark.anyio
async def test_game_not_in_the_month(fake_client):
    service = ChessComGamesService(fake_client)

    with pytest.raises(ChessComGameNotFoundError) as error:
        await service.get_game_board_details("hikaru", search("123", 2026, 9))

    assert str(error.value) == "Game 123 was not found in hikaru's games from 2026-09"


@pytest.mark.anyio
async def test_game_of_a_player_without_games():
    service = ChessComGamesService(FakeChessComClient(archive_months=[]))

    with pytest.raises(
        ChessComGameNotFoundError, match="^Game 1 was not found in new_player's games$"
    ):
        await service.get_game_board_details("new_player", search("1", year=None))


@pytest.mark.anyio
async def test_game_of_an_unknown_player():
    service = ChessComGamesService(FakeChessComClient(not_found=True))

    with pytest.raises(ChessAPINotFoundError):
        await service.get_game_board_details("ghost", search("1", year=None))


def test_every_real_game_maps_to_a_response(october_games):
    games = parse_monthly_games({"games": october_games})

    details = [to_game_board_details(game, "hikaru") for game in games]

    assert len(details) == 13
    assert {d.result for d in details} == {"win", "loss", "draw"}
    assert {d.color for d in details} == {"white", "black"}
    assert all(d.player.username == "Hikaru" for d in details)
    # the list item (CMG4-86) is the same game without the moves
    item = to_game_response(games[0], "hikaru")
    assert item.model_dump() == details[0].model_dump(
        exclude={"pgn", "initial_setup", "fen"}
    )


# Endpoint with the real service (Chess.com replaced by the fake client) -------------


def use_service(api_client, service):
    # NOTE: a lambda, not the class itself (see test_players_summary_mock.py)
    api_client.app.dependency_overrides[get_games_service] = lambda: service
    return api_client


def test_game_details_endpoint(api_client, fake_client):
    client = use_service(api_client, ChessComGamesService(fake_client))

    response = client.get(
        URL.format(username="hikaru"),
        params={"year": 2026, "month": 10, "search": "186299800014"},
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["endTime"] == "2026-10-31T19:39:20Z"
    assert body["player"] == {"username": "Hikaru", "rating": 3453}
    assert body["opponent"] == {"username": "Sina-Movahed", "rating": 3299}
    assert body["avgRating"] == 3376.0
    assert (body["color"], body["result"]) == ("white", "win")
    assert body["initialSetup"] == STANDARD_START_FEN
    assert body["fen"] == "8/6p1/6Pb/kP5P/8/8/3p4/3K1B2 b - - 7 79"


def test_game_details_endpoint_game_not_found(api_client, fake_client):
    client = use_service(api_client, ChessComGamesService(fake_client))

    response = client.get(
        URL.format(username="hikaru"),
        params={"year": 2026, "month": 10, "search": "999"},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {
        "detail": "Game 999 was not found in hikaru's games from 2026-10"
    }


def test_game_details_endpoint_player_not_found(api_client):
    client = use_service(
        api_client, ChessComGamesService(FakeChessComClient(not_found=True))
    )

    response = client.get(URL.format(username="ghost"), params={"search": "1"})

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {
        "detail": "ghost player data is not available / does not exist"
    }


def test_a_game_without_moves_cannot_be_shown(october_games):
    game = parse_monthly_games({"games": october_games})[0].model_copy(
        update={"pgn": None}
    )

    with pytest.raises(ChessAPIParseError, match="no PGN"):
        to_game_board_details(game, "hikaru")


@pytest.mark.anyio
async def test_real_game_analysis_is_not_wired_yet(fake_client):
    # CMG4-88: the analysis endpoint answers from mocks until Stockfish is wired in
    with pytest.raises(NotImplementedError):
        await ChessComGamesService(fake_client).analyze_game_board(
            "hikaru", search("1", year=None)
        )
