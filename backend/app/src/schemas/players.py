import re
from datetime import datetime
from typing import Self

from pydantic import (
    Field,
    ValidationInfo,
    computed_field,
    field_validator,
    model_validator,
)
from pydantic_core import PydanticCustomError

from src.chesscom.parser.links import InvalidChessComInputError, parse_player_query
from src.enums import SummaryPeriod, TimeClass
from src.schemas.common import BaseSchema, QuerySchema

# Query Models ---------------------------------------------------------------


class PlayerSearchQuery(QuerySchema):
    search: str = Field(
        examples=["hikaru", "https://www.chess.com/member/Hikaru"],
        description="Chess.com username or member profile URL",
    )

    @field_validator("search")
    @classmethod
    def _to_username(cls, value: str) -> str:
        try:
            return parse_player_query(value)
        except InvalidChessComInputError as e:
            # custom error type: the message is returned to the client without a prefix
            raise PydanticCustomError("invalid_player_search", str(e)) from e

    @property
    def username(self) -> str:
        """Username parsed from `search` (lowercase)."""
        return self.search


# The start of a username: 2 characters at least (a username has 3), at most 25
USERNAME_PREFIX_RE = re.compile(r"^[A-Za-z0-9_-]{2,25}$")


class PlayerSuggestionsQuery(QuerySchema):
    """What the user has typed so far: GET /players/suggestions?q=."""

    q: str = Field(
        examples=["hik"],
        description="The start of a Chess.com username (2-25 characters)",
    )

    @field_validator("q")
    @classmethod
    def _to_prefix(cls, value: str) -> str:
        value = value.strip()
        if not USERNAME_PREFIX_RE.match(value):
            raise PydanticCustomError(
                "invalid_username_prefix",
                "Type 2-25 characters of a username: letters, numbers, _ or -.",
            )
        return value.lower()


class PlayerSummaryQuery(QuerySchema):
    period: SummaryPeriod = Field(
        default=SummaryPeriod.OVERALL,
        examples=[SummaryPeriod.DAYS_7],
        description='Time frame: last 1 / 7 / 15 / 30 days, or "all" for all-time stats',
    )
    time_class: TimeClass = Field(examples=[TimeClass.BLITZ])


class PlayerComparisonQuery(QuerySchema):
    """Two players to compare: GET /players/compare?p1=&p2=&timeClass= (CMG4-56)."""

    p1: str = Field(
        examples=["hikaru", "https://www.chess.com/member/Hikaru"],
        description="Player 1: Chess.com username or member profile URL",
    )
    p2: str = Field(
        examples=["magnuscarlsen"],
        description="Player 2: Chess.com username or member profile URL",
    )
    time_class: TimeClass = Field(
        examples=[TimeClass.BLITZ], description="Time class the players are compared in"
    )

    @field_validator("p1", "p2")
    @classmethod
    def _to_username(cls, value: str, info: ValidationInfo) -> str:
        try:
            return parse_player_query(value)
        except InvalidChessComInputError as e:
            number = 1 if info.field_name == "p1" else 2
            raise PydanticCustomError(
                "invalid_player_search", f"Player {number}: {e}"
            ) from e

    @model_validator(mode="after")
    def _two_different_players(self) -> Self:
        if self.p1 == self.p2:
            raise PydanticCustomError(
                "same_players", "Choose two different players to compare."
            )
        return self


# Response Models ------------------------------------------------------------


class PlayerSearchProfileResponse(BaseSchema):
    username: str = Field(examples=["hikaru"])
    url: str = Field(examples=["https://www.chess.com/member/Hikaru"])
    avatar: str | None = None
    title: str | None = None


class PlayerSuggestionResponse(PlayerSearchProfileResponse):
    """One account suggested while typing (titled players have no picture here)."""

    exact: bool = Field(
        default=False,
        description="True for the account with exactly the username typed (it comes first)",
    )


class PlayerSuggestionsResponse(BaseSchema):
    query: str = Field(examples=["hik"], description="What was typed, lowercase")
    players: list[PlayerSuggestionResponse] = Field(
        default_factory=list,
        description=(
            "At most 8: the account with exactly this username first, if it exists, "
            "then titled players (GM, IM, FM...) whose username starts with it"
        ),
    )


