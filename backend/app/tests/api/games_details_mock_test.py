"""API contract tests for GET /api/v1/players/{username}/games/ with the DEV mock (CMG4-61)."""

import pytest
from fastapi import status

from src.dependencies import get_games_service
from src.services.mocks.games import MockGamesService

URL = "/api/v1/players/{username}/games/"

GAME_FIELDS = {
    "id",
    "url",
    "timeClass",
    "timeControl",
    "endTime",
    "rated",
    "rules",
    "color",
    "result",
    "player",
    "opponent",
    "avgRating",
    "pgn",
    "initialSetup",
    "fen",
}


@pytest.fixture
def client(api_client):
    # NOTE: a lambda, not the class itself (see players_summary_mock_test.py)
    api_client.app.dependency_overrides[get_games_service] = lambda: MockGamesService()
    return api_client


def test_game_details_contract(client):
    response = client.get(
        URL.format(username="hikaru"),
        params={"year": 2026, "month": 10, "search": "169586417316"},
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert set(body) == GAME_FIELDS  # JSON keys are camelCase
    assert body["id"] == "169586417316"
    assert body["url"] == "https://www.chess.com/game/live/169586417316"
    assert body["timeClass"] == "blitz"
    assert body["endTime"].startswith("2026-10-")  # in the requested archive month
    assert body["color"] in {"white", "black"}
    assert body["result"] in {"win", "loss", "draw"}
    assert body["player"]["username"] == "hikaru"
    assert set(body["opponent"]) == {"username", "rating"}
    assert body["avgRating"] == (
        (body["player"]["rating"] + body["opponent"]["rating"]) / 2
    )
    assert '[White "hikaru"]' in body["pgn"]
    assert body["pgn"].rstrip().endswith("17. Rd8# 1-0")
    assert body["initialSetup"].startswith("rnbqkbnr/pppppppp/")


def test_game_details_accepts_game_url_without_year_and_month(client):
    response = client.get(
        URL.format(username="hikaru"),
        params={"search": "https://www.chess.com/game/live/169586417316"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == "169586417316"


@pytest.mark.parametrize(
    ("username", "search", "detail"),
    [
        ("notfound", "1", "notfound player data is not available / does not exist"),
        ("hikaru", "0", "Game 0 was not found in hikaru's games"),
    ],
)
def test_game_details_not_found(client, username, search, detail):
    response = client.get(URL.format(username=username), params={"search": search})

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {"detail": detail}


@pytest.mark.parametrize(
    ("params", "message"),
    [
        ({"search": "not-a-game"}, "Use a game id or a link like"),
        ({"search": "https://lichess.org/game/1"}, "Please use a Chess.com link."),
        ({"search": "1", "year": 2026}, "Send both year and month, or neither"),
        ({"search": "1", "year": 2026, "month": 13}, "Input should be less than"),
        ({}, "Field required"),
    ],
)
def test_game_details_rejects_invalid_query(client, params, message):
    response = client.get(URL.format(username="hikaru"), params=params)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert response.json()["detail"][0]["msg"].startswith(message)


def test_game_details_rejects_old_game_id_param(client):
    # the contract uses `search` (id or URL), not `gameId`
    response = client.get(URL.format(username="hikaru"), params={"gameId": "1"})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
