"""Unit tests for the search box's account suggestions (ChessComPlayersService.suggest
and the dev mock)."""

import pytest

from src.chesscom.client.exceptions import ChessAPIUnavailableError
from src.services.mocks.players import MockPlayersService
from src.services.players import ChessComPlayersService
from src.services.processing.suggestions import SUGGESTIONS_LIMIT
from src.services.titled_players import TITLES, TitledPlayers
from tests.fakes import FakeChessComClient

pytestmark = pytest.mark.anyio


def summary(found) -> list[tuple[str, str | None, bool]]:
    return [(player.username, player.title, player.exact) for player in found.players]


async def test_the_account_with_exactly_that_username_comes_first(chesscom_fixture):
    profile = chesscom_fixture("hikaru/hikaru_profile.json")
    client = FakeChessComClient(
        profile=profile, titled={"GM": ["Hikaru", "HikaruFan"], "IM": ["Hikaru_Jr"]}
    )

    found = await ChessComPlayersService(client).suggest("hikaru")

    assert found.query == "hikaru"
    assert summary(found) == [
        ("hikaru", "GM", True),  # with its picture, and not twice
        ("hikarufan", "GM", False),
        ("hikaru_jr", "IM", False),
    ]
    assert found.players[0].avatar == profile["avatar"]
    assert found.players[1].url == "https://www.chess.com/member/HikaruFan"
    assert found.players[1].avatar is None
    assert "/player/hikaru" in client.calls


async def test_two_characters_are_not_looked_up_as_an_account():
    client = FakeChessComClient(titled={"GM": ["Hikaru"]})

    found = await ChessComPlayersService(client).suggest("hi")

    assert summary(found) == [("hikaru", "GM", False)]
    assert not any(call.startswith("/player/") for call in client.calls)


async def test_without_an_account_of_that_name_only_titled_players():
    client = FakeChessComClient(not_found=True, titled={"GM": ["Hikaru"]})

    found = await ChessComPlayersService(client).suggest("hika")

    assert summary(found) == [("hikaru", "GM", False)]


async def test_chess_com_unavailable_for_the_account_still_suggests_titled_players():
    class DownClient(FakeChessComClient):
        async def get_player_profile(self, username: str) -> dict:
            raise ChessAPIUnavailableError(f"Timeout on /player/{username}")

    found = await ChessComPlayersService(DownClient(titled={"GM": ["Hikaru"]})).suggest(
        "hika"
    )

    assert summary(found) == [("hikaru", "GM", False)]


async def test_at_most_eight_suggestions(chesscom_fixture):
    many = [f"gm_player{number:02d}" for number in range(12)]
    client = FakeChessComClient(
        profile=chesscom_fixture("hikaru/hikaru_profile.json"), titled={"GM": many}
    )

    found = await ChessComPlayersService(client).suggest("gm_")

    assert len(found.players) == SUGGESTIONS_LIMIT
    assert found.players[0].exact  # the exact account, then 7 titled players


async def test_the_services_of_the_app_share_its_titled_players():
    client = FakeChessComClient(not_found=True, titled={"GM": ["Hikaru"]})
    titled = TitledPlayers(client)

    await ChessComPlayersService(client, titled=titled).suggest("hik")
    await ChessComPlayersService(client, titled=titled).suggest("hika")

    assert sum(call.startswith("/titled/") for call in client.calls) == len(TITLES)


async def test_dev_mock_suggests_the_account_typed_then_sample_titled_players():
    found = await MockPlayersService().suggest("mag")

    assert summary(found) == [("mag", "GM", True), ("magnuscarlsen", "GM", False)]


async def test_dev_mock_two_characters_and_notfound():
    service = MockPlayersService()

    assert summary(await service.suggest("an")) == [("annacramling", "WFM", False)]
    assert (await service.suggest("notfound")).players == []  # the empty state
