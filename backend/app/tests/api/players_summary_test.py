"""API tests for GET /api/v1/players/{username}/summary with the real service (CMG4-84)."""

from datetime import UTC, datetime

import pytest
from fastapi import status

from src.dependencies import get_players_service
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient, make_raw_game

URL = "/api/v1/players/{username}/summary"
NOW = datetime(2026, 11, 3, 12, 0, tzinfo=UTC)


@pytest.fixture
def fake_client(chesscom_fixture) -> FakeChessComClient:
    return FakeChessComClient(
        stats=chesscom_fixture("player_stats.json"),
        archive_months=[(2026, 11)],
        monthly_games={
            (2026, 11): [
                make_raw_game(
                    username="Hikaru",
                    end_time=datetime(2026, 11, 1, 10, tzinfo=UTC),
                    rating=2310,
                    game_id=1,
                ),
                make_raw_game(
                    username="Hikaru",
                    end_time=datetime(2026, 11, 2, 10, tzinfo=UTC),
                    result="timeout",
                    rating=2302,
                    game_id=2,
                ),
            ]
        },
    )


@pytest.fixture
def client(api_client, fake_client):
    service = ChessComPlayersService(fake_client, now=lambda: NOW)
    api_client.app.dependency_overrides[get_players_service] = lambda: service
    return api_client


def test_summary_endpoint_returns_recent_statistics(client):
    response = client.get(
        URL.format(username="hikaru"), params={"period": "7", "timeClass": "blitz"}
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["wins"] == 1
    assert body["losses"] == 1
    assert body["totalGamesPlayed"] == 2
    assert body["winRate"] == 0.5
    assert body["rating"]["current"] == 2318
    assert body["rating"]["change"] == 2302 - 2310
    assert body["ratingHistory"] == [
        {"date": "2026-11-01T10:00:00Z", "rating": 2310},
        {"date": "2026-11-02T10:00:00Z", "rating": 2302},
    ]


def test_summary_endpoint_unknown_player_returns_404(client, fake_client):
    fake_client.not_found = True

    response = client.get(URL.format(username="ghost"), params={"timeClass": "blitz"})

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {
        "detail": "ghost player data is not available / does not exist"
    }
