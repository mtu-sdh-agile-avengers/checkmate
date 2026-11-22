"""Tests for Stockfish move evaluation and categorisation (CMG4-70).

Most tests use a fake engine with scripted evaluations, so they run without Stockfish.
The last test runs the real engine and is skipped unless STOCKFISH_PATH is set in
`.env` (or `stockfish` is on PATH).
"""

import shutil

import chess
import chess.engine
import pytest
from pydantic import ValidationError

from src.analysis.stockfish import (
    CategoryThresholds,
    EngineSettings,
    PositionAnalysis,
    StockfishConfig,
    StockfishEngine,
    categorize_move,
    evaluate_moves,
    load_stockfish_config,
)
from src.chesscom.parser import parse_pgn_moves
from src.config import get_config
from src.enums import MoveCategory, PlayerColor

FOOLS_MATE_PGN = "1. f3 e5 2. g4 Qh4# 0-1"

THRESHOLDS = CategoryThresholds(
    good_max_loss=50,
    inaccuracy_max_loss=100,
    blunder_min_loss=300,
    miss_winning_advantage=200,
    mate_score=10000,
)
CONFIG = StockfishConfig(
    engine=EngineSettings(depth=10, threads=1, hash_mb=16), categories=THRESHOLDS
)


class FakeEngine:
    """Returns scripted analyses, keyed by FEN; records which positions were asked."""

    def __init__(self, analyses: dict[str, PositionAnalysis]) -> None:
        self._analyses = analyses
        self.calls: list[str] = []

    async def analyse(self, board: chess.Board) -> PositionAnalysis:
        self.calls.append(board.fen())
        return self._analyses[board.fen()]


def _white_cp(cp: int, best_uci: str) -> PositionAnalysis:
    return PositionAnalysis(
        score=chess.engine.PovScore(chess.engine.Cp(cp), chess.WHITE),
        best_move=chess.Move.from_uci(best_uci),
    )


# Configuration ----------------------------------------------------------------------


def test_load_stockfish_config_from_repo_file():
    config = load_stockfish_config()

    assert config.engine.depth == 15
    assert config.engine.threads == 1
    assert config.engine.hash_mb == 128
    assert config.categories == THRESHOLDS


def test_load_stockfish_config_rejects_unknown_keys(tmp_path):
    path = tmp_path / "stockfish.toml"
    path.write_text(
        "[engine]\ndepth = 15\nthreads = 1\nhash_mb = 128\ndeph = 20\n"
        "[categories]\ngood_max_loss = 20\ninaccuracy_max_loss = 100\n"
        "blunder_min_loss = 300\nmiss_winning_advantage = 200\nmate_score = 10000\n"
    )

    with pytest.raises(ValidationError):  # "deph" is a typo of "depth"
        load_stockfish_config(path)


def test_stockfish_engine_without_path_raises():
    with pytest.raises(RuntimeError, match="STOCKFISH_PATH"):
        StockfishEngine(None, CONFIG.engine)


# Categories -------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("played_best_move", "best_cp", "played_cp", "expected"),
    [
        (True, 50, 40, MoveCategory.BEST),  # engine's top move, whatever the numbers
        (False, 50, 50, MoveCategory.GOOD),  # no loss
        (False, 50, 25, MoveCategory.GOOD),  # loss 25: not really a mistake
        (False, 50, 0, MoveCategory.GOOD),  # loss 50 (boundary)
        (False, 50, -1, MoveCategory.INACCURACY),  # loss 51
        (False, 50, -50, MoveCategory.INACCURACY),  # loss 100 (boundary)
        (False, 50, -51, MoveCategory.MISS),  # loss 101
        (False, 50, -249, MoveCategory.MISS),  # loss 299
        (False, 50, -250, MoveCategory.BLUNDER),  # loss 300 (boundary)
        (False, 9999, 0, MoveCategory.BLUNDER),  # missed a forced mate
        (False, 250, 150, MoveCategory.MISS),  # loss 100, but gave up a winning +250
        (False, 210, 195, MoveCategory.GOOD),  # below +200 now, but loss is tiny
        (False, 230, 190, MoveCategory.GOOD),  # below +200 now, loss 40 is still good
        (False, 500, 420, MoveCategory.INACCURACY),  # loss 80, still clearly winning
        (False, -100, -300, MoveCategory.MISS),  # loss 200 while already worse
    ],
)
def test_categorize_move(played_best_move, best_cp, played_cp, expected):
    category = categorize_move(
        played_best_move=played_best_move,
        best_cp=best_cp,
        played_cp=played_cp,
        thresholds=THRESHOLDS,
    )

    assert category == expected


