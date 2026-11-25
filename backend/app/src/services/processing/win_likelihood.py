"""Win likelihood of two players from their ratings (CMG4-57).

Uses the Elo expected score: the share of points a player is expected to score against
the other one (a win counts 1, a draw 0.5). Chess.com ratings are Glicko ratings on the
same scale as Elo, so the formula applies to them directly:

    E1 = 1 / (1 + 10 ** ((R2 - R1) / 400)),    E2 = 1 - E1

A 400-point higher rating means about 10:1 odds (E1 = 0.909).
Reference: https://en.wikipedia.org/wiki/Elo_rating_system#Mathematical_details
"""

from typing import NamedTuple

ELO_SCALE = 400  # rating difference that means 10:1 odds
_DECIMALS = 4


class WinLikelihood(NamedTuple):
    """Expected score of each player, 0..1; the two values add up to 1."""

    player1: float
    player2: float


def expected_score(rating: int, opponent_rating: int) -> float:
    """Elo expected score (0..1) of a player with `rating` against `opponent_rating`."""
    return 1 / (1 + 10 ** ((opponent_rating - rating) / ELO_SCALE))


def win_likelihood(rating1: int | None, rating2: int | None) -> WinLikelihood | None:
    """Expected score of both players, rounded to 4 decimals.

    Returns None if either player has no rating in the time class (never played it),
    because there is nothing to compare.
    """
    if rating1 is None or rating2 is None:
        return None

    player1 = round(expected_score(rating1, rating2), _DECIMALS)
    return WinLikelihood(player1=player1, player2=round(1 - player1, _DECIMALS))
