"""Unit tests for Chess.com's titled players, behind the search box's suggestions."""

import asyncio

import pytest

from src.chesscom.client.exceptions import ChessAPIUnavailableError
from src.services.titled_players import (
    CACHE_SECONDS,
    RETRY_SECONDS,
    TITLES,
    TitledPlayer,
    TitledPlayers,
    ranked,
)
from tests.fakes import FakeChessComClient

pytestmark = pytest.mark.anyio

LISTS = {
    "GM": ["Hikaru", "hikaruXL", "MagnusCarlsen"],
    "IM": ["GothamChess", "hik"],
    "WFM": ["AnnaCramling"],
}


class Clock:
    """A clock the test moves by hand."""

    def __init__(self) -> None:
        self.now = 1_000.0

    def __call__(self) -> float:
        return self.now


class FlakyClient(FakeChessComClient):
    """The lists in `failing` do not load (Chess.com unavailable); the others do."""

    def __init__(self, failing: set[str], **kwargs) -> None:
        super().__init__(**kwargs)
        self.failing = failing

    async def get_titled_players(self, title: str) -> dict:
        if title in self.failing:
            self.calls.append(f"/titled/{title}")
            raise ChessAPIUnavailableError(f"503 on /titled/{title}")
        return await super().get_titled_players(title)


def list_loads(client: FakeChessComClient) -> int:
    return sum(call.startswith("/titled/") for call in client.calls)


async def test_finds_the_titled_players_whose_username_starts_with_it():
    titled = TitledPlayers(FakeChessComClient(titled=LISTS))

    found = await titled.starting_with("HIK", limit=8)

    # any letter case; the highest title first, then the shortest username
    assert found == [
        TitledPlayer("Hikaru", "GM"),
        TitledPlayer("hikaruXL", "GM"),
        TitledPlayer("hik", "IM"),
    ]


async def test_nothing_starts_with_it():
    titled = TitledPlayers(FakeChessComClient(titled=LISTS))

    assert await titled.starting_with("zz", limit=8) == []


async def test_at_most_the_limit():
    titled = TitledPlayers(FakeChessComClient(titled=LISTS))

    found = await titled.starting_with("h", limit=2)

    assert [player.username for player in found] == ["Hikaru", "hikaruXL"]


async def test_every_list_is_loaded_once_a_day():
    client = FakeChessComClient(titled=LISTS)
    clock = Clock()
    titled = TitledPlayers(client, clock=clock)

    await titled.starting_with("hik", limit=8)
    clock.now += CACHE_SECONDS - 1
    await titled.starting_with("mag", limit=8)

    assert sorted(client.calls) == sorted(f"/titled/{title}" for title in TITLES)

    clock.now += 1
    await titled.starting_with("hik", limit=8)

    assert list_loads(client) == 2 * len(TITLES)  # a day later: loaded again


async def test_a_list_that_does_not_load_keeps_its_players_and_is_tried_again_soon():
    client = FlakyClient(failing=set(), titled=LISTS)
    clock = Clock()
    titled = TitledPlayers(client, clock=clock)
    await titled.starting_with("g", limit=8)

    # A day later the GM list has changed and the IM list does not load.
    clock.now += CACHE_SECONDS
    client.titled = {**LISTS, "GM": ["Hikaru"]}
    client.failing = {"IM"}
    found = await titled.starting_with("h", limit=8)

    assert found == [TitledPlayer("Hikaru", "GM"), TitledPlayer("hik", "IM")]

    # Tried again a few minutes later, not a day later.
    client.failing = set()
    loads = list_loads(client)
    clock.now += RETRY_SECONDS - 1
    await titled.starting_with("h", limit=8)
    assert list_loads(client) == loads
    clock.now += 1
    await titled.starting_with("h", limit=8)
    assert list_loads(client) == loads + len(TITLES)


async def test_without_chess_com_there_are_no_titled_players_yet():
    titled = TitledPlayers(FlakyClient(failing=set(TITLES)), clock=Clock())

    assert await titled.starting_with("hik", limit=8) == []


async def test_a_list_in_an_unexpected_format_is_skipped():
    class OddClient(FakeChessComClient):
        async def get_titled_players(self, title: str) -> dict:
            if title == "GM":
                return {"players": "Hikaru"}  # not a list
            return await super().get_titled_players(title)

    titled = TitledPlayers(OddClient(titled=LISTS))

    assert await titled.starting_with("goth", limit=8) == [
        TitledPlayer("GothamChess", "IM")
    ]


async def test_requests_at_the_same_time_load_the_lists_once():
    client = FakeChessComClient(titled=LISTS)
    titled = TitledPlayers(client)

    results = await asyncio.gather(
        *(titled.starting_with("hik", limit=8) for _ in range(3))
    )

    assert results[0] == results[1] == results[2]
    assert list_loads(client) == len(TITLES)


async def test_a_player_in_two_lists_keeps_the_higher_title():
    client = FakeChessComClient(titled={"WGM": ["Somebody"], "IM": ["somebody"]})

    found = await TitledPlayers(client).starting_with("some", limit=8)

    assert found == [TitledPlayer("somebody", "IM")]


def test_ranked_by_title_then_length_then_name():
    players = [
        TitledPlayer("bbb", "FM"),
        TitledPlayer("aaaa", "GM"),
        TitledPlayer("Ccc", "GM"),
        TitledPlayer("aaa", "GM"),
    ]

    assert ranked(players, 3) == [
        TitledPlayer("aaa", "GM"),
        TitledPlayer("Ccc", "GM"),
        TitledPlayer("aaaa", "GM"),
    ]
