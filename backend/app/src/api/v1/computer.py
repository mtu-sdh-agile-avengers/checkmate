from fastapi import APIRouter, Request

from src.api.v1.common import COMMON_RESPONSES
from src.dependencies import ComputerPlayerDep, GameAnalystDep
from src.rate_limiting import limiter
from src.schemas.common import ErrorResponse
from src.schemas.computer import (
    ComputerGameAnalysisRequest,
    ComputerGameAnalysisResponse,
    ComputerMoveRequest,
    ComputerMoveResponse,
)
from src.services.computer import play_move
from src.services.computer_analysis import analyse_game

router = APIRouter(prefix="/computer", tags=["computer"], responses=COMMON_RESPONSES)


# POST /api/v1/computer/move
@router.post(
    "/move",
    summary="Play a move against the computer",
    description=(
        "In-Game Chess: send the current position (`fen`) and your move in UCI "
        "(`e2e4`); the server checks and plays it, lets the computer (Stockfish at the "
        "chosen `level`) reply, and returns the new position, both moves, your legal "
        "moves and the game status. Send no `move` to start a game: you get the legal "
        "moves, or the computer's first move when you play black."
    ),
    responses={
        422: {
            "description": "Invalid position, a move that is not allowed, not your turn, "
            "or the game is already over"
        },
        503: {
            "model": ErrorResponse,
            "description": "Chess engine unavailable: \"The computer can't play right now. "
            'Please try again"',
        },
    },
)
@limiter.limit("5/second")  # a quick player may move more than once a second
async def play_computer_move(
    request: Request, body: ComputerMoveRequest, computer: ComputerPlayerDep
) -> ComputerMoveResponse:
    return await play_move(body, computer)


# POST /api/v1/computer/analysis
@router.post(
    "/analysis",
    summary="Analyse a game against the computer",
    description=(
        "In-Game Chess review: send every move of a finished game in UCI, from the "
        "starting position. Each half-move comes back with the position after it (FEN), "
        "its evaluation in centipawns (White's point of view), a forced mate if there is "
        "one, the engine's best move in the position before it and a category (best / "
        "good / inaccuracy / miss / blunder), as for a Chess.com game "
        "(`GET .../games/analyze`). Stockfish analyses the game; in dev mode without "
        "Stockfish a built-in evaluator does, approximately (`engine` says which). "
        "Analysis takes a few seconds."
    ),
    responses={
        422: {
            "description": "A move that is not written in UCI or not allowed where it "
            "is played, or too many moves"
        },
        503: {
            "model": ErrorResponse,
            "description": 'Chess engine unavailable: "Error during loading a game. '
            'Please try again"',
        },
    },
)
@limiter.limit("1/second")
async def analyse_computer_game(
    request: Request, body: ComputerGameAnalysisRequest, analyst: GameAnalystDep
) -> ComputerGameAnalysisResponse:
    return await analyse_game(body, analyst)
