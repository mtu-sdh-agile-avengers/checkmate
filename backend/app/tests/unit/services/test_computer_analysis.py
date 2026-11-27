"""Unit tests for analysing a game against the computer (In-Game Chess review)."""

import chess
import chess.engine
import pytest

from src.analysis.stockfish import PositionAnalysis, load_stockfish_config
from src.chesscom.parser.models import STANDARD_START_FEN
from src.enums import MoveCategory, PlayerColor
from src.schemas.computer import ComputerGameAnalysisRequest
from src.schemas.games import MoveEvaluationResponse
from src.services import computer_analysis
from src.services.computer_analysis import (
    BasicAnalyst,
    StockfishAnalyst,
    analyse_game,
    game_moves,
)
from src.services.exceptions import (
    ChessEngineUnavailableError,
    GameAnalysisUnavailableError,
)


def test_game_moves_lists_every_position_of_the_game():
    game = game_moves(["e2e4", "e7e5", "g1f3"])

    assert game.initial_fen == STANDARD_START_FEN
    assert [(move.ply, move.san, move.uci) for move in game.moves] == [
        (1, "e4", "e2e4"),
        (2, "e5", "e7e5"),
        (3, "Nf3", "g1f3"),
    ]
    assert (
        game.moves[-1].fen
        == "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"
    )
    assert len(game.fens) == 4


class FixedAnalyst:
    def __init__(self, best_move_san: str | None = "e4") -> None:
        self.games = []
        self.best_move_san = best_move_san

    async def analyse(self, game):
        self.games.append(game)
        move = MoveEvaluationResponse(
            ply=1,
            color=PlayerColor.WHITE,
            san="e4",
            uci="e2e4",
            fen=game.moves[0].fen,
            eval_cp=30,
            best_move_san=self.best_move_san,
            category=MoveCategory.BEST,
        )
        return "Fake engine", 7, [move]


class BrokenAnalyst:
    async def analyse(self, game):
        raise ChessEngineUnavailableError("Stockfish is not configured")


@pytest.mark.anyio
async def test_analyse_game_returns_the_engine_and_its_moves():
    analyst = FixedAnalyst()

    analysis = await analyse_game(ComputerGameAnalysisRequest(moves=["e2e4"]), analyst)

    assert (analysis.engine, analysis.depth, analysis.initial_fen) == (
        "Fake engine",
        7,
        STANDARD_START_FEN,
    )
    assert [move.san for move in analysis.moves] == ["e4"]
    assert analysis.moves[0].best_move_uci == "e2e4"  # for the arrow on the board
    assert analysis.moves[0].move_number == 1
    assert analyst.games[0].moves[0].uci == "e2e4"


@pytest.mark.parametrize(
    "best_move_san",
    [None, "Qh5"],  # unknown, or not a move of the position before (no arrow then)
)
@pytest.mark.anyio
async def test_a_best_move_that_cannot_be_read_has_no_uci(best_move_san):
    analysis = await analyse_game(
        ComputerGameAnalysisRequest(moves=["e2e4"]), FixedAnalyst(best_move_san)
    )

    assert analysis.moves[0].best_move_uci is None


@pytest.mark.anyio
async def test_an_engine_that_cannot_run_is_a_game_analysis_error():
    with pytest.raises(GameAnalysisUnavailableError):
        await analyse_game(ComputerGameAnalysisRequest(moves=["e2e4"]), BrokenAnalyst())


@pytest.mark.anyio
async def test_stockfish_analyst_runs_the_engine_once_for_the_whole_game(monkeypatch):
    calls = []

    class FakeStockfish:
        name = "Stockfish 17"

        async def analyse(self, board: chess.Board) -> PositionAnalysis:
            return PositionAnalysis(
                score=chess.engine.PovScore(chess.engine.Cp(20), chess.WHITE),
                best_move=next(
                    iter(sorted(board.legal_moves, key=lambda move: move.uci()))
                ),
            )

    async def fake_run_with_engine(path, settings, task):
        calls.append(path)
        return await task(FakeStockfish())

    monkeypatch.setattr(computer_analysis, "run_with_engine", fake_run_with_engine)
    config = load_stockfish_config()

    name, depth, moves = await StockfishAnalyst("/usr/games/stockfish", config).analyse(
        game_moves(["e2e4", "e7e5"])
    )

    assert (name, depth) == ("Stockfish 17", config.engine.depth)
    assert [move.san for move in moves] == ["e4", "e5"]
    assert calls == ["/usr/games/stockfish"]


@pytest.mark.anyio
async def test_basic_analyst_analyses_without_stockfish():
    name, depth, moves = await BasicAnalyst(load_stockfish_config()).analyse(
        game_moves(["f2f3", "e7e5", "g2g4", "d8h4"])
    )

    assert name == "Built-in evaluator (approximate)"
    assert depth == 2
    assert [move.category for move in moves][2:] == [
        MoveCategory.BLUNDER,
        MoveCategory.BEST,
    ]
    assert moves[3].mate_in == 0  # checkmate on the board
