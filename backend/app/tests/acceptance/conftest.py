"""Shared setup of the acceptance tests: the whole app on its dev-mode mock data."""

import shutil
import time
from collections.abc import Callable, Iterator
from statistics import quantiles

import pytest
from fastapi.testclient import TestClient

from src.config import get_config
from src.dependencies import (
    get_computer_player,
    get_games_service,
    get_players_service,
)
from src.services.computer import BasicPlayer
from src.services.mocks.games import MockGamesService
from src.services.mocks.players import MockPlayersService

STOCKFISH_PATH = get_config().stockfish_path or shutil.which("stockfish")
requires_stockfish = pytest.mark.skipif(
    not STOCKFISH_PATH, reason="Stockfish is not installed (set STOCKFISH_PATH)"
)


@pytest.fixture
def app_client(api_client: TestClient) -> Iterator[TestClient]:
    """The app with mock Chess.com data and the built-in computer player."""
    overrides = api_client.app.dependency_overrides
    overrides[get_players_service] = lambda: MockPlayersService()
    overrides[get_games_service] = lambda: MockGamesService()
    overrides[get_computer_player] = lambda: BasicPlayer()
    yield api_client


def p95_seconds(action: Callable[[], object], repeats: int = 30) -> float:
    """95th percentile of how long `action` takes, in seconds (after one warm-up call)."""
    action()
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        action()
        times.append(time.perf_counter() - start)
    return quantiles(times, n=20)[-1]
