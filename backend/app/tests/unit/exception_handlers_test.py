"""Tests for mapping Chess.com errors to HTTP responses."""

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from src.chesscom.exceptions import (
    ChessAPIError,
    ChessAPINotFoundError,
    ChessAPIParseError,
    ChessAPIRateLimitError,
    ChessAPITooManyRetriesError,
    ChessAPIUnavailiableError,
)
from src.exception_handlers import (
    CHESS_API_BAD_RESPONSE_MESSAGE,
    CHESS_API_UNAVAILABLE_MESSAGE,
    register_exception_handlers,
)


def make_client(error: Exception) -> TestClient:
    """Creates a tiny app whose routes always raise the given error."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/players/{username}/profile")
    async def player_route(username: str):
        raise error

    @app.get("/other")
    async def other_route():
        raise error

    return TestClient(app)


def test_not_found_includes_username():
    client = make_client(ChessAPINotFoundError("/player/ghost"))

    response = client.get("/players/ghost/profile")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {
        "detail": "ghost player data is not available / does not exist"
    }


def test_not_found_without_username():
    client = make_client(ChessAPINotFoundError("/something"))

    response = client.get("/other")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not available" in response.json()["detail"]


@pytest.mark.parametrize(
    "error",
    [
        ChessAPIRateLimitError("/player/x"),
        ChessAPIUnavailiableError("timeout"),
        ChessAPITooManyRetriesError(),
    ],
)
def test_unavailable_errors_return_503(error):
    response = make_client(error).get("/other")

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert response.json() == {"detail": CHESS_API_UNAVAILABLE_MESSAGE}


@pytest.mark.parametrize(
    "error", [ChessAPIParseError("player stats"), ChessAPIError("unexpected 418")]
)
def test_bad_responses_return_502(error):
    response = make_client(error).get("/other")

    assert response.status_code == status.HTTP_502_BAD_GATEWAY
    assert response.json() == {"detail": CHESS_API_BAD_RESPONSE_MESSAGE}
