"""A small built-in evaluator, for analysing games without Stockfish (dev mode only).

It counts material and searches two half-moves ahead, then finishes the exchanges under way
(captures only), so it sees a piece left hanging, a piece won, and mates within reach. It
implements the analysis `Engine` protocol, so a game is analysed exactly as with Stockfish
(`evaluate_moves`, the same categories); only the numbers are rougher, and the review page
says so (`ENGINE_NAME`).
"""

import chess
import chess.engine

from src.analysis.stockfish import PositionAnalysis

ENGINE_NAME = "Built-in evaluator (approximate)"
SEARCH_DEPTH = 2  # half-moves searched in full
CAPTURE_DEPTH = 4  # then captures only, to finish exchanges

_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 300,
    chess.BISHOP: 310,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}
_MATE = 100_000  # a mate found `ply` half-moves away scores _MATE - ply
_MATE_THRESHOLD = _MATE - 1_000


class BasicEvaluator:
    """Analyses a position by a short alpha-beta search over material."""

    async def analyse(self, board: chess.Board) -> PositionAnalysis:
        score, best = _search(
            board.copy(stack=False), SEARCH_DEPTH, -_MATE - 1, _MATE + 1, 0
        )
        return PositionAnalysis(score=_pov_score(score, board.turn), best_move=best)


def _material(board: chess.Board) -> int:
    """Material balance in centipawns, from the side to move's point of view."""
    us, them = board.turn, not board.turn
    return sum(
        value * (len(board.pieces(piece, us)) - len(board.pieces(piece, them)))
        for piece, value in _VALUES.items()
    )


def _gain(board: chess.Board, move: chess.Move) -> int:
    """What a move wins at once: the piece taken, and a promotion."""
    victim = board.piece_at(move.to_square)
    gain = _VALUES[victim.piece_type] if victim else 0
    if board.is_en_passant(move):
        gain = _VALUES[chess.PAWN]
    if move.promotion:
        gain += _VALUES[move.promotion] - _VALUES[chess.PAWN]
    return gain


def _ordered(board: chess.Board, moves: list[chess.Move]) -> list[chess.Move]:
    """Most promising first (big captures and promotions), so the search cuts off early;
    ties keep a fixed order, so the same position always gets the same answer."""
    return sorted(moves, key=lambda move: (-_gain(board, move), move.uci()))


def _search(
    board: chess.Board, depth: int, alpha: int, beta: int, ply: int
) -> tuple[int, chess.Move | None]:
    """Negamax with alpha-beta: the score for the side to move, and its best move."""
    moves = list(board.legal_moves)
    if not moves:
        return (-(_MATE - ply) if board.is_check() else 0), None
    if depth == 0:
        return _captures(board, alpha, beta, CAPTURE_DEPTH), None
    best_score, best_move = -_MATE - 1, None
    for move in _ordered(board, moves):
        board.push(move)
        score = -_search(board, depth - 1, -beta, -alpha, ply + 1)[0]
        board.pop()
        if score > best_score:
            best_score, best_move = score, move
        alpha = max(alpha, score)
        if alpha >= beta:
            break
    return best_score, best_move


def _captures(board: chess.Board, alpha: int, beta: int, depth: int) -> int:
    """Quiescence: the side to move may stand pat or take; only captures are searched."""
    stand = _material(board)
    if depth == 0 or stand >= beta:
        return stand
    alpha = max(alpha, stand)
    captures = [move for move in board.legal_moves if board.is_capture(move)]
    for move in _ordered(board, captures):
        board.push(move)
        score = -_captures(board, -beta, -alpha, depth - 1)
        board.pop()
        if score >= beta:
            return score
        alpha = max(alpha, score)
    return alpha


def _pov_score(score: int, turn: chess.Color) -> chess.engine.PovScore:
    """A search score as python-chess's score, mates as mates (`Mate(n)`, n in moves)."""
    if abs(score) >= _MATE_THRESHOLD:
        moves = (_MATE - abs(score) + 1) // 2
        return chess.engine.PovScore(
            chess.engine.Mate(moves if score > 0 else -moves), turn
        )
    return chess.engine.PovScore(chess.engine.Cp(score), turn)
