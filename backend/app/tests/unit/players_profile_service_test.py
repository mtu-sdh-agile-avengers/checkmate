"""Tests for ChessComPlayersService.get_profile incl. the FIDE rating (CMG4-69)."""

import pytest
from fastapi import status

from src.chesscom.exceptions import ChessAPINotFoundError
from src.dependencies import get_players_service
from src.services.mocks.players import MockPlayersService
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient


@pytest.mark.anyio
async def test_profile_includes_fide_rating_from_stats(chesscom_fixture):
    client = FakeChessComClient(
        profile=chesscom_fixture("hikaru_profile.json"),
        stats=chesscom_fixture("hikaru_stats.json"),
    )

    profile = await ChessComPlayersService(client).get_profile("hikaru")

    assert profile.player_id == 15448422
    assert profile.fide_rating == 2814  # FIDE rating lives in /stats, not /player
    assert profile.country_url == "https://api.chess.com/pub/country/US"
    assert sorted(client.calls) == ["/player/hikaru", "/player/hikaru/stats"]


@pytest.mark.anyio
async def test_profile_without_fide_rating(chesscom_fixture):
    client = FakeChessComClient(
        profile=chesscom_fixture("player_profile_minimal.json"), stats={}
    )

    profile = await ChessComPlayersService(client).get_profile("new_player_42")

    assert profile.fide_rating is None


@pytest.mark.anyio
async def test_profile_unknown_player_raises_not_found():
    service = ChessComPlayersService(FakeChessComClient(not_found=True))

    with pytest.raises(ChessAPINotFoundError):
        await service.get_profile("ghost")


def test_profile_endpoint_returns_fide_rating_in_camel_case(api_client):
    api_client.app.dependency_overrides[get_players_service] = lambda: (
        MockPlayersService()
    )

    response = api_client.get("/api/v1/players/someuser/profile")

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["fideRating"] == 2700
