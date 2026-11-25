"""Playing against the computer (In-Game Chess page).

Every request carries the position (FEN) and the player's move: the server checks the move,
plays it, lets the computer reply and returns the new position with the player's legal moves,
so the frontend needs no chess rules of its own.

The computer is Stockfish (`StockfishPlayer`, strength per level in `stockfish.toml`). In dev
mode without Stockfish installed, `BasicPlayer` plays instead, so the page can be developed
on any machine.

The position is all the server knows about the game, so threefold repetition cannot be
detected; the 50-move rule and insufficient material can.
"""

from typing import Protocol

import chess

from src.analysis.stockfish import StockfishConfig, StockfishEngine
from src.enums import ComputerLevel, GameStatus, PlayerColor
from src.schemas.computer import (
    ComputerMoveRequest,
    ComputerMoveResponse,
    PlayedMoveResponse,
)
from src.services.exceptions import ChessEngineUnavailableError


class ComputerPlayer(Protocol):
    """Chooses the computer's move; StockfishPlayer, BasicPlayer or a fake in tests."""

    async def choose_move(
        self, board: chess.Board, level: ComputerLevel
    ) -> chess.Move: ...


class StockfishPlayer:
    """Stockfish at the strength of the level; a new engine process per move."""

    def __init__(self, path: str | None, config: StockfishConfig) -> None:
        self._path = path
        self._config = config

    async def choose_move(self, board: chess.Board, level: ComputerLevel) -> chess.Move:
        async with StockfishEngine(self._path, self._config.engine) as engine:
            return await engine.play(board, self._config.play[level])


_PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}


class BasicPlayer:
    """Built-in fallback without Stockfish, for dev mode only (ignores the level).

    Mates in one when it can, otherwise takes the most valuable piece or promotes, otherwise
    gives check; among equally good moves it varies with the position.
    """

    async def choose_move(self, board: chess.Board, level: ComputerLevel) -> chess.Move:
        moves = sorted(board.legal_moves, key=lambda move: move.uci())
        if not moves:
            raise ChessEngineUnavailableError("No legal move to play")
        scores = [self._score(board, move) for move in moves]
        best = max(scores)
        candidates = [move for move, score in zip(moves, scores) if score == best]
        # same position -> same move (repeatable), different positions -> varied moves
        return candidates[sum(map(ord, board.board_fen())) % len(candidates)]

    @staticmethod
    def _score(board: chess.Board, move: chess.Move) -> int:
        gain = 0
        if board.is_en_passant(move):
            gain = _PIECE_VALUES[chess.PAWN]
        elif (victim := board.piece_at(move.to_square)) is not None:
            gain = _PIECE_VALUES[victim.piece_type]
        if move.promotion:
            gain += _PIECE_VALUES[move.promotion] - _PIECE_VALUES[chess.PAWN]

        board.push(move)
        mate, check = board.is_checkmate(), board.is_check()
        board.pop()
        if mate:
            return 1000
        return gain * 10 + (1 if check else 0)


async def play_move(
    request: ComputerMoveRequest, computer: ComputerPlayer
) -> ComputerMoveResponse:
    """Plays the player's move (already validated by the request) and the computer's reply."""
    board = request.board
    player_is_white = request.player_color == PlayerColor.WHITE

    player_move = None
    if request.move is not None:
        player_move = _play(board, chess.Move.from_uci(request.move))

    computer_move = None
    computer_to_move = board.turn != player_is_white
    if computer_to_move and _status(board) == GameStatus.PLAYING:
        move = await computer.choose_move(board.copy(), request.level)
        if move not in board.legal_moves:
            raise ChessEngineUnavailableError(
                f"The engine chose an illegal move {move}"
            )
        computer_move = _play(board, move)

    status = _status(board)
    players_turn = board.turn == player_is_white
    return ComputerMoveResponse(
        fen=board.fen(),
        player_move=player_move,
        computer_move=computer_move,
        turn=PlayerColor.WHITE if board.turn == chess.WHITE else PlayerColor.BLACK,
        legal_moves=(
            sorted(move.uci() for move in board.legal_moves)
            if status == GameStatus.PLAYING and players_turn
            else []
        ),
        check=board.is_check(),
        status=status,
        winner=_winner(board),
    )


def _play(board: chess.Board, move: chess.Move) -> PlayedMoveResponse:
    """Plays the move on the board and describes it."""
    played = PlayedMoveResponse(
        uci=move.uci(),
        san=board.san(move),
        from_square=chess.square_name(move.from_square),
        to_square=chess.square_name(move.to_square),
    )
    board.push(move)
    return played


def _status(board: chess.Board) -> GameStatus:
    if board.is_checkmate():
        return GameStatus.CHECKMATE
    if board.is_stalemate():
        return GameStatus.STALEMATE
    if board.is_insufficient_material() or board.can_claim_fifty_moves():
        return GameStatus.DRAW
    if board.is_seventyfive_moves() or board.is_fivefold_repetition():
        return GameStatus.DRAW
    return GameStatus.PLAYING


def _winner(board: chess.Board) -> PlayerColor | None:
    if not board.is_checkmate():
        return None
    # the side to move has been mated
    return PlayerColor.BLACK if board.turn == chess.WHITE else PlayerColor.WHITE