# Evaluating a game ------------------------------------------------------------------


@pytest.fixture
def fools_mate():
    return parse_pgn_moves(FOOLS_MATE_PGN)


@pytest.fixture
def fools_mate_engine(fools_mate):
    start, after_f3, after_e5, after_g4, _mate = fools_mate.fens
    return FakeEngine(
        {
            start: _white_cp(30, "e2e4"),
            after_f3: _white_cp(-40, "e7e5"),
            after_e5: _white_cp(-50, "e2e4"),
            # Black to move and mates in 1
            after_g4: PositionAnalysis(
                score=chess.engine.PovScore(chess.engine.Mate(1), chess.BLACK),
                best_move=chess.Move.from_uci("d8h4"),
            ),
        }
    )


@pytest.mark.anyio
async def test_evaluate_moves_fools_mate(fools_mate, fools_mate_engine):
    evaluations = await evaluate_moves(fools_mate, fools_mate_engine, CONFIG)

    assert [e.san for e in evaluations] == ["f3", "e5", "g4", "Qh4#"]
    assert [e.uci for e in evaluations] == ["f2f3", "e7e5", "g2g4", "d8h4"]
    assert [e.color for e in evaluations] == [
        PlayerColor.WHITE,
        PlayerColor.BLACK,
        PlayerColor.WHITE,
        PlayerColor.BLACK,
    ]
    assert [e.best_move_san for e in evaluations] == ["e4", "e5", "e4", "Qh4#"]
    assert [e.category for e in evaluations] == [
        MoveCategory.INACCURACY,  # f3: +30 -> -40, loss 70
        MoveCategory.BEST,  # e5: engine's top move
        MoveCategory.BLUNDER,  # g4: allows mate in 1
        MoveCategory.BEST,  # Qh4#: engine's top move
    ]
    # evaluation after each move, from White's point of view
    assert [e.eval_cp for e in evaluations] == [-40, -50, -9999, -10000]


@pytest.mark.anyio
async def test_evaluate_moves_does_not_ask_engine_about_game_over_position(
    fools_mate, fools_mate_engine
):
    await evaluate_moves(fools_mate, fools_mate_engine, CONFIG)

    # 4 positions before the 4 moves; the final checkmate is scored without the engine
    assert fools_mate_engine.calls == fools_mate.fens[:4]


@pytest.mark.anyio
async def test_evaluate_moves_game_without_moves():
    engine = FakeEngine({})

    assert await evaluate_moves(parse_pgn_moves("*"), engine, CONFIG) == []


# Real Stockfish (skipped when it is not installed) ----------------------------------

STOCKFISH_PATH = get_config().stockfish_path or shutil.which("stockfish")


@pytest.mark.anyio
@pytest.mark.skipif(not STOCKFISH_PATH, reason="Stockfish is not installed")
async def test_real_stockfish_fools_mate(fools_mate):
    async with StockfishEngine(STOCKFISH_PATH, CONFIG.engine) as engine:
        evaluations = await evaluate_moves(fools_mate, engine, CONFIG)

        assert "Stockfish" in engine.name

    by_san = {e.san: e for e in evaluations}
    assert by_san["g4"].category == MoveCategory.BLUNDER  # allows mate in 1
    assert by_san["Qh4#"].category == MoveCategory.BEST
    assert by_san["Qh4#"].eval_cp == -10000  # White is checkmated
