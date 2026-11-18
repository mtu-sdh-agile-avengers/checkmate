"""API contract tests for GET /api/v1/players/{username}/profile with the DEV mock (CMG4-82)."""

import pytest
from fastapi import status

from src.chesscom.parser import parse_player_profile, parse_player_stats
from src.dependencies import get_players_service
from src.schemas.players import PlayerProfileResponse
from src.services.mocks.players import MockPlayersService

URL = "/api/v1/players/{username}/profile"


class HikaruFixtureMockPlayersService(MockPlayersService):
    """DEV mock that returns the real hikaru fixtures for "hikaru".

    Like the real service, the FIDE rating comes from the stats fixture,
    because the Chess.com profile does not include it.
    Other usernames fall back to the regular mock sample profile.
    """

    def __init__(self, raw_profile: dict, raw_stats: dict) -> None:
        self._raw_profile = raw_profile
        self._raw_stats = raw_stats

    async def get_profile(self, username: str) -> PlayerProfileResponse:
        if username.casefold() != "hikaru":
            return await super().get_profile(username)

        profile = parse_player_profile(self._raw_profile)
        stats = parse_player_stats(self._raw_stats)
        return PlayerProfileResponse(
            **profile.model_dump(include=set(PlayerProfileResponse.model_fields)),
            fide_rating=stats.fide,
        )


@pytest.fixture
def client(api_client, chesscom_fixture):
    # Use the mock regardless of RUN_MODE in the local .env.
    # NOTE: a lambda, not the class itself: FastAPI would treat the class's
    # Protocol-generated __init__(*args, **kwargs) as query parameters.
    service = HikaruFixtureMockPlayersService(
        raw_profile=chesscom_fixture("hikaru_profile.json"),
        raw_stats=chesscom_fixture("hikaru_stats.json"),
    )
    overrides = api_client.app.dependency_overrides
    overrides[get_players_service] = lambda: service
    return api_client


def test_player_profile(client):
    response = client.get(URL.format(username="hikaru"))

    assert response.status_code == status.HTTP_200_OK

    body = response.json()

    assert body["username"] == "hikaru"
    assert body["avatar"] == "https://images.chesscomfiles.com/uploads/v1/user/15448422.88c010c1.200x200o.3c5619f5441e.png"
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
    assert body["fideRating"] == 2814  # from hikaru_stats.json


def test_player_profile_unknown_user(client):
    response = client.get(URL.format(username="notfound"))

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {
        "detail": "notfound player data is not available / does not exist"
    }


def test_player_profile_any_username(client):
    response = client.get(URL.format(username="someuser"))
    
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["username"] == "someuser"
    assert body["fideRating"] == 2700  # mock sample profile
