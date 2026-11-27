"""Response caching of the players endpoints (@ttl_cached_response + X-Cache header)."""

import pytest
from fastapi import status

from src.dependencies import get_players_service
from src.services.mocks.players import MockPlayersService

PROFILE_URL = "/api/v1/players/{username}/profile"
SUMMARY_URL = "/api/v1/players/{username}/summary"


class CountingPlayersService(MockPlayersService):
    """The DEV mock that counts how many times a request really reached the service."""

    def __init__(self) -> None:
        self.calls = 0

    async def get_profile(self, username: str):
        self.calls += 1
        return await super().get_profile(username)

    async def get_summary(self, username: str, query):
        self.calls += 1
        return await super().get_summary(username, query)


@pytest.fixture
def service(api_client) -> CountingPlayersService:
    fake = CountingPlayersService()
    api_client.app.dependency_overrides[get_players_service] = lambda: fake
    return fake


def test_repeat_request_is_served_from_cache(api_client, service):
    first = api_client.get(PROFILE_URL.format(username="hikaru"))
    second = api_client.get(PROFILE_URL.format(username="Hikaru"))  # username case does not matter

    assert first.status_code == second.status_code == status.HTTP_200_OK
    assert first.headers["X-Cache"] == "MISS"
    assert second.headers["X-Cache"] == "HIT"
    assert second.json() == first.json()
    assert service.calls == 1


def test_different_query_is_cached_separately(api_client, service):
    url = SUMMARY_URL.format(username="hikaru")

    week = api_client.get(url, params={"period": "7", "timeClass": "blitz"})
    month = api_client.get(url, params={"period": "30", "timeClass": "blitz"})

    assert week.headers["X-Cache"] == month.headers["X-Cache"] == "MISS"
    assert service.calls == 2


def test_query_order_does_not_matter(api_client, service):
    url = SUMMARY_URL.format(username="hikaru")

    api_client.get(f"{url}?period=7&timeClass=blitz")
    second = api_client.get(f"{url}?timeClass=blitz&period=7")

    assert second.headers["X-Cache"] == "HIT"
    assert service.calls == 1


def test_errors_are_not_cached(api_client, service):
    for _ in range(2):
        response = api_client.get(PROFILE_URL.format(username="notfound"))

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "X-Cache" not in response.headers

    assert service.calls == 2  # the second request reached the service again
