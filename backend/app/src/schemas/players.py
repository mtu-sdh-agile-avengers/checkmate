from datetime import datetime

from pydantic import Field, computed_field

from src.enums import SummaryPeriod, TimeClass
from src.schemas.common import BaseSchema, QuerySchema


# Query Models ---------------------------------------------------------------


class PlayerSummaryQuery(QuerySchema):
    period: SummaryPeriod = SummaryPeriod.OVERALL
    time_class: TimeClass


class PlayerComparisonQuery(QuerySchema):
    p1: str = Field(examples=["hikaru"])
    p2: str = Field(examples=["rezyd"])
    time_class: TimeClass = Field(examples=[TimeClass.BLITZ])


# Response Models ------------------------------------------------------------


class PlayerSearchProfileResponse(BaseSchema):
    username: str = Field(examples=["hikaru"])
    url: str = Field(examples=["https://www.chess.com/member/Hikaru"])
    avatar: str | None = None
    title: str | None = None


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


class RatingSummaryResponse(BaseSchema):
    current: int | None = Field(description="Current ELO rating")
    highest: int | None = Field(description="Highest ever achieved ELO rating")
    expected: int | None = Field(
        default=None, description="Expected (ML-estimated) ELO rating"
    )

    @computed_field
    @property
    def difference(self) -> int | None:
        if self.current is None or self.expected is None:
            return None

        return self.expected - self.current


class PlayerStatisticSummaryResponse(BaseSchema):
    username: str = Field(examples=["hikaru"])
    day_period: SummaryPeriod
    time_class: TimeClass
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)
    draws: int = Field(ge=0)
    rating: RatingSummaryResponse

    @computed_field
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


class PlayerComparisonResponse(BaseSchema):
    time_class: TimeClass
    player1: PlayerStatisticSummaryResponse
    player2: PlayerStatisticSummaryResponse
    expected_score: float = Field(ge=0, le=1)
    winner: str | None = Field(description="Strongest player username; null if equal")
