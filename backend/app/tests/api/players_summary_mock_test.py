"""API contract tests for GET /api/v1/players/{username}/summary with the DEV mock (CMG4-48)."""

import pytest
from fastapi import status

from src.dependencies import get_players_service
from src.services.mocks.players import MockPlayersService

URL = "/api/v1/players/{username}/summary"


@pytest.fixture
def client(api_client):
    # Use the mock regardless of RUN_MODE in the local .env.
    # NOTE: a lambda, not the class itself: FastAPI would treat the class's
    # Protocol-generated __init__(*args, **kwargs) as query parameters.
    overrides = api_client.app.dependency_overrides
    overrides[get_players_service] = lambda: MockPlayersService()
    return api_client


def test_summary_recent_period(client):
    response = client.get(
        URL.format(username="hikaru"), params={"period": "7", "timeClass": "blitz"}
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    # JSON keys are camelCase
    assert body["username"] == "hikaru"
    assert body["dayPeriod"] == "7"
    assert body["timeClass"] == "blitz"
    assert body["totalGamesPlayed"] == body["wins"] + body["losses"] + body["draws"]
    assert body["winRate"] == round(body["wins"] / body["totalGamesPlayed"], 4)
    rating = body["rating"]
    assert set(rating) == {"current", "highest", "expected", "change", "difference"}
    assert rating["change"] is not None
    history = body["ratingHistory"]
    assert len(history) > 0
    assert set(history[0]) == {"date", "rating"}
    assert history[-1]["rating"] == rating["current"]
    assert [p["date"] for p in history] == sorted(p["date"] for p in history)


def test_summary_defaults_to_all_time(client):
    response = client.get(URL.format(username="hikaru"), params={"timeClass": "rapid"})

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["dayPeriod"] == "all"
    assert body["rating"]["change"] is None
    assert body["ratingHistory"] == []


def test_summary_player_without_games(client):
    response = client.get(
        URL.format(username="nogames"), params={"period": "30", "timeClass": "blitz"}
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["totalGamesPlayed"] == 0
    assert body["winRate"] == 0.0
    assert body["rating"]["change"] is None
    assert body["ratingHistory"] == []


def test_summary_unknown_player_returns_404(client):
    response = client.get(
        URL.format(username="notfound"), params={"timeClass": "blitz"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {
        "detail": "notfound player data is not available / does not exist"
    }


@pytest.mark.parametrize(
    "params",
    [
        {},  # timeClass is required
        {"timeClass": "classical"},  # unknown time class
        {"timeClass": "blitz", "period": "10"},  # unsupported period
        {"time_class": "blitz"},  # query params must be camelCase
    ],
)
def test_summary_invalid_query_returns_422(client, params):
    response = client.get(URL.format(username="hikaru"), params=params)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
