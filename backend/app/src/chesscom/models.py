"""Typed models of Chess.com PubAPI JSON responses.

These models mirror the EXTERNAL Chess.com format (snake_case keys, `@id` links,
unix timestamps, raw result codes like "checkmated"). They are internal to the
backend: services work with them, but they are never returned to the frontend
directly; routers return our own schemas from `src/schemas/` instead.

Models are tolerant: unknown keys are ignored and most optional keys have defaults,
so a new field added by Chess.com does not break parsing.

Reference: https://www.chess.com/news/view/published-data-api
"""

from datetime import datetime
from typing import ClassVar, NamedTuple

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.enums import GameResult, PlayerColor, TimeClass

# Raw Chess.com result codes that mean the game ended in a draw.
# "win" means a win; every other code (checkmated, resigned, timeout, abandoned, lose, ...)
# means a loss for that side.
DRAW_RESULT_CODES: frozenset[str] = frozenset(
    {
        "agreed",
        "repetition",
        "stalemate",
        "insufficient",
        "50move",
        "timevsinsufficient",
    }
)
WIN_RESULT_CODE = "win"


def result_code_to_game_result(code: str) -> GameResult:
    """Maps a raw Chess.com result code (e.g. "checkmated") to our `GameResult`."""
    if code == WIN_RESULT_CODE:
        return GameResult.WIN
    if code in DRAW_RESULT_CODES:
        return GameResult.DRAW
    return GameResult.LOSS


def last_url_segment(url: str) -> str:
    """Returns the last path segment of a URL, e.g. ".../country/US" -> "US"."""
    return url.rstrip("/").rsplit("/", 1)[-1]


class ChessComModel(BaseModel):
    """Base class for all Chess.com response models."""

    model_config = ConfigDict(
        extra="ignore",  # ignore keys we do not use (Chess.com adds fields over time)
        frozen=True,  # parsed external data is read-only
        validate_by_alias=True,  # populate from Chess.com keys, e.g. "@id"
        validate_by_name=True,  # also allow populating by attribute name (handy in tests)
    )


# Player profile: GET /pub/player/{username} ---------------------------------------


class ChessComPlayerProfile(ChessComModel):
    player_id: int
    api_url: str = Field(alias="@id")
    url: str
    username: str
    name: str | None = None
    avatar: str | None = None
    # "GM", "IM", ...; kept as str (not an enum), so a new title does not break parsing
    title: str | None = None
    followers: int = 0
    country_url: str | None = Field(default=None, alias="country")
    location: str | None = None
    last_online: datetime
    joined: datetime
    status: str = "basic"  # "basic", "premium", "staff", "closed", "closed:fair_play_violations", ...
    is_streamer: bool = False
    twitch_url: str | None = None
    verified: bool = False
    league: str | None = None

    @property
    def country_code(self) -> str | None:
        """ISO country code taken from the country URL, e.g. "US"."""
        return last_url_segment(self.country_url) if self.country_url else None


# Player stats: GET /pub/player/{username}/stats ------------------------------------


class ChessComRatingSnapshot(ChessComModel):
    """Latest rating of a time class ("last" key)."""

    rating: int
    date: datetime
    rd: int | None = None  # Glicko rating deviation


class ChessComBestRating(ChessComModel):
    """Highest ever rating of a time class ("best" key)."""

    rating: int
    date: datetime
    game_url: str | None = Field(default=None, alias="game")


class ChessComRecord(ChessComModel):
    """All-time win / loss / draw record of a time class ("record" key)."""

    win: int = 0
    loss: int = 0
    draw: int = 0
    time_per_move: int | None = None  # daily only, seconds
    timeout_percent: float | None = None  # daily only


class ChessComTimeClassStats(ChessComModel):
    last: ChessComRatingSnapshot | None = None
    best: ChessComBestRating | None = None
    record: ChessComRecord = Field(default_factory=ChessComRecord)


class ChessComPlayerStats(ChessComModel):
    # Keys exist only for time classes the player has played.
    chess_daily: ChessComTimeClassStats | None = None
    chess_rapid: ChessComTimeClassStats | None = None
    chess_blitz: ChessComTimeClassStats | None = None
    chess_bullet: ChessComTimeClassStats | None = None
    fide: int | None = None

    _TIME_CLASS_KEYS: ClassVar[dict[TimeClass, str]] = {
        TimeClass.DAILY: "chess_daily",
        TimeClass.RAPID: "chess_rapid",
        TimeClass.BLITZ: "chess_blitz",
        TimeClass.BULLET: "chess_bullet",
    }

    @field_validator("fide")
    @classmethod
    def _zero_fide_means_missing(cls, value: int | None) -> int | None:
        # Chess.com returns 0 when the player has not set a FIDE rating.
        return value or None

    def for_time_class(self, time_class: TimeClass) -> ChessComTimeClassStats | None:
        """Returns stats of the given time class, or None if the player never played it."""
        return getattr(self, self._TIME_CLASS_KEYS[time_class])


