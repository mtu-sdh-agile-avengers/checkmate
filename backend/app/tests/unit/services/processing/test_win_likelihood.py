"""Tests for the Elo win likelihood of two players (CMG4-57)."""

import pytest

from src.services.processing.win_likelihood import (
    WinLikelihood,
    expected_score,
    win_likelihood,
)


def test_equal_ratings_are_an_even_match():
    assert expected_score(2000, 2000) == 0.5
    assert win_likelihood(2000, 2000) == WinLikelihood(player1=0.5, player2=0.5)


@pytest.mark.parametrize(
    ("difference", "expected"),
    [
        (100, 0.6401),  # textbook values of the Elo formula
        (200, 0.7597),
        (400, 0.9091),  # 400 points = 10:1 odds
        (800, 0.9901),
    ],
)
def test_higher_rated_player_is_favourite(difference, expected):
    likelihood = win_likelihood(1500 + difference, 1500)

    assert likelihood == WinLikelihood(expected, round(1 - expected, 4))


def test_likelihoods_are_symmetric_and_add_up_to_one():
    first = win_likelihood(3467, 2318)  # Hikaru's blitz rating vs a 2318 player
    second = win_likelihood(2318, 3467)

    assert first.player1 == second.player2
    assert first.player2 == second.player1
    assert first.player1 + first.player2 == pytest.approx(1)
    assert first.player1 > 0.99


@pytest.mark.parametrize(
    ("rating1", "rating2"), [(None, 2000), (2000, None), (None, None)]
)
def test_no_likelihood_without_both_ratings(rating1, rating2):
    assert win_likelihood(rating1, rating2) is None
