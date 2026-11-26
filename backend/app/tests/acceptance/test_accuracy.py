"""NFR accuracy: the numbers and moves we show are right.

- win likelihood = the Elo expected score, to 4 decimal places;
- the summary's counts, win rate and rating agree with each other;
- the computer never makes an illegal move and the game result is always right
  (checked against python-chess over complete random games);
- Stockfish at the expert level finds forced mates;
- the analysis marks a known blunder as a blunder and the mate as the best move.
"""

import random

import chess
import pytest

from src.analysis.stockfish import (
    evaluate_moves,
    load_stockfish_config,
    run_with_engine,
)
from src.chesscom.parser.parser import parse_pgn_moves
from src.enums import ComputerLevel, GameStatus, MoveCategory, PlayerColor
from src.schemas.computer import ComputerMoveRequest
from src.services.computer import BasicPlayer, StockfishPlayer, play_move
from src.services.processing.win_likelihood import expected_score
from tests.acceptance.conftest import STOCKFISH_PATH, requires_stockfish


@pytest.mark.parametrize(
    ("difference", "expected"),
    [(0, 0.5), (100, 0.6401), (200, 0.7597), (400, 0.9091), (800, 0.9901)],
)
def test_win_likelihood_matches_the_elo_formula(difference, expected):
    assert expected_score(1500 + difference, 1500) == pytest.approx(expected, abs=1e-4)
    assert expected_score(1500, 1500 + difference) == pytest.approx(
        1 - expected, abs=1e-4
    )


def test_summary_numbers_agree_with_each_other(app_client):
    for period in ["1", "7", "30", "all"]:
        body = app_client.get(
            "/api/v1/players/hikaru/summary",
            params={"period": period, "timeClass": "blitz"},
        ).json()
        total = body["wins"] + body["losses"] + body["draws"]

        assert body["totalGamesPlayed"] == total
        if total:
            assert body["winRate"] == pytest.approx(body["wins"] / total, abs=1e-4)
        if body["ratingHistory"]:
            assert body["ratingHistory"][-1]["rating"] == body["rating"]["current"]


class RandomPlayer:
    """Plays a random legal move: reaches checkmates, stalemates and draws quickly."""

    def __init__(self, seed: int) -> None:
        self._random = random.Random(seed)

    async def choose_move(self, board: chess.Board, level: ComputerLevel) -> chess.Move:
        return self._random.choice(list(board.legal_moves))


@pytest.mark.anyio
@pytest.mark.parametrize("seed", range(12))
async def test_whole_games_follow_the_rules(seed):
    """The player picks random legal moves, the computer answers, until the game ends."""
    player = random.Random(seed)
    computer = BasicPlayer() if seed % 2 else RandomPlayer(seed)
    color = PlayerColor.WHITE if seed % 3 else PlayerColor.BLACK
    reference = chess.Board()
    state = await play_move(ComputerMoveRequest(player_color=color), computer)

    for _ in range(300):
        if state.computer_move is not None:
            reference.push_uci(state.computer_move.uci)
        assert state.fen == reference.fen()
        if state.status != GameStatus.PLAYING:
            break
        assert sorted(state.legal_moves) == sorted(
            m.uci() for m in reference.legal_moves
        )
        move = player.choice(state.legal_moves)
        reference.push_uci(move)
        request = ComputerMoveRequest(fen=state.fen, move=move, player_color=color)
        state = await play_move(request, computer)
        assert state.player_move.uci == move

    if state.status == GameStatus.CHECKMATE:
        assert reference.is_checkmate()
        loser = (
            PlayerColor.WHITE if reference.turn == chess.WHITE else PlayerColor.BLACK
        )
        assert state.winner != loser
    elif state.status == GameStatus.STALEMATE:
        assert reference.is_stalemate()
    elif state.status == GameStatus.DRAW:
        assert reference.is_insufficient_material() or reference.can_claim_fifty_moves()


MATES = [
    # mate in 1: Qh5xf7#
    ("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", "h5f7"),
    # mate in 2 (back rank): 1. Qd8+ Rxd8 2. Rxd8#
    ("3r2k1/5ppp/8/8/8/8/3Q1PPP/3R2K1 w - - 0 1", None),
]


@pytest.mark.anyio
@requires_stockfish
@pytest.mark.parametrize(("fen", "first_move"), MATES)
async def test_the_expert_finds_forced_mates(fen, first_move):
    player = StockfishPlayer(STOCKFISH_PATH, load_stockfish_config())
    board = chess.Board(fen)

    for _ in range(3):
        move = await player.choose_move(board, ComputerLevel.EXPERT)
        if first_move is not None and board.ply() == chess.Board(fen).ply():
            assert move.uci() == first_move
        board.push(move)
        if board.is_checkmate():
            break
        # the defender's best reply
        reply = await player.choose_move(board, ComputerLevel.EXPERT)
        board.push(reply)

    assert board.is_checkmate()


@pytest.mark.anyio
@requires_stockfish
async def test_the_analysis_finds_the_blunder_and_the_mate():
    config = load_stockfish_config()
    moves = parse_pgn_moves("1. f3 e5 2. g4 Qh4# 0-1")

    evaluations = await run_with_engine(
        STOCKFISH_PATH,
        config.engine,
        lambda engine: evaluate_moves(moves, engine, config),
    )

    by_san = {e.san: e.category for e in evaluations}
    assert by_san["g4"] == MoveCategory.BLUNDER
    assert by_san["Qh4#"] == MoveCategory.BEST
