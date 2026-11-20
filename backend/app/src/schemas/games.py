from datetime import datetime
from typing import Self

from pydantic import Field, computed_field, field_validator, model_validator
from pydantic_core import PydanticCustomError

from src.chesscom.parser.links import InvalidChessComInputError, parse_game_query
from src.enums import (
    GameResult,
    MoveCategory,
    PagingLimit,
    PlayerColor,
    SortGameBy,
    SortOrder,
    TimeClass,
)
from src.schemas.common import BaseSchema, QuerySchema

# Query Models ---------------------------------------------------------------

MIN_CHESS_COM_ARCHIVE_YEAR = 2007 # chess.com was founded in 2007, so there is no older monthly archives than this

class PlayerGameHistoryListQuery(QuerySchema):
    year: int | None = Field(
        default=None,
        ge=MIN_CHESS_COM_ARCHIVE_YEAR,
        examples=[2026],
        description="Archive year; last accessible if none"
    )
    month: int | None = Field(
        default=None,
        ge=1,
        le=12,
        examples=[10],
        description="Archive month; last accessible if none"
    )
    time_class: TimeClass | None = Field(
        default=None,
        examples=[TimeClass.BLITZ],
        description="Time class; all time classes if none"
    )
    sort_by: SortGameBy = Field(
        default=SortGameBy.MATCH_DATE_TIME,
        examples=[SortGameBy.MATCH_DATE_TIME],
        description="Sorting option; `avgRating` or `matchDateTime`"
    )
    sort_order: SortOrder = Field(
        default=SortOrder.DESC,
        examples=[SortOrder.DESC],
        description="Sort order of the page;"
    )
    paging_limit: PagingLimit = Field(
        default=PagingLimit.L50,
        examples=[PagingLimit.L50],
        description="Max number of games on a page"
    )
    page: int = Field(
        default=1,
        ge=1,
        examples=[3],
        description="Page number, starting at 1"
    )

    @model_validator(mode="after")
    def _year_and_month_together(self) -> Self:
        if (self.year is None) != (self.month is None):
            raise PydanticCustomError(
                "year_month_together", "Send both year and month, or neither of them."
            )
        return self


class PlayerGameSearchQuery(QuerySchema):
    """Finds one game of the player: GET .../games/?year=&month=&search={game_id|url}."""

    year: int | None = Field(
        default=None,
        ge=2007,
        examples=[2026],
        description="Archive year of the game; the latest archive month if omitted",
    )
    month: int | None = Field(
        default=None,
        ge=1,
        le=12,
        examples=[10],
        description="Archive month (1-12) of the game; required together with `year`",
    )
    search: str = Field(
        examples=["169586417316", "https://www.chess.com/game/live/169586417316"],
        description="Chess.com game id or game URL",
    )

    @field_validator("search")
    @classmethod
    def _to_game_id(cls, value: str) -> str:
        try:
            return parse_game_query(value)
        except InvalidChessComInputError as e:
            raise PydanticCustomError("invalid_game_search", str(e)) from e

    @model_validator(mode="after")
    def _year_and_month_together(self) -> PlayerGameSearchQuery:
        if (self.year is None) != (self.month is None):
            raise PydanticCustomError(
                "year_month_together", "Send both year and month, or neither of them."
            )
        return self

    @property
    def game_id(self) -> str:
        """Game id parsed from `search`."""
        return self.search


# Response Models ------------------------------------------------------------


class GameMemberResponse(BaseSchema):
    username: str
    rating: int


class GameResponse(BaseSchema):
    id: str
    url: str = Field(examples=["https://www.chess.com/game/live/169586417316"])
    time_class: TimeClass
    time_control: str = Field(
        examples=["180+2"], description="<base sec>[+<increment>]"
    )
    end_time: datetime = Field(description="UTC")
    rated: bool
    rules: str = Field(default="chess", examples=["chess"])
    color: PlayerColor
    result: GameResult
    player: GameMemberResponse
    opponent: GameMemberResponse

    @computed_field
    @property
    def avg_rating(self) -> float:
        return (self.player.rating + self.opponent.rating) / 2


class PaginatedGameListResponse(BaseSchema):
    year: int | None = Field(
        default=None,
        examples=[2026],
        description="Archive month of the games; null if the player has no games during this period"
    )
    month: int | None = Field(
        default=None,
        examples=[10],
    )
    items: list[GameResponse] = Field(
        description="Games found (current page)"
    )

    paging_limit: PagingLimit = PagingLimit.L15
    total_games: int = Field(
        ge=0,
        description="Total number of games played in the month (after timeClass filter)"
    )
    total_pages: int = Field(
        ge=0,
        description="Total number of pages; 0 when there are no games"
    )
    page: int = Field(ge=1)
    has_next: bool = Field(
        description="True if there is next page"
    )


class GameBoardDetailsResponse(GameResponse):
    """One game for the game page: players, result, and the moves to replay it."""

    pgn: str = Field(description="list of moves in Portable Game Notation (PGN)")
    initial_setup: str = Field(
        examples=["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
        description="Initial position setup in Forsyth-Edwards Notation (FEN)",
    )
    fen: str = Field(
        examples=["8/5pk1/6p1/8/1p4P1/4b2P/2Q1N2K/1q3q2 w - - 0 52"],
        description="Final position setup in Forsyth-Edwards Notation (FEN)",
    )


class MoveEvaluationResponse(BaseSchema):
    color: PlayerColor
    uci: str = Field(
        examples=["e8g8"], description="Move in Universal Chess Interface (UCI) format"
    )
    san: str = Field(
        examples=["Nf3"],
        description="Player half-move in Standard Algebraic Notation (SAN) format",
    )
    eval_cp: int = Field(
        examples=[-20], description="Player half-move score in centipawns"
    )
    best_move_san: str = Field(
        examples=["d4"], description="Best possible move predicted by Engine"
    )
    category: MoveCategory


class GameAnalysisResponse(BaseSchema):
    game_id: int = Field(examples=[1], description="Order number in the game list")
    game_url: str = Field(examples=["https://www.chess.com/game/live/169586417316"])
    engine: str = Field(examples=["Stockfish 17"])
    depth: int = Field(
        ge=1,
        description="How many half-moves (plies) ahead the engine looked in its primary search line",
    )
    moves: list[MoveEvaluationResponse]
