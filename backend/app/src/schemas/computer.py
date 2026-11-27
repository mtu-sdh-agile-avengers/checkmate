"""Request / response of playing against the computer (In-Game Chess page)."""

import re
from typing import Self

import chess
from pydantic import ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from src.chesscom.parser.models import STANDARD_START_FEN
from src.enums import ComputerLevel, GameStatus, PlayerColor
from src.schemas.common import BaseSchema
from src.schemas.games import MoveEvaluationResponse

_UCI_MOVE_RE = re.compile(r"^[a-h][1-8][a-h][1-8][qrbn]?$")

# Half-moves of one game the analysis takes: a long game has about 200.
MAX_ANALYSED_MOVES = 600


class ComputerMoveRequest(BaseSchema):
    """The game so far (a position) and the player's next move.

    The client keeps the position: it sends the FEN it got from the last response.
    """

    model_config = ConfigDict(extra="forbid")

    fen: str = Field(
        default=STANDARD_START_FEN,
        examples=[STANDARD_START_FEN],
        description="Position before the move (FEN); the starting position by default",
    )
    move: str | None = Field(
        default=None,
        examples=["e2e4"],
        description=(
            "The player's move in UCI (`e2e4`, promotion `e7e8q`); null to start a game: "
            "the response then has the legal moves, or the computer's first move when "
            "the player plays black"
        ),
    )
    level: ComputerLevel = Field(
        default=ComputerLevel.INTERMEDIATE,
        description="How strongly the computer plays",
    )
    player_color: PlayerColor = Field(
        default=PlayerColor.WHITE, description="The side the player plays"
    )

    @field_validator("fen")
    @classmethod
    def _valid_position(cls, value: str) -> str:
        try:
            board = chess.Board(value.strip())
        except ValueError as e:
            raise PydanticCustomError(
                "invalid_fen", "The position (FEN) is not valid."
            ) from e
        if not board.is_valid():
            raise PydanticCustomError(
                "invalid_fen", "The position (FEN) is not a legal chess position."
            )
        return board.fen()

    @field_validator("move")
    @classmethod
    def _uci_format(cls, value: str | None) -> str | None:
        if value is None:
            return None
        move = value.strip().lower()
        if not _UCI_MOVE_RE.match(move):
            raise PydanticCustomError(
                "invalid_move", "Moves are written like e2e4 (or e7e8q to promote)."
            )
        return move

    @model_validator(mode="after")
    def _legal_move(self) -> Self:
        if self.move is None:
            return self
        board = self.board
        if board.is_game_over(claim_draw=True):
            raise PydanticCustomError("game_over", "The game is already over.")
        if board.turn != (self.player_color == PlayerColor.WHITE):
            raise PydanticCustomError("not_your_turn", "It is not your turn.")
        if chess.Move.from_uci(self.move) not in board.legal_moves:
            raise PydanticCustomError(
                "illegal_move", "This move is not allowed in this position."
            )
        return self

    @property
    def board(self) -> chess.Board:
        """A new board with the request's position."""
        return chess.Board(self.fen)


class PlayedMoveResponse(BaseSchema):
    uci: str = Field(examples=["e2e4"])
    san: str = Field(examples=["e4"], description="Standard Algebraic Notation")
    from_square: str = Field(examples=["e2"])
    to_square: str = Field(examples=["e4"])


class ComputerMoveResponse(BaseSchema):
    """The game after the player's move and the computer's reply."""

    fen: str = Field(description="Current position (FEN): send it with the next move")
    player_move: PlayedMoveResponse | None = Field(
        description="The player's move; null when the request had no move"
    )
    computer_move: PlayedMoveResponse | None = Field(
        description="The computer's reply; null if it was not its turn or the game is over"
    )
    turn: PlayerColor = Field(description="Side to move now")
    legal_moves: list[str] = Field(
        examples=[["e2e4", "g1f3"]],
        description="The player's legal moves in UCI; empty when the game is over",
    )
    check: bool = Field(description="The side to move is in check")
    status: GameStatus
    winner: PlayerColor | None = Field(
        description="Who won by checkmate; null while playing or after a draw"
    )


class ComputerGameAnalysisRequest(BaseSchema):
    """A whole game against the computer, to analyse for its review page."""

    model_config = ConfigDict(extra="forbid")

    moves: list[str] = Field(
        max_length=MAX_ANALYSED_MOVES,
        examples=[["e2e4", "e7e5", "g1f3"]],
        description=(
            "Every move of the game in UCI (`e2e4`, promotion `e7e8q`), in order, from "
            "the starting position"
        ),
    )

    @field_validator("moves")
    @classmethod
    def _uci_format(cls, moves: list[str]) -> list[str]:
        written = [move.strip().lower() for move in moves]
        for number, move in enumerate(written, start=1):
            if not _UCI_MOVE_RE.match(move):
                raise PydanticCustomError(
                    "invalid_move",
                    "Move {number} ({move}) is not written like e2e4 (or e7e8q to promote).",
                    {"number": number, "move": move},
                )
        return written

    @model_validator(mode="after")
    def _legal_game(self) -> Self:
        board = chess.Board()
        for number, uci in enumerate(self.moves, start=1):
            move = chess.Move.from_uci(uci)
            if move not in board.legal_moves:
                raise PydanticCustomError(
                    "illegal_move",
                    "Move {number} ({move}) is not allowed in its position.",
                    {"number": number, "move": uci},
                )
            board.push(move)
        return self


class ComputerMoveEvaluationResponse(MoveEvaluationResponse):
    """One half-move of a game against the computer with the engine's verdict."""

    best_move_uci: str | None = Field(
        default=None,
        examples=["g1f3"],
        description=(
            "`bestMoveSan` in UCI, for an arrow on the board from its square to its "
            "target; null if unknown"
        ),
    )


class ComputerGameAnalysisResponse(BaseSchema):
    """Engine analysis of every move of a game against the computer (review page)."""

    engine: str = Field(
        examples=["Stockfish 17"],
        description=(
            'The engine that analysed the game; "Built-in evaluator (approximate)" in dev '
            "mode without Stockfish"
        ),
    )
    depth: int = Field(
        ge=1,
        examples=[15],
        description="How many half-moves (plies) ahead the engine looked",
    )
    initial_fen: str = Field(
        examples=[STANDARD_START_FEN],
        description="Position before the first move (FEN)",
    )
    moves: list[ComputerMoveEvaluationResponse] = Field(
        description=(
            "Every half-move in order: the position after it, its evaluation (centipawns, "
            "White's view), a forced mate if there is one, the engine's best move in the "
            "position before it and a category (best / good / inaccuracy / miss / blunder)"
        )
    )
