"""API contract tests for GET /api/v1/players/{username}/games/list with the DEV mock."""

from typing import Any

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.chesscom.client.exceptions import ChessAPIUnavailableError
from src.dependencies import get_games_service
from src.services.games import ChessComGamesService
from tests.fakes import FakeChessComClient

URL = "/api/v1/players/{username}/games/list"
OCTOBER = (2026, 10)

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
}


@pytest.fixture
def fake_client(chesscom_fixture) -> FakeChessComClient:
    return FakeChessComClient(
        archive_months=[OCTOBER],
        monthly_games={
            OCTOBER: chesscom_fixture("hikaru/hikaru_games_2026_10.json")["games"]
        },
    )


@pytest.fixture
def client(api_client: TestClient, fake_client: FakeChessComClient) -> TestClient:
    service = ChessComGamesService(fake_client)
    api_client.app.dependency_overrides[get_games_service] = lambda: service
    return api_client


def test_list_contract(client: TestClient):
    response = client.get(
        URL.format(username="hikaru"),
        params={"year": 2026, "month": 10, "pagingLimit": 5},
    )

    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert set(body) == {
        "year",
        "month",
        "items",
        "pagingLimit",
        "totalGames",
        "totalPages",
        "page",
        "hasNext",
    }
    assert (body["year"], body["month"], body["page"]) == (2026, 10, 1)
    assert (body["totalGames"], body["totalPages"], body["hasNext"]) == (13, 3, True)
    assert len(body["items"]) == 5
    assert set(body["items"][0]) == GAME_FIELDS  # no pgn / fen in the list


def test_list_unknown_player_returns_404(
    client: TestClient, fake_client: FakeChessComClient
):
    fake_client.not_found = True

    response = client.get(URL.format(username="ghost"))

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {
        "detail": "ghost player data is not available / does not exist"
    }


def test_list_chesscom_unavailable_returns_503(
    client: TestClient, fake_client: FakeChessComClient
):
    async def chesscom_is_down(username, year, month):
        raise ChessAPIUnavailableError()

    fake_client.get_player_monthly_games = chesscom_is_down

    response = client.get(
        URL.format(username="hikaru"), params={"year": 2026, "month": 10}
    )

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


@pytest.mark.parametrize(
    "params",
    [
        {"pagingLimit": 7},  # not one of 5, 10, 15, 30, 50, 100
        {"page": 0},  # pages start at 1
        {"timeClass": "classical"},  # unknown time class
        {"sortBy": "rating"},  # unknown sort field
        {"sortOrder": "up"},  # unknown order
        {"paging_limit": 5},  # query params must be camelCase
    ],
)
def test_list_invalid_query_returns_422(
    client: TestClient, fake_client: FakeChessComClient, params: dict[str, Any]
):
    response = client.get(URL.format(username="hikaru"), params=params)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert fake_client.calls == []
