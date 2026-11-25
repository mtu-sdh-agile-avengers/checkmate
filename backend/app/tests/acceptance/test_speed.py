"""NFR speed: every page's data and every computer move arrive quickly.

Budgets are measured in-process (no network), so they test our own code:
- each API endpoint answers within 250 ms (95th percentile of 30 requests);
- the computer answers a move within the time of its level (engine start included).
"""

import time

import chess
import pytest

from src.analysis.stockfish import load_stockfish_config
from src.enums import ComputerLevel
from src.services.computer import BasicPlayer, StockfishPlayer
from tests.acceptance.conftest import STOCKFISH_PATH, p95_seconds, requires_stockfish

API_BUDGET_SECONDS = 0.25

PAGES = [
    ("/api/v1/players/", {"search": "hikaru"}),
    ("/api/v1/players/hikaru/profile", {}),
    ("/api/v1/players/hikaru/summary", {"period": "7", "timeClass": "blitz"}),
    ("/api/v1/players/hikaru/summary", {"period": "all", "timeClass": "rapid"}),
    ("/api/v1/players/compare", {"p1": "hikaru", "p2": "magnus", "timeClass": "blitz"}),
    ("/api/v1/players/hikaru/games/list", {"year": 2026, "month": 10}),
    ("/api/v1/players/hikaru/games/", {"search": "169586417316"}),
    (
        "/api/v1/players/hikaru/games/analyze",
        {"year": 2026, "month": 10, "search": "169586417316"},
    ),
]


@pytest.mark.parametrize(("path", "params"), PAGES)
def test_every_endpoint_answers_within_budget(app_client, path, params):
    def request():
        response = app_client.get(path, params=params)
        assert response.status_code == 200

    assert p95_seconds(request) < API_BUDGET_SECONDS


def test_a_computer_move_request_answers_within_budget(app_client):
    def request():
        response = app_client.post("/api/v1/computer/move", json={"move": "e2e4"})
        assert response.status_code == 200

    assert p95_seconds(request) < API_BUDGET_SECONDS


@pytest.mark.anyio
async def test_the_built_in_player_moves_within_50_ms():
    board = chess.Board()
    player = BasicPlayer()

    start = time.perf_counter()
    for _ in range(20):
        await player.choose_move(board, ComputerLevel.EXPERT)

    assert (time.perf_counter() - start) / 20 < 0.05


# Seconds per computer move: the engine start (~0.1 s) + the thinking time of the level
LEVEL_BUDGET_SECONDS = {
    ComputerLevel.BEGINNER: 1.0,
    ComputerLevel.INTERMEDIATE: 1.5,
    ComputerLevel.ADVANCED: 2.0,
    ComputerLevel.EXPERT: 3.0,
}


@pytest.mark.anyio
@requires_stockfish
@pytest.mark.parametrize("level", list(ComputerLevel))
async def test_stockfish_replies_within_the_time_of_its_level(level):
    player = StockfishPlayer(STOCKFISH_PATH, load_stockfish_config())
    board = chess.Board(
        "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3"
    )

    start = time.perf_counter()
    move = await player.choose_move(board, level)
    elapsed = time.perf_counter() - start

    assert move in board.legal_moves
    assert elapsed < LEVEL_BUDGET_SECONDS[level]
