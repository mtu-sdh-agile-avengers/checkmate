"""API tests for POST /api/v1/computer/move (In-Game Chess page)."""

from types import SimpleNamespace

import chess
import pytest
from fastapi import status

from src.config import RunMode
from src.dependencies import get_computer_player
from src.enums import ComputerLevel
from src.services.computer import BasicPlayer, StockfishPlayer
from src.services.exceptions import ChessEngineUnavailableError

URL = "/api/v1/computer/move"


class ReplyWith:
    """Fake computer player that answers with one fixed move."""

    def __init__(self, uci: str) -> None:
        self.uci = uci

    async def choose_move(self, board: chess.Board, level: ComputerLevel) -> chess.Move:
        return chess.Move.from_uci(self.uci)


class BrokenEngine:
    async def choose_move(self, board: chess.Board, level: ComputerLevel) -> chess.Move:
        raise ChessEngineUnavailableError("Stockfish crashed")


def use_player(api_client, player):
    api_client.app.dependency_overrides[get_computer_player] = lambda: player
    return api_client


def test_play_a_move(api_client):
    client = use_player(api_client, ReplyWith("e7e5"))

    response = client.post(URL, json={"move": "e2e4", "level": "beginner"})

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert set(body) == {
        "fen",
        "playerMove",
        "computerMove",
        "turn",
        "legalMoves",
        "check",
        "status",
        "winner",
    }
    assert body["playerMove"] == {
        "uci": "e2e4",
        "san": "e4",
        "fromSquare": "e2",
        "toSquare": "e4",
    }
    assert body["computerMove"]["san"] == "e5"
    assert body["fen"] == "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
    assert (body["turn"], body["status"], body["winner"]) == ("white", "playing", None)
    assert "g1f3" in body["legalMoves"]


def test_start_a_game_without_a_move(api_client):
    client = use_player(api_client, ReplyWith("d2d4"))

    as_white = client.post(URL, json={})
    as_black = client.post(URL, json={"playerColor": "black"})

    assert as_white.json()["computerMove"] is None
    assert len(as_white.json()["legalMoves"]) == 20
    assert as_black.json()["computerMove"]["san"] == "d4"
    assert as_black.json()["turn"] == "black"


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ({"move": "e2e5"}, "This move is not allowed in this position."),
        ({"fen": "nonsense"}, "The position (FEN) is not valid."),
        ({"move": "castle"}, "Moves are written like e2e4 (or e7e8q to promote)."),
        ({"level": "grandmaster"}, "Input should be"),
        ({"gameId": "1"}, "Extra inputs are not permitted"),
    ],
)
def test_invalid_moves_are_422_with_a_readable_message(api_client, body, message):
    client = use_player(api_client, ReplyWith("e7e5"))

    response = client.post(URL, json=body)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert response.json()["detail"][0]["msg"].startswith(message)


def test_engine_failure_is_503(api_client):
    client = use_player(api_client, BrokenEngine())

    response = client.post(URL, json={"move": "e2e4"})

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert response.json() == {
        "detail": "The computer can't play right now. Please try again"
    }


def test_basic_player_in_dev_mode_plays_a_whole_reply(api_client):
    client = use_player(api_client, BasicPlayer())

    body = client.post(URL, json={"move": "e2e4"}).json()

    assert body["computerMove"] is not None
    assert body["turn"] == "white"


@pytest.mark.parametrize(
    ("run_mode", "stockfish_path", "player_type"),
    [
        (RunMode.DEV, None, BasicPlayer),  # dev without Stockfish: built-in player
        (RunMode.DEV, "/usr/games/stockfish", StockfishPlayer),
        (RunMode.PROD, "/usr/games/stockfish", StockfishPlayer),
        (RunMode.PROD, None, StockfishPlayer),  # -> 503 "set STOCKFISH_PATH"
    ],
)
def test_which_computer_plays(monkeypatch, run_mode, stockfish_path, player_type):
    config = SimpleNamespace(run_mode=run_mode, stockfish_path=stockfish_path)
    monkeypatch.setattr("src.dependencies.get_config", lambda: config)

    assert isinstance(get_computer_player(), player_type)
