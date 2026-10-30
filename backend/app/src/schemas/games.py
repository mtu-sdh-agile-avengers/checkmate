from datetime import datetime

from pydantic import Field, computed_field

from app.src.enums import GameResult, MoveCategory, PagingLimit, PlayerColor, SortGameBy, SortOrder, TimeClass
from app.src.schemas.common import BaseSchema, QuerySchema


# Query Models ---------------------------------------------------------------

class PlayerGameHistoryListQuery(QuerySchema):
    year: int | None = Field(default=None, description="Archive year; last accessible if none")
    month: int | None = Field(default=None, description="Archive moth; last accessible if none")
    time_class: TimeClass | None = Field(default=None, description="Includes all time classes if none")
    sort_by: SortGameBy | None = SortGameBy.MATCH_DATE_TIME
    sort_order: SortOrder | None = SortOrder.DESC
    paging_limit: PagingLimit = PagingLimit.L15
    page: int = Field(default=1, ge=1)
    
class PlayerGameSearchQuery(QuerySchema):
    year: int | None = Field(default=None, description="Archive year; last accessible if none")
    month: int | None = Field(default=None, description="Archive moth; last accessible if none")
    game_id: str = Field(examples=["169586417316"], description="Chess.com game id: trailing number in URL")
    
    
# Response Models ------------------------------------------------------------ 

class GameMemberResponse(BaseSchema):
    username: str
    rating: int
    
class GameResponse(BaseSchema):
    id: str
    url: str = Field(examples=["https://www.chess.com/game/live/169586417316"])
    time_class: TimeClass
    time_control: str = Field(examples=["180+2"], description="<base sec>[+<increment>]")
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
    year: int | None = Field(default=None)
    month: int | None = Field(default=None)
    items: list[GameResponse]
    
    paging_limit: PagingLimit = PagingLimit.L15
    total_games: int = Field(ge=0)
    total_pages: int = Field(ge=0) 
    page: int = Field(ge=1)
    has_more: bool
    
    
class GameBoardDetailsResponse(GameResponse):
    pgn: str = Field(description="list of moves in Portable Game Notation (PGN)")
    initial_setup: str = Field(examples=["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"], description="Initial position setup in Forsyth-Edwards Notation (FEN)")
    fen: str = Field(examples=["8/5pk1/6p1/8/1p4P1/4b2P/2Q1N2K/1q3q2 w - - 0 52"], description="Final position setup in Forsyth-Edwards Notation (FEN)")
    
class MoveEvaluationResponse(BaseSchema):
    color: PlayerColor
    uci: str = Field(examples=["e8g8"], description="Move in Universal Chess Interface (UCI) format")
    san: str = Field(examples=["Nf3"], description="Player half-move in Standard Algebraic Notation (SAN) format")
    eval_cp: int = Field(examples=[-20], description="Player half-move score in centipawns")
    best_move_san: str = Field(examples=["d4"], description="Best possible move predicted by Engine")
    category: MoveCategory

class GameAnalysisResponse(BaseSchema):
    game_id: int = Field(examples=[1], description="Order number in the game list")
    game_url: str = Field(examples=["https://www.chess.com/game/live/169586417316"])
    engine: str = Field(examples=["Stockfish 17"])
    depth: int = Field(ge=1, description="How many half-moves (plies) ahead the engine looked in its primary search line")
    moves: list[MoveEvaluationResponse]