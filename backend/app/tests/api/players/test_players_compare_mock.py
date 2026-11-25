"""API contract tests for GET /api/v1/players/compare with the DEV mock (CMG4-56)."""

import pytest
from fastapi import status

from src.dependencies import get_players_service
from src.services.mocks.players import MockPlayersService

URL = "/api/v1/players/compare"

SUMMARY_FIELDS = {
    "username",
    "dayPeriod",
    "timeClass",
    "wins",
    "losses",
    "draws",
    "rating",
    "ratingHistory",
    "totalGamesPlayed",
    "winRate",
}


@pytest.fixture
def client(api_client):
    # NOTE: a lambda, not the class itself (see test_players_summary_mock.py)
    api_client.app.dependency_overrides[get_players_service] = lambda: (
        MockPlayersService()
    )
    return api_client


def test_compare_contract(client):
    response = client.get(
        URL,
        params={
            "p1": "https://www.chess.com/member/Hikaru",
            "p2": "MagnusCarlsen",
            "timeClass": "blitz",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert set(body) == {"timeClass", "player1", "player2", "winLikelihood", "winner"}
    assert body["timeClass"] == "blitz"
    for key, username in (("player1", "hikaru"), ("player2", "magnuscarlsen")):
        player = body[key]
        assert set(player) == SUMMARY_FIELDS
        assert player["username"] == username  # URL and case normalised
        assert player["dayPeriod"] == "all"  # all-time statistics
        assert player["timeClass"] == "blitz"
    likelihood = body["winLikelihood"]
    assert set(likelihood) == {"player1", "player2"}
    assert likelihood["player1"] + likelihood["player2"] == pytest.approx(1)
    # the mock makes player 2 weaker (64 rating points lower)
    assert likelihood == {"player1": 0.5911, "player2": 0.4089}
    assert body["winner"] == "hikaru"
    # each player is better in some field, so the page shows both highlights
    assert body["player1"]["wins"] > body["player2"]["wins"]
    assert body["player1"]["losses"] > body["player2"]["losses"]


@pytest.mark.parametrize(
    ("p1", "p2", "detail"),
    [
        ("notfound", "hikaru", "Player notfound data is unavailable"),
        ("hikaru", "notfound", "Player notfound data is unavailable"),
        ("notfound", "notfound2", "Players notfound, notfound2 data is unavailable"),
    ],
)
def test_compare_unavailable_players(client, p1, p2, detail):
    response = client.get(URL, params={"p1": p1, "p2": p2, "timeClass": "rapid"})

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {"detail": detail}


@pytest.mark.parametrize(
    ("params", "message"),
    [
        (
            {
                "p1": "hikaru",
                "p2": "https://chess.com/member/HIKARU",
                "timeClass": "blitz",
            },
            "Choose two different players to compare.",
        ),
        (
            {"p1": "ab", "p2": "hikaru", "timeClass": "blitz"},
            "Player 1: Usernames must be 3-25 characters",
        ),
        (
            {
                "p1": "hikaru",
                "p2": "https://example.com/member/x",
                "timeClass": "blitz",
            },
            "Player 2: Please use a Chess.com link.",
        ),
        ({"p1": "hikaru", "p2": "magnus", "timeClass": "classic"}, "Input should be"),
        ({"p1": "hikaru", "p2": "magnus"}, "Field required"),
    ],
)
def test_compare_rejects_invalid_query(client, params, message):
    response = client.get(URL, params=params)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert response.json()["detail"][0]["msg"].startswith(message)


def test_compare_player_without_games(client):
    response = client.get(
        URL, params={"p1": "nogames", "p2": "hikaru", "timeClass": "daily"}
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["player1"]["totalGamesPlayed"] == 0
