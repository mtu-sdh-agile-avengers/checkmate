"""API contract tests for GET /api/v1/players/{username}/profile."""

import pytest
from fastapi import status



from src.dependencies import get_players_service
from src.services.mocks.players import MockPlayersService

URL = "/api/v1/players/{username}/profile"


@pytest.fixture
def client(api_client):
    overrides = api_client.app.dependency_overrides
    overrides[get_players_service] = lambda: MockPlayersService()
    return api_client


def test_player_profile(client):
    response = client.get(URL.format(username="hikaru"))

    assert response.status_code == status.HTTP_200_OK

    body = response.json()

    assert body["username"] == "hikaru"
    assert body["playerId"] == 15448422
    assert body["url"] == "https://www.chess.com/member/Hikaru"
    assert body["name"] == "Hikaru Nakamura"
    assert body["title"] == "GM"
    assert body["followers"] == 1423670
    assert body["countryUrl"] == "https://api.chess.com/pub/country/US"
    assert body["location"] == "Florida"
    assert body["status"] == "premium"
    assert body["isStreamer"] is True
    assert body["twitchUrl"] == "https://twitch.tv/gmhikaru"
    assert body["verified"] is False
    assert body["league"] == "Legend"
    assert body["fideRating"] is None


def test_player_profile_unknown_user(client):
    response = client.get(URL.format(username="notfound"))

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_player_profile_unsupported_user(client):
    response = client.get(URL.format(username="someuser"))

    assert response.status_code == status.HTTP_404_NOT_FOUND