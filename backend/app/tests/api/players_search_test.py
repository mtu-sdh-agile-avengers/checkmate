"""Tests for GET /api/v1/players/?search={username|url} (search page, CMG4-12 / CMG4-47)."""

import pytest
from fastapi import status

from src.chesscom.exceptions import ChessAPINotFoundError
from src.dependencies import get_players_service
from src.services.mocks.players import MockPlayersService
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient

URL = "/api/v1/players/"


def use_service(api_client, service):
    # NOTE: a lambda, not the class itself (see players_summary_mock_test.py)
    api_client.app.dependency_overrides[get_players_service] = lambda: service
    return api_client


@pytest.mark.anyio
async def test_search_returns_short_profile(chesscom_fixture):
    client = FakeChessComClient(profile=chesscom_fixture("hikaru_profile.json"))

    found = await ChessComPlayersService(client).search("hikaru")

    assert found.username == "hikaru"
    assert found.url == "https://www.chess.com/member/Hikaru"
    assert found.title == "GM"
    assert found.avatar is not None
    assert client.calls == ["/player/hikaru"]  # one Chess.com request only


@pytest.mark.anyio
async def test_search_unknown_player_raises_not_found():
    with pytest.raises(ChessAPINotFoundError):
        await ChessComPlayersService(FakeChessComClient(not_found=True)).search("ghost")


@pytest.mark.parametrize(
    "search",
    ["Hikaru", "https://www.chess.com/member/Hikaru", "chess.com/member/hikaru"],
)
def test_search_endpoint_accepts_username_or_profile_url(
    api_client, chesscom_fixture, search
):
    fake = FakeChessComClient(profile=chesscom_fixture("hikaru_profile.json"))
    client = use_service(api_client, ChessComPlayersService(fake))

    response = client.get(URL, params={"search": search})

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "username": "hikaru",
        "url": "https://www.chess.com/member/Hikaru",
        "avatar": chesscom_fixture("hikaru_profile.json")["avatar"],
        "title": "GM",
    }
    assert fake.calls == ["/player/hikaru"]  # lowercase username sent to Chess.com


def test_search_endpoint_unknown_player_is_404(api_client):
    client = use_service(
        api_client, ChessComPlayersService(FakeChessComClient(not_found=True))
    )

    response = client.get(URL, params={"search": "ghost_player"})

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {"detail": 'No Chess.com player found for "ghost_player"'}


@pytest.mark.parametrize(
    ("search", "message"),
    [
        ("ab", "Usernames must be 3-25 characters: letters, numbers, _ or -."),
        ("https://example.com/member/hikaru", "Please use a Chess.com link."),
    ],
)
def test_search_endpoint_rejects_invalid_input(api_client, search, message):
    fake = FakeChessComClient()
    client = use_service(api_client, ChessComPlayersService(fake))

    response = client.get(URL, params={"search": search})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    error = response.json()["detail"][0]
    assert error["loc"] == ["query", "search"]
    assert error["msg"].startswith(message)  # readable message for the frontend
    assert fake.calls == []  # Chess.com is not called


def test_search_endpoint_requires_search_param(api_client):
    client = use_service(api_client, MockPlayersService())

    assert client.get(URL).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_search_endpoint_with_dev_mock(api_client):
    client = use_service(api_client, MockPlayersService())

    found = client.get(URL, params={"search": "https://www.chess.com/member/Magnus"})
    missing = client.get(URL, params={"search": "notfound"})

    assert found.status_code == status.HTTP_200_OK
    assert found.json()["username"] == "magnus"
    assert set(found.json()) == {"username", "url", "avatar", "title"}
    assert missing.status_code == status.HTTP_404_NOT_FOUND
