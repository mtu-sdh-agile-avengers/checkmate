"""API contract tests for GET /api/v1/players/{username}/games/analyze with the DEV mock (CMG4-73)."""

import pytest
from fastapi import status

from src.dependencies import get_games_service
from src.services.mocks.games import MockGamesService

URL = "/api/v1/players/{username}/games/analyze"

MOVE_FIELDS = {
    "ply",
    "moveNumber",
    "color",
    "san",
    "uci",
    "fen",
    "evalCp",
    "mateIn",
    "bestMoveSan",
    "category",
}


@pytest.fixture
def client(api_client):
    # NOTE: a lambda, not the class itself (see test_players_summary_mock.py)
    api_client.app.dependency_overrides[get_games_service] = lambda: MockGamesService()
    return api_client


def test_analysis_contract(client):
    response = client.get(
        URL.format(username="hikaru"),
        params={"year": 2026, "month": 10, "search": "169586417316"},
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert set(body) == {"gameId", "gameUrl", "engine", "depth", "initialFen", "moves"}
    assert body["gameId"] == "169586417316"
    assert body["gameUrl"] == "https://www.chess.com/game/live/169586417316"
    assert body["engine"].startswith("Stockfish")
    assert body["depth"] >= 1
    assert body["initialFen"].startswith("rnbqkbnr/pppppppp/")

    moves = body["moves"]
    assert len(moves) == 33  # the Opera game: 17 moves, White mates
    assert all(set(move) == MOVE_FIELDS for move in moves)
    assert [move["ply"] for move in moves] == list(range(1, 34))
    first, reply, last = moves[0], moves[1], moves[-1]
    assert (first["moveNumber"], first["color"], first["san"], first["uci"]) == (
        1,
        "white",
        "e4",
        "e2e4",
    )
    assert (reply["moveNumber"], reply["color"]) == (1, "black")
    assert first["fen"].startswith("rnbqkbnr/pppppppp/8/8/4P3/")  # position after e4
    assert (last["san"], last["mateIn"], last["evalCp"]) == ("Rd8#", 0, 10000)
    assert {move["category"] for move in moves} <= {
        "best",
        "good",
        "inaccuracy",
        "miss",
        "blunder",
    }
    # a move that is not the engine's best names the better move
    not_best = [move for move in moves if move["category"] != "best"]
    assert not_best
    assert all(move["bestMoveSan"] != move["san"] for move in not_best)


def test_analysis_accepts_game_url(client):
    response = client.get(
        URL.format(username="hikaru"),
        params={"search": "https://www.chess.com/game/live/169586417316"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["gameId"] == "169586417316"


@pytest.mark.parametrize(
    ("username", "search", "code", "detail"),
    [
        (
            "notfound",
            "1",
            404,
            "notfound player data is not available / does not exist",
        ),
        ("hikaru", "0", 404, "Game 0 was not found in hikaru's games"),
        ("hikaru", "503", 503, "Error during loading a game. Please try again"),
    ],
)
def test_analysis_errors(client, username, search, code, detail):
    response = client.get(URL.format(username=username), params={"search": search})

    assert response.status_code == code
    assert response.json() == {"detail": detail}


def test_analysis_rejects_invalid_query(client):
    response = client.get(
        URL.format(username="hikaru"), params={"search": "1", "month": 10}
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert response.json()["detail"][0]["msg"] == (
        "Send both year and month, or neither of them."
    )
