"""NFR memory: the server does not leak memory, processes or open files.

- 300 API requests (after a warm-up) grow the Python heap by less than 1 MiB;
- every computer move closes its Stockfish process and its pipes again.
"""

import gc
import tracemalloc
from collections.abc import Callable

import chess
import psutil
import pytest

from src.analysis.stockfish import load_stockfish_config
from src.enums import ComputerLevel
from src.services.computer import StockfishPlayer
from tests.acceptance.conftest import STOCKFISH_PATH, requires_stockfish

HEAP_BUDGET_BYTES = 1024 * 1024


def heap_growth(
    action: Callable[[], object], warmup: int = 50, repeats: int = 300
) -> int:
    """Bytes the Python heap grew by over `repeats` calls of `action`."""
    for _ in range(warmup):
        action()
    gc.collect()
    tracemalloc.start()
    try:
        before = tracemalloc.get_traced_memory()[0]
        for _ in range(repeats):
            action()
        gc.collect()
        return tracemalloc.get_traced_memory()[0] - before
    finally:
        tracemalloc.stop()


@pytest.mark.parametrize(
    ("method", "path", "data"),
    [
        (
            "get",
            "/api/v1/players/hikaru/summary",
            {"period": "30", "timeClass": "blitz"},
        ),
        ("get", "/api/v1/players/hikaru/games/list", {"year": 2026, "month": 10}),
        (
            "get",
            "/api/v1/players/compare",
            {"p1": "hikaru", "p2": "magnus", "timeClass": "blitz"},
        ),
        ("post", "/api/v1/computer/move", {"move": "e2e4"}),
    ],
)
def test_repeated_requests_do_not_leak_memory(app_client, method, path, data):
    def request():
        if method == "post":
            response = app_client.post(path, json=data)
        else:
            response = app_client.get(path, params=data)
        assert response.status_code == 200

    assert heap_growth(request) < HEAP_BUDGET_BYTES


def open_resources(process: psutil.Process) -> int:
    """Open files / pipes (Linux, macOS) or handles (Windows) of the process."""
    if hasattr(process, "num_fds"):
        return process.num_fds()
    return process.num_handles()


@pytest.mark.anyio
@requires_stockfish
async def test_stockfish_processes_and_pipes_are_closed_after_each_move():
    me = psutil.Process()
    player = StockfishPlayer(STOCKFISH_PATH, load_stockfish_config())
    board = chess.Board()
    await player.choose_move(board, ComputerLevel.BEGINNER)  # warm-up
    resources_before = open_resources(me)

    for _ in range(15):
        move = await player.choose_move(board, ComputerLevel.BEGINNER)
        board.push(move)
        if board.is_game_over():
            board.reset()

    engines = [
        p for p in me.children(recursive=True) if "stockfish" in p.name().lower()
    ]
    assert engines == []
    assert open_resources(me) <= resources_before + 2
