"""API tests for POST /api/v1/computer/analysis (In-Game Chess review)."""

from types import SimpleNamespace

import pytest
from fastapi import status

from src.config import RunMode
from src.dependencies import get_game_analyst
from src.schemas.computer import MAX_ANALYSED_MOVES
from src.services.computer_analysis import BasicAnalyst, StockfishAnalyst
from src.services.exceptions import ChessEngineUnavailableError

URL = "/api/v1/computer/analysis"
FOOLS_MATE = ["f2f3", "e7e5", "g2g4", "d8h4"]


class BrokenAnalyst:
    async def analyse(self, game):
        raise ChessEngineUnavailableError("Stockfish crashed")


def test_analyses_a_game_with_the_built_in_evaluator_in_dev_mode(api_client):
    response = api_client.post(URL, json={"moves": FOOLS_MATE})

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert set(body) == {"engine", "depth", "initialFen", "moves"}
    assert body["engine"] == "Built-in evaluator (approximate)"
    assert [move["san"] for move in body["moves"]] == ["f3", "e5", "g4", "Qh4#"]
    g4 = body["moves"][2]
    assert (g4["category"], g4["mateIn"], g4["moveNumber"], g4["color"]) == (
        "blunder",
        -1,
        2,
        "white",
    )
    mate = body["moves"][3]
    assert (mate["mateIn"], mate["bestMoveSan"], mate["bestMoveUci"]) == (
        0,
        "Qh4#",
        "d8h4",
    )
    assert set(g4) == {
        "ply",
        "moveNumber",
        "color",
        "san",
        "uci",
        "fen",
        "evalCp",
        "mateIn",
        "bestMoveSan",
        "bestMoveUci",
        "category",
    }


def test_an_empty_game_has_nothing_to_analyse(api_client):
    response = api_client.post(URL, json={"moves": []})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["moves"] == []


@pytest.mark.parametrize(
    ("moves", "message"),
    [
        (["e2e4", "e2e5"], "Move 2 (e2e5) is not allowed in its position."),
        (
            ["e2e4", "e7-e5"],
            "Move 2 (e7-e5) is not written like e2e4 (or e7e8q to promote).",
        ),
    ],
)
def test_refuses_a_move_that_is_not_allowed_or_not_uci(api_client, moves, message):
    response = api_client.post(URL, json={"moves": moves})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert message in response.text


def test_refuses_more_moves_than_a_game_can_have(api_client):
    response = api_client.post(
        URL,
        json={
            "moves": ["g1f3", "g8f6", "f3g1", "f6g8"] * (MAX_ANALYSED_MOVES // 4 + 1)
        },
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_an_engine_that_cannot_run_is_a_503(api_client):
    api_client.app.dependency_overrides[get_game_analyst] = lambda: BrokenAnalyst()

    response = api_client.post(URL, json={"moves": FOOLS_MATE})

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert response.json() == {
        "detail": "Error during loading a game. Please try again"
    }


@pytest.mark.parametrize(
    ("run_mode", "stockfish_path", "analyst_type"),
    [
        (RunMode.DEV, None, BasicAnalyst),  # dev without Stockfish: built-in evaluator
        (RunMode.DEV, "/usr/games/stockfish", StockfishAnalyst),
        (RunMode.PROD, "/usr/games/stockfish", StockfishAnalyst),
        (RunMode.PROD, None, StockfishAnalyst),  # -> 503 "set STOCKFISH_PATH"
    ],
)
def test_which_engine_analyses(monkeypatch, run_mode, stockfish_path, analyst_type):
    config = SimpleNamespace(run_mode=run_mode, stockfish_path=stockfish_path)
    monkeypatch.setattr("src.dependencies.get_config", lambda: config)

    assert isinstance(get_game_analyst(), analyst_type)
