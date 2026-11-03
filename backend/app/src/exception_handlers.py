"""Maps external chess API errors to HTTP error responses.

Without these handlers any `ChessAPIError` raised by a service would end up as a generic
500 Internal Server Error. Every response has the same shape as FastAPI's own errors:
`{"detail": "<message for the end-user>"}`.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from loguru import logger

from src.chesscom.exceptions import (
    ChessAPIError,
    ChessAPINotFoundError,
    ChessAPIParseError,
    ChessAPIRateLimitError,
    ChessAPITooManyRetriesError,
    ChessAPIUnavailiableError,
)

CHESS_API_UNAVAILABLE_MESSAGE = "Chess.com is not available right now, try again later"
CHESS_API_BAD_RESPONSE_MESSAGE = "Chess.com returned an unexpected response"


def _not_found_message(request: Request) -> str:
    username = request.path_params.get("username")
    if username:
        return f"{username} player data is not available / does not exist"
    return "Requested Chess.com data is not available / does not exist"


async def chess_api_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Converts a ChessAPIError (and its subclasses) into a JSON error response."""
    match exc:
        case ChessAPINotFoundError():
            status_code = status.HTTP_404_NOT_FOUND
            detail = _not_found_message(request)
        case (
            ChessAPIRateLimitError()
            | ChessAPIUnavailiableError()
            | ChessAPITooManyRetriesError()
        ):
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            detail = CHESS_API_UNAVAILABLE_MESSAGE
        case ChessAPIParseError():
            status_code = status.HTTP_502_BAD_GATEWAY
            detail = CHESS_API_BAD_RESPONSE_MESSAGE
        case _:
            status_code = status.HTTP_502_BAD_GATEWAY
            detail = CHESS_API_BAD_RESPONSE_MESSAGE

    logger.warning(
        f"{request.method} {request.url.path} -> {status_code}: {detail} "
        f"({type(exc).__name__}: {exc})"
    )
    return JSONResponse(status_code=status_code, content={"detail": detail})


def register_exception_handlers(app: FastAPI) -> None:
    """Registers all custom exception handlers on the app."""
    # One handler for the base class also catches all of its subclasses.
    app.add_exception_handler(ChessAPIError, chess_api_error_handler)
