"""Which services the app uses in dev mode (mocks) and in prod mode (Chess.com)."""

from types import SimpleNamespace

import pytest

from src.config import RunMode
from src.dependencies import (
    get_external_api_chess_client,
    get_games_service,
    get_players_service,
)
from src.services.games import ChessComGamesService
from src.services.mocks.games import MockGamesService
from src.services.mocks.players import MockPlayersService
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient


def use_mode(monkeypatch, run_mode: RunMode) -> None:
    config = SimpleNamespace(run_mode=run_mode, stockfish_path=None)
    monkeypatch.setattr("src.dependencies.get_config", lambda: config)


def test_the_chess_client_is_shared_through_the_app_state():
    client = FakeChessComClient()
    request = SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(external_chess_api_client=client))
    )

    assert get_external_api_chess_client(request) is client


@pytest.mark.parametrize(
    ("run_mode", "players", "games"),
    [
        (RunMode.DEV, MockPlayersService, MockGamesService),
        (RunMode.PROD, ChessComPlayersService, ChessComGamesService),
    ],
)
def test_services_per_run_mode(monkeypatch, run_mode, players, games):
    use_mode(monkeypatch, run_mode)
    client = FakeChessComClient()

    assert isinstance(get_players_service(client), players)
    assert isinstance(get_games_service(client), games)
