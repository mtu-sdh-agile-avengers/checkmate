"""Tests for the game list of the dev-mode mock service (RUN_MODE=dev)."""

import pytest

from src.chesscom.client.exceptions import ChessAPINotFoundError
from src.schemas.games import PlayerGameHistoryListQuery
from src.services.mocks.games import MOCK_GAMES_PER_MONTH, MockGamesService
from src.services.mocks.players import MOCK_NO_GAMES_USERNAME, MOCK_NOT_FOUND_USERNAME


def query(**params) -> PlayerGameHistoryListQuery:
    return PlayerGameHistoryListQuery.model_validate(params)


@pytest.mark.anyio
async def test_latest_month_by_default():
    page = await MockGamesService().get_game_history_list("hikaru", query())

    assert (page.year, page.month) == (2026, 11)
    assert page.total_games == MOCK_GAMES_PER_MONTH
    assert len(page.items) == page.paging_limit
    assert {game.player.username for game in page.items} == {"hikaru"}


@pytest.mark.anyio
async def test_requested_month():
    page = await MockGamesService().get_game_history_list(
        "hikaru", query(year=2025, month=2)
    )

    assert (page.year, page.month) == (2025, 2)
    assert all(game.id.startswith("202502") for game in page.items)


@pytest.mark.anyio
async def test_unknown_player():
    with pytest.raises(ChessAPINotFoundError):
        await MockGamesService().get_game_history_list(MOCK_NOT_FOUND_USERNAME, query())


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("params", "month"),
    [({}, (None, None)), ({"year": 2026, "month": 10}, (2026, 10))],
)
async def test_player_without_games(params, month):
    page = await MockGamesService().get_game_history_list(
        MOCK_NO_GAMES_USERNAME, query(**params)
    )

    assert (page.year, page.month) == month
    assert page.items == []
    assert page.total_games == 0
