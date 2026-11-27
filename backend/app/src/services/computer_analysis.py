"""Analysing a game against the computer for its review page (In-Game Chess).

The client sends the whole game (every move from the starting position); each position is
analysed exactly like a Chess.com game's (`evaluate_moves`: an evaluation in centipawns, a
forced mate, the engine's best move and a category per move). By Stockfish, or, in dev mode
without Stockfish, by the built-in evaluator (`analysis/basic.py`), which is approximate.
"""

import asyncio
from typing import Protocol

import chess

from src.analysis.basic import ENGINE_NAME as BASIC_ENGINE_NAME
from src.analysis.basic import SEARCH_DEPTH as BASIC_DEPTH
from src.analysis.basic import BasicEvaluator
from src.analysis.stockfish import (
    StockfishConfig,
    StockfishEngine,
    evaluate_moves,
    run_with_engine,
)
from src.chesscom.parser.models import (
    STANDARD_START_FEN,
    ChessComGameMoves,
    ChessComMove,
)
from src.schemas.computer import (
    ComputerGameAnalysisRequest,
    ComputerGameAnalysisResponse,
    ComputerMoveEvaluationResponse,
)
from src.schemas.games import MoveEvaluationResponse
from src.services.exceptions import (
    ChessEngineUnavailableError,
    GameAnalysisUnavailableError,
)


class GameAnalyst(Protocol):
    """Analyses every move of a game; StockfishAnalyst, BasicAnalyst or a fake in tests."""

    async def analyse(
        self, game: ChessComGameMoves
    ) -> tuple[str, int, list[MoveEvaluationResponse]]:
        """Returns the engine's name, its search depth and one evaluation per move."""
        ...


class StockfishAnalyst:
    """Stockfish at the analysis depth of `stockfish.toml`; one engine process per game."""

    def __init__(self, path: str | None, config: StockfishConfig) -> None:
        self._path = path
        self._config = config

    async def analyse(
        self, game: ChessComGameMoves
    ) -> tuple[str, int, list[MoveEvaluationResponse]]:
        async def task(
            engine: StockfishEngine,
        ) -> tuple[str, list[MoveEvaluationResponse]]:
            return engine.name, await evaluate_moves(game, engine, self._config)

        name, moves = await run_with_engine(self._path, self._config.engine, task)
        return name, self._config.engine.depth, moves


class BasicAnalyst:
    """The built-in evaluator, for dev mode without Stockfish (approximate)."""

    def __init__(self, config: StockfishConfig) -> None:
        self._config = config

    async def analyse(
        self, game: ChessComGameMoves
    ) -> tuple[str, int, list[MoveEvaluationResponse]]:
        # The search is plain Python and takes a moment: off the server's event loop.
        moves = await asyncio.to_thread(
            asyncio.run, evaluate_moves(game, BasicEvaluator(), self._config)
        )
        return BASIC_ENGINE_NAME, BASIC_DEPTH, moves


def game_moves(moves: list[str]) -> ChessComGameMoves:
    """The game's positions from its moves in UCI (already checked to be legal)."""
    board = chess.Board()
    played = []
    for ply, uci in enumerate(moves, start=1):
        move = chess.Move.from_uci(uci)
        san = board.san(move)
        board.push(move)
        played.append(ChessComMove(ply=ply, san=san, uci=uci, fen=board.fen()))
    return ChessComGameMoves(initial_fen=STANDARD_START_FEN, moves=played)


def _best_move_uci(fen_before: str, best_move_san: str | None) -> str | None:
    """The engine's best move (SAN, in the position before the move) in UCI."""
    if best_move_san is None:
        return None
    try:
        return chess.Board(fen_before).parse_san(best_move_san).uci()
    except ValueError:
        return None  # not a move of that position: no arrow rather than a wrong one


async def analyse_game(
    request: ComputerGameAnalysisRequest, analyst: GameAnalyst
) -> ComputerGameAnalysisResponse:
    """Analyses every move of the game; an engine that cannot run is a 503."""
    game = game_moves(request.moves)
    try:
        engine, depth, moves = await analyst.analyse(game)
    except ChessEngineUnavailableError as e:
        raise GameAnalysisUnavailableError(str(e)) from e
    return ComputerGameAnalysisResponse(
        engine=engine,
        depth=depth,
        initial_fen=STANDARD_START_FEN,
        # game.fens: the start, then the position after each move, so [:-1] is the
        # position before each move
        moves=[
            ComputerMoveEvaluationResponse(
                **move.model_dump(exclude={"move_number"}),
                best_move_uci=_best_move_uci(before, move.best_move_san),
            )
            for before, move in zip(game.fens[:-1], moves, strict=True)
        ],
    )