class PlayerProfileResponse(BaseSchema):
    avatar: str | None = None
    player_id: int = Field(examples=[15448422])
    url: str = Field(examples=["https://www.chess.com/member/Hikaru"])
    name: str | None = Field(default=None, examples=["Hikaru Nakamura"])
    username: str = Field(examples=["hikaru"])
    title: str | None = Field(default=None, examples=["GM"])
    followers: int = Field(ge=0)
    country_url: str = Field(examples=["https://api.chess.com/pub/country/UA"])
    location: str | None = Field(default=None, examples=["Florida"])
    last_online: datetime
    joined: datetime
    status: str = Field(default="basic", examples=["premium"])
    is_streamer: bool = Field(default=False, examples=[True])
    twitch_url: str | None = Field(
        default=None, examples=["https://twitch.tv/gmhikaru"]
    )
    verified: bool = Field(default=False, examples=[False])
    league: str | None = Field(default=None, examples=["Legend"])
    fide_rating: int | None = Field(
        default=None,
        examples=[2814],
        description="FIDE rating from the player's Chess.com stats; null if not set",
    )


class RatingSummaryResponse(BaseSchema):
    current: int | None = Field(
        examples=[2318],
        description="Current ELO rating; null if the player never played this time class",
    )
    highest: int | None = Field(
        examples=[2401], description="Highest ever achieved ELO rating"
    )
    expected: int | None = Field(
        default=None,
        examples=[None],
        description="Expected (ML-estimated) ELO rating; null until the ML model is ready",
    )
    change: int | None = Field(
        default=None,
        examples=[18],
        description=(
            "Rating change over the selected period (+/- Elo); "
            'null for "all" or when there are no games in the period'
        ),
    )

    @computed_field(description="expected - current; null if any of them is null")
    @property
    def difference(self) -> int | None:
        if self.current is None or self.expected is None:
            return None

        return self.expected - self.current


class RatingPointResponse(BaseSchema):
    date: datetime = Field(description="End time of the game (UTC)")
    rating: int = Field(examples=[2318], description="Player's rating after the game")


class PlayerStatisticSummaryResponse(BaseSchema):
    username: str = Field(examples=["hikaru"])
    day_period: SummaryPeriod = Field(description="Selected time frame")
    time_class: TimeClass
    wins: int = Field(ge=0, description="Rated standard chess games won in the period")
    losses: int = Field(ge=0, description="Rated standard chess games lost")
    draws: int = Field(ge=0, description="Rated standard chess games drawn")
    rating: RatingSummaryResponse
    rating_history: list[RatingPointResponse] = Field(
        default_factory=list,
        description=(
            "Player's rating after each game in the period, oldest first "
            '(for the rating trend chart); empty for "all"'
        ),
    )

    @computed_field(description="wins + losses + draws; 0 means no games in the period")
    @property
    def total_games_played(self) -> int:
        return self.wins + self.losses + self.draws

    @computed_field(
        description="wins / totalGamesPlayed, 0..1; if totalGamesPlayed == 0, then 0.0"
    )
    @property
    def win_rate(self) -> float:
        return (
            round(self.wins / self.total_games_played, 4)
            if self.total_games_played > 0
            else 0.0
        )


class WinLikelihoodResponse(BaseSchema):
    """Elo expected score of each player against the other (CMG4-57)."""

    player1: float = Field(
        ge=0, le=1, examples=[0.6401], description="Player 1: 0..1 (show as %)"
    )
    player2: float = Field(
        ge=0, le=1, examples=[0.3599], description="Player 2: 1 - player1"
    )


class PlayerComparisonResponse(BaseSchema):
    """Two players side by side: all-time summary of both + win likelihood (CMG4-15)."""

    time_class: TimeClass
    player1: PlayerStatisticSummaryResponse = Field(
        description="All-time summary of player 1 (same as /summary?period=all)"
    )
    player2: PlayerStatisticSummaryResponse = Field(
        description="All-time summary of player 2"
    )
    win_likelihood: WinLikelihoodResponse | None = Field(
        description=(
            "Expected score of each player from their current ratings (a win counts 1, "
            "a draw 0.5); null if a player has no rating in this time class"
        )
    )

    @computed_field(
        description="Username of the player more likely to win; null if even or unknown"
    )
    @property
    def winner(self) -> str | None:
        likelihood = self.win_likelihood
        if likelihood is None or likelihood.player1 == likelihood.player2:
            return None
        if likelihood.player1 > likelihood.player2:
            return self.player1.username
        return self.player2.username
