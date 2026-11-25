"""Builds the two-player comparison from two all-time summaries (CMG4-56)."""

from src.enums import TimeClass
from src.schemas.players import (
    PlayerComparisonResponse,
    PlayerStatisticSummaryResponse,
    WinLikelihoodResponse,
)
from src.services.processing.win_likelihood import win_likelihood


def compare_summaries(
    time_class: TimeClass,
    player1: PlayerStatisticSummaryResponse,
    player2: PlayerStatisticSummaryResponse,
) -> PlayerComparisonResponse:
    """Puts both summaries side by side and adds the win likelihood.

    The likelihood comes from the players' current ratings in the time class.
    """
    likelihood = win_likelihood(player1.rating.current, player2.rating.current)
    return PlayerComparisonResponse(
        time_class=time_class,
        player1=player1,
        player2=player2,
        win_likelihood=(
            WinLikelihoodResponse(
                player1=likelihood.player1, player2=likelihood.player2
            )
            if likelihood
            else None
        ),
    )
