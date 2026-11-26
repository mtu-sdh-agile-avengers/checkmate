from fastapi import APIRouter, Request

from src.api.v1.common import COMMON_RESPONSES
from src.dependencies import ComputerPlayerDep
from src.rate_limiting import limiter
from src.schemas.common import ErrorResponse
from src.schemas.computer import ComputerMoveRequest, ComputerMoveResponse
from src.services.computer import play_move

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
