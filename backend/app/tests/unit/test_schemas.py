"""Validation rules and computed fields of the public API schemas."""

from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from src.schemas.computer import ComputerMoveRequest
from src.schemas.games import PlayerGameHistoryListQuery
from src.schemas.players import (
    PlayerComparisonResponse,
    RatingSummaryResponse,
    WinLikelihoodResponse,
)


def test_a_null_move_starts_a_game():
    assert ComputerMoveRequest.model_validate({"move": None}).move is None


def test_year_and_month_go_together():
    with pytest.raises(ValidationError, match="Send both year and month"):
        PlayerGameHistoryListQuery.model_validate({"year": 2026})


def test_rating_difference_is_expected_minus_current():
    rating = RatingSummaryResponse(current=1500, highest=1600, expected=1550)

    assert rating.difference == 50


def test_the_comparison_winner_can_be_player_two():
    comparison = PlayerComparisonResponse.model_construct(
        player1=SimpleNamespace(username="hikaru"),
        player2=SimpleNamespace(username="magnus"),
        win_likelihood=WinLikelihoodResponse(player1=0.25, player2=0.75),
    )

    assert comparison.winner == "magnus"
