"""Move evaluation with Stockfish (CMG4-70).

Takes the moves produced by the PGN parser (`parse_pgn_moves`, CMG4-72) and gives every
move a centipawn evaluation and a category (best / good / inaccuracy / miss / blunder).

Usage in a service (`run_with_engine` starts and stops the engine, also on Windows):

    moves = parse_pgn_moves(game.pgn)
    config = load_stockfish_config()
    evaluations = await run_with_engine(
        get_config().stockfish_path,
        config.engine,
        lambda engine: evaluate_moves(moves, engine, config),
    )

How a move is categorised: every position is analysed once. For a move, the position
BEFORE it says how good the engine's best move was; the position AFTER it says how good
the played move was. The difference (from the mover's point of view) is the
centipawn loss, compared against the thresholds in `stockfish.toml`.
"""

import asyncio
import sys
import tomllib
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from types import TracebackType
from typing import Protocol, Self

import chess
import chess.engine
from pydantic import BaseModel, ConfigDict, Field

from src.chesscom.parser.models import ChessComGameMoves
from src.enums import ComputerLevel, MoveCategory, PlayerColor
from src.schemas.games import MoveEvaluationResponse
from src.services.exceptions import ChessEngineUnavailableError

# backend/app/stockfish.toml (this file is backend/app/src/analysis/stockfish.py)
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[2] / "stockfish.toml"


# Configuration (stockfish.toml) ----------------------------------------------------


