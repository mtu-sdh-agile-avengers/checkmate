"""Tests for the built-in evaluator, used to analyse games in dev mode without Stockfish."""

import chess
import pytest

from src.analysis.basic import BasicEvaluator
from src.analysis.stockfish import evaluate_moves, load_stockfish_config
from src.enums import MoveCategory
from src.services.computer_analysis import game_moves

SCHOLARS_MATE_IN_ONE = (
    "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
)
# 1. e4 e5 2. Qg4 d5: the c8 bishop now sees the white queen on g4
QUEEN_LEFT_TO_THE_BISHOP = (
    "rnbqkbnr/ppp2ppp/8/3pp3/4P1Q1/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3"
)
# 1. e4 e5 2. Qh5 Nc6 3. Qxe5+?? Nxe5: the queen takes a pawn the knight defends
QUEEN_FOR_A_PAWN = ["e2e4", "e7e5", "d1h5", "b8c6", "h5e5", "c6e5"]
FOOLS_MATE = ["f2f3", "e7e5", "g2g4", "d8h4"]


@pytest.mark.anyio
async def test_finds_a_mate_in_one():
    analysis = await BasicEvaluator().analyse(chess.Board(SCHOLARS_MATE_IN_ONE))

    assert analysis.best_move == chess.Move.from_uci("h5f7")
    assert analysis.score.white().mate() == 1


@pytest.mark.anyio
async def test_takes_a_queen_left_hanging():
    board = chess.Board(QUEEN_LEFT_TO_THE_BISHOP)

    analysis = await BasicEvaluator().analyse(board)

    assert analysis.best_move == chess.Move.from_uci("c8g4")
    assert analysis.score.pov(chess.BLACK).score() >= 700
    assert (
        board.fen() == QUEEN_LEFT_TO_THE_BISHOP
    )  # the position given is left as it was


@pytest.mark.anyio
async def test_gives_the_same_answer_for_the_same_position():
    first = await BasicEvaluator().analyse(chess.Board())
    second = await BasicEvaluator().analyse(chess.Board())

    assert first.best_move == second.best_move
    assert first.score == second.score
    assert first.score.white().score() == 0  # nothing to win yet


@pytest.mark.anyio
async def test_a_game_analysed_with_it_flags_the_queen_thrown_away():
    evaluations = await evaluate_moves(
        game_moves(QUEEN_FOR_A_PAWN), BasicEvaluator(), load_stockfish_config()
    )

    queen_takes = evaluations[4]
    assert (queen_takes.san, queen_takes.category) == ("Qxe5+", MoveCategory.BLUNDER)
    assert queen_takes.best_move_san not in (None, "Qxe5+")
    knight_takes = evaluations[5]
    assert knight_takes.category in (MoveCategory.BEST, MoveCategory.GOOD)
    assert knight_takes.eval_cp <= -500  # Black is a queen up, near enough


@pytest.mark.anyio
async def test_a_game_analysed_with_it_sees_the_mate_coming():
    evaluations = await evaluate_moves(
        game_moves(FOOLS_MATE), BasicEvaluator(), load_stockfish_config()
    )

    g4 = evaluations[2]
    assert (g4.san, g4.mate_in, g4.category) == ("g4", -1, MoveCategory.BLUNDER)
    mate = evaluations[3]
    assert (mate.san, mate.mate_in, mate.category) == ("Qh4#", 0, MoveCategory.BEST)
