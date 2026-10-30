from enum import IntEnum, StrEnum

# Enums used for requests -------------------------------------------


class TimeClass(StrEnum):
    BULLET = "bullet"
    BLITZ = "blitz"
    RAPID = "rapid"
    DAILY = "daily"


class SummaryPeriod(StrEnum):
    DAYS_1 = "1"
    DAYS_7 = "7"
    DAYS_15 = "15"
    DAYS_30 = "30"
    OVERALL = "all"


class PagingLimit(IntEnum):
    L5 = 5
    L10 = 10
    L15 = 15
    L30 = 30
    L50 = 50


class SortGameBy(StrEnum):
    AVG_RATING = "avgRating"
    MATCH_DATE_TIME = "matchDateTime"


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


# Enums used for responses -------------------------------------------


class ChessTitle(StrEnum):
    GM = "GM"  # Grand Master
    WGM = "WGM"  # Woman Grand Master
    IM = "IM"  # International Master
    WIM = "WIM"  # Woman International Master
    FM = "FM"  # FIDE Master
    WFM = "WFM"  # Woman FIDE Master
    NM = "NM"  # National Master
    WNM = "WNM"  # Woman National Master
    CM = "CM"  # Candidate Master
    WCM = "WCM"  # Woman Candidate Master


class PlayerColor(StrEnum):
    WHITE = "white"
    BLACK = "black"


class GameResult(StrEnum):
    WIN = "win"
    LOSS = "loss"
    DRAW = "draw"


class MoveCategory(StrEnum):
    BEST = "best"
    GOOD = "good"
    NORMAL = "normal"
    MISS = "miss"
    BLUNDER = "blunder"
