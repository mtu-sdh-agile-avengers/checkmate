"""Tests for GET /api/v1/players/suggestions?q= (the search box's account suggestions)."""

import pytest
from fastapi import status

from src.dependencies import get_players_service
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient

URL = "/api/v1/players/suggestions"
MESSAGE = "Type 2-25 characters of a username: letters, numbers, _ or -."


def test_suggestions_from_chess_com(api_client, chesscom_fixture):
    profile = chesscom_fixture("hikaru/hikaru_profile.json")
    fake = FakeChessComClient(profile=profile, titled={"GM": ["Hikaru", "HikaruFan"]})
    api_client.app.dependency_overrides[get_players_service] = lambda: (
        ChessComPlayersService(fake)
    )

    response = api_client.get(URL, params={"q": "Hikaru"})

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "query": "hikaru",
        "players": [
            {
                "username": "hikaru",
                "url": "https://www.chess.com/member/Hikaru",
                "avatar": profile["avatar"],
                "title": "GM",
                "exact": True,
            },
            {
                "username": "hikarufan",
                "url": "https://www.chess.com/member/HikaruFan",
                "avatar": None,
                "title": "GM",
                "exact": False,
            },
        ],
    }
    assert "/player/hikaru" in fake.calls  # lowercase username sent to Chess.com


def test_suggestions_with_the_dev_mock(api_client):
    found = api_client.get(URL, params={"q": "mag"})
    empty = api_client.get(URL, params={"q": "notfound"})

    assert found.status_code == status.HTTP_200_OK
    assert [(p["username"], p["exact"]) for p in found.json()["players"]] == [
        ("mag", True),
        ("magnuscarlsen", False),
    ]
    assert empty.json() == {"query": "notfound", "players": []}


@pytest.mark.parametrize(
    "q", ["", "h", "hik aru", "x" * 26, "chess.com/member/hikaru", "hikaru!"]
)
def test_refuses_what_cannot_start_a_username(api_client, q):
    response = api_client.get(URL, params={"q": q})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    error = response.json()["detail"][0]
    assert error["loc"] == ["query", "q"]
    assert error["msg"] == MESSAGE


def test_requires_q(api_client):
    assert api_client.get(URL).status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