class _FrozenModel(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")  # typos in the file fail


class EngineSettings(_FrozenModel):
    depth: int = Field(ge=1)
    threads: int = Field(ge=1)
    hash_mb: int = Field(ge=1)


class CategoryThresholds(_FrozenModel):
    good_max_loss: int = Field(ge=0)
    inaccuracy_max_loss: int = Field(ge=0)
    blunder_min_loss: int = Field(ge=0)
    miss_winning_advantage: int = Field(ge=0)
    mate_score: int = Field(ge=1)


class PlayLevelSettings(_FrozenModel):
    """How strongly the computer plays at one level of the In-Game Chess page."""

    skill_level: int = Field(ge=0, le=20)  # Stockfish "Skill Level": 0 weakest, 20 full
    depth: int = Field(ge=1)  # plies searched per move
    movetime_ms: int = Field(ge=1)  # time limit per move, whichever comes first


class StockfishConfig(_FrozenModel):
    engine: EngineSettings
    categories: CategoryThresholds
    play: dict[ComputerLevel, PlayLevelSettings]


@lru_cache
def load_stockfish_config(path: Path = DEFAULT_CONFIG_PATH) -> StockfishConfig:
    """Loads and validates `stockfish.toml` (cached: the file is read only once)."""
    with path.open("rb") as file:
        return StockfishConfig.model_validate(tomllib.load(file))


# Engine ----------------------------------------------------------------------------


@dataclass(frozen=True)
class PositionAnalysis:
    """Engine verdict on one position."""

    score: chess.engine.PovScore  # evaluation of the position (either point of view)
    best_move: chess.Move | None  # None when the game is over in this position


class Engine(Protocol):
    """Anything that can analyse a position; StockfishEngine, or a fake in tests."""

    async def analyse(self, board: chess.Board) -> PositionAnalysis: ...


class StockfishEngine:
    """Runs a Stockfish process for the duration of an `async with` block."""

    def __init__(self, path: str | None, settings: EngineSettings) -> None:
        if not path:
            raise ChessEngineUnavailableError(
                "Stockfish is not configured: set STOCKFISH_PATH in .env"
            )
        self._path = path
        self._settings = settings
        self._engine: chess.engine.UciProtocol | None = None

    async def __aenter__(self) -> Self:
        try:
            _, self._engine = await chess.engine.popen_uci(self._path)
            await self._engine.configure(
                {"Threads": self._settings.threads, "Hash": self._settings.hash_mb}
            )
        except (
            OSError,
            NotImplementedError,  # the event loop cannot start processes
            chess.engine.EngineError,
            chess.engine.EngineTerminatedError,
        ) as e:
            raise ChessEngineUnavailableError(f"Cannot start Stockfish: {e!r}") from e
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if self._engine is not None:
            await self._engine.quit()
            self._engine = None

    @property
    def name(self) -> str:
        """Engine name reported by the program, e.g. "Stockfish 17"."""
        return self._require_engine().id.get("name", "Stockfish")

    async def analyse(self, board: chess.Board) -> PositionAnalysis:
        engine = self._require_engine()
        try:
            info = await engine.analyse(
                board, chess.engine.Limit(depth=self._settings.depth)
            )
        except (chess.engine.EngineError, chess.engine.EngineTerminatedError) as e:
            raise ChessEngineUnavailableError(f"Stockfish failed: {e}") from e
        pv = info.get("pv") or []
        return PositionAnalysis(score=info["score"], best_move=pv[0] if pv else None)

    async def play(self, board: chess.Board, level: PlayLevelSettings) -> chess.Move:
        """The computer's move in `board` at the given strength (In-Game Chess)."""
        engine = self._require_engine()
        try:
            await engine.configure({"Skill Level": level.skill_level})
            result = await engine.play(
                board,
                chess.engine.Limit(depth=level.depth, time=level.movetime_ms / 1000),
            )
        except (chess.engine.EngineError, chess.engine.EngineTerminatedError) as e:
            raise ChessEngineUnavailableError(f"Stockfish failed: {e}") from e
        if result.move is None:
            raise ChessEngineUnavailableError("Stockfish returned no move")
        return result.move

    def _require_engine(self) -> chess.engine.UciProtocol:
        if self._engine is None:
            raise RuntimeError("StockfishEngine must be used inside 'async with'")
        return self._engine


async def run_with_engine[T](
    path: str | None,
    settings: EngineSettings,
    task: Callable[[StockfishEngine], Awaitable[T]],
) -> T:
    """Starts Stockfish, runs `task(engine)` and stops the engine again.

    Use this instead of `async with StockfishEngine(...)` in request handlers. Starting the
    engine needs an event loop that can run processes, and on Windows the dev server
    (`fastapi dev` / `uvicorn --reload`) runs a SelectorEventLoop that cannot
    (NotImplementedError). There the engine runs in a worker thread on its own
    ProactorEventLoop instead.
    """

    async def session() -> T:
        async with StockfishEngine(path, settings) as engine:
            return await task(engine)

    if _loop_can_start_processes():
        return await session()
    return await asyncio.to_thread(
        asyncio.run, session(), loop_factory=_process_loop_factory()
    )


def _loop_can_start_processes() -> bool:
    """False on Windows when the running loop is not a ProactorEventLoop."""
    if sys.platform != "win32":
        return True
    return isinstance(asyncio.get_running_loop(), asyncio.ProactorEventLoop)


def _process_loop_factory() -> Callable[[], asyncio.AbstractEventLoop] | None:
    """The Windows loop that can start processes; None (the default loop) elsewhere."""
    return getattr(asyncio, "ProactorEventLoop", None)


# Evaluation ------------------------------------------------------------------------


def categorize_move(
    *,
    played_best_move: bool,
    best_cp: int,
    played_cp: int,
    thresholds: CategoryThresholds,
) -> MoveCategory:
    """Categorises one move; `best_cp` / `played_cp` are from the mover's point of view.

    best_cp: evaluation after the engine's best move.
    played_cp: evaluation after the move that was actually played.
    """
    if played_best_move:
        return MoveCategory.BEST

    loss = max(0, best_cp - played_cp)

    if loss >= thresholds.blunder_min_loss:
        return MoveCategory.BLUNDER
    if loss <= thresholds.good_max_loss:
        return MoveCategory.GOOD

    gave_up_a_win = (
        best_cp >= thresholds.miss_winning_advantage
        and played_cp < thresholds.miss_winning_advantage
    )
    if gave_up_a_win or loss > thresholds.inaccuracy_max_loss:
        return MoveCategory.MISS
    return MoveCategory.INACCURACY


async def _analyse_position(board: chess.Board, engine: Engine) -> PositionAnalysis:
    """Game-over positions are scored directly; Stockfish has no move to search there."""
    if board.is_checkmate():
        # the side to move has been mated
        return PositionAnalysis(
            score=chess.engine.PovScore(chess.engine.Mate(0), board.turn),
            best_move=None,
        )
    if board.is_game_over():
        # stalemate, insufficient material, 75-move rule, fivefold repetition
        return PositionAnalysis(
            score=chess.engine.PovScore(chess.engine.Cp(0), board.turn),
            best_move=None,
        )
    return await engine.analyse(board)


async def evaluate_moves(
    game_moves: ChessComGameMoves, engine: Engine, config: StockfishConfig
) -> list[MoveEvaluationResponse]:
    """Evaluates every move of a game; returns one entry per half-move, in order.

    `evalCp` is the evaluation AFTER the move from White's point of view (positive =
    White is better), like an evaluation bar; the category uses the mover's view.
    """
    if not game_moves.moves:
        return []  # nothing to evaluate (e.g. an aborted game)

    mate_score = config.categories.mate_score
    boards = [chess.Board(fen) for fen in game_moves.fens]  # start + after every move
    analyses = [await _analyse_position(board, engine) for board in boards]

    evaluations = []
    # boards / analyses have one more entry than moves: the final position
    for move, board_before, before, after in zip(
        game_moves.moves, boards[:-1], analyses[:-1], analyses[1:], strict=True
    ):
        mover = board_before.turn
        played = chess.Move.from_uci(move.uci)
        best = before.best_move or played

        evaluations.append(
            MoveEvaluationResponse(
                ply=move.ply,
                fen=move.fen,
                mate_in=after.score.white().mate(),
                color=PlayerColor.WHITE if mover == chess.WHITE else PlayerColor.BLACK,
                uci=move.uci,
                san=move.san,
                eval_cp=after.score.white().score(mate_score=mate_score),
                best_move_san=board_before.san(best),
                category=categorize_move(
                    played_best_move=played == best,
                    best_cp=before.score.pov(mover).score(mate_score=mate_score),
                    played_cp=after.score.pov(mover).score(mate_score=mate_score),
                    thresholds=config.categories,
                ),
            )
        )
    return evaluations
