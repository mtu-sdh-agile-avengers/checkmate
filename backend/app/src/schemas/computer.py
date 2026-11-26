"""Request / response of playing against the computer (In-Game Chess page)."""

import re
from typing import Self

import chess
from pydantic import ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from src.chesscom.parser.models import STANDARD_START_FEN
from src.enums import ComputerLevel, GameStatus, PlayerColor
from src.schemas.common import BaseSchema

_UCI_MOVE_RE = re.compile(r"^[a-h][1-8][a-h][1-8][qrbn]?$")


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