# Game archives: GET /pub/player/{username}/games/archives --------------------------


class ArchiveMonth(NamedTuple):
    year: int
    month: int


class ChessComGamesArchives(ChessComModel):
    """Monthly archive URLs, oldest first, e.g. ".../games/2026/10"."""

    urls: list[str] = Field(default_factory=list, alias="archives")

    @property
    def months(self) -> list[ArchiveMonth]:
        """Archive months parsed from URLs, oldest first."""
        months = []
        for url in self.urls:
            *_, year, month = url.rstrip("/").split("/")
            months.append(ArchiveMonth(int(year), int(month)))
        return sorted(months)


# Finished games: GET /pub/player/{username}/games/{YYYY}/{MM} ----------------------


class ChessComGamePlayer(ChessComModel):
    """One side (white or black) of a finished game."""

    username: str
    rating: int  # player's rating at the end of the game
    result: str  # raw Chess.com code: "win", "checkmated", "agreed", ...
    api_url: str | None = Field(default=None, alias="@id")
    uuid: str | None = None

    @property
    def game_result(self) -> GameResult:
        return result_code_to_game_result(self.result)


class ChessComAccuracies(ChessComModel):
    white: float
    black: float


class ChessComGame(ChessComModel):
    url: str
    pgn: str | None = None
    time_control: str  # "<base seconds>[+<increment>]", daily: "1/<seconds per move>"
    start_time: datetime | None = None  # daily games only
    end_time: datetime
    rated: bool = True
    time_class: TimeClass
    rules: str = "chess"  # "chess", "chess960", "bughouse", "kingofthehill", ...
    white: ChessComGamePlayer
    black: ChessComGamePlayer
    accuracies: ChessComAccuracies | None = None  # only when the game was reviewed
    initial_setup: str | None = None  # FEN
    fen: str | None = None  # final position FEN
    eco_url: str | None = Field(default=None, alias="eco")
    uuid: str | None = None

    @property
    def game_id(self) -> str:
        """Chess.com game id: trailing number in the game URL."""
        return last_url_segment(self.url)

    @property
    def is_standard_chess(self) -> bool:
        """True for regular chess (not chess960 or other variants)."""
        return self.rules == "chess"

    def color_of(self, username: str) -> PlayerColor:
        """Returns the color the given player played with (case-insensitive).

        Raises:
            ValueError: if the player did not take part in this game.
        """
        name = username.casefold()
        if self.white.username.casefold() == name:
            return PlayerColor.WHITE
        if self.black.username.casefold() == name:
            return PlayerColor.BLACK
        raise ValueError(f"Player '{username}' did not play in game {self.url}")

    def side_of(self, username: str) -> ChessComGamePlayer:
        """Returns the given player's side of the game."""
        is_white = self.color_of(username) == PlayerColor.WHITE
        return self.white if is_white else self.black

    def opponent_of(self, username: str) -> ChessComGamePlayer:
        """Returns the opponent's side of the game."""
        is_white = self.color_of(username) == PlayerColor.WHITE
        return self.black if is_white else self.white

    def result_for(self, username: str) -> GameResult:
        """Returns win / loss / draw from the given player's perspective."""
        return self.side_of(username).game_result


# Ongoing daily games: GET /pub/player/{username}/games -----------------------------


class ChessComDailyGame(ChessComModel):
    """An ongoing daily game. NOTE: here "white" / "black" are player API URLs, not objects."""

    url: str
    pgn: str | None = None
    time_control: str
    start_time: datetime | None = None
    last_activity: datetime | None = None
    move_by: datetime | None = None  # deadline for the next move
    rated: bool = True
    turn: PlayerColor
    fen: str | None = None
    time_class: TimeClass = TimeClass.DAILY
    rules: str = "chess"
    white_url: str = Field(alias="white")
    black_url: str = Field(alias="black")
    draw_offer: PlayerColor | None = None

    @field_validator("move_by", mode="before")
    @classmethod
    def _zero_move_by_means_missing(cls, value: object) -> object:
        # Chess.com uses 0 when there is no deadline (e.g. the player is on vacation).
        return None if value == 0 else value

    @property
    def game_id(self) -> str:
        return last_url_segment(self.url)

    @property
    def white_username(self) -> str:
        return last_url_segment(self.white_url)

    @property
    def black_username(self) -> str:
        return last_url_segment(self.black_url)


# Monthly PGN: GET /pub/player/{username}/games/{YYYY}/{MM}/pgn ---------------------


class ChessComPgnGame(ChessComModel):
    """One game taken from a multi-game PGN file."""

    headers: dict[str, str]  # PGN tag pairs, e.g. {"White": "hikaru", "Result": "1-0"}
    pgn: str  # full PGN text of this single game (headers + moves)

    @property
    def url(self) -> str | None:
        """Game URL from the "Link" header (Chess.com adds it to every game)."""
        return self.headers.get("Link")
