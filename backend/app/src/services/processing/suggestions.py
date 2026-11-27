"""The account suggestions of the search box, from what each source found."""

from collections.abc import Iterable

from src.chesscom.parser.links import member_url
from src.schemas.players import (
    PlayerSearchProfileResponse,
    PlayerSuggestionResponse,
    PlayerSuggestionsResponse,
)
from src.services.titled_players import TitledPlayer

SUGGESTIONS_LIMIT = 8


def merge_suggestions(
    prefix: str,
    exact: PlayerSearchProfileResponse | None,
    titled: Iterable[TitledPlayer],
) -> PlayerSuggestionsResponse:
    """The account with exactly this username first (with its picture), then the titled
    players, without the exact account twice; at most `SUGGESTIONS_LIMIT`."""
    players: list[PlayerSuggestionResponse] = []
    if exact is not None:
        players.append(
            PlayerSuggestionResponse.model_validate(
                {**exact.model_dump(), "exact": True}
            )
        )
    for player in titled:
        username = player.username.lower()
        if exact is not None and username == exact.username.lower():
            continue
        players.append(
            PlayerSuggestionResponse(
                username=username, url=member_url(player.username), title=player.title
            )
        )
    return PlayerSuggestionsResponse(query=prefix, players=players[:SUGGESTIONS_LIMIT])
