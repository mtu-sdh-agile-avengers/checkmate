"""Parsers for Chess.com PubAPI responses (CMG4-30).

Turn raw responses returned by `ChessComClient` (dict / str) into typed models from
`src.chesscom.models`. Usage in a service:

    raw = await chess_client.get_player_profile(username)
    profile = parse_player_profile(raw)

Single-object responses (profile, stats, archives) are strict: an invalid response
raises `ChessAPIParseError`. Game lists are tolerant: a malformed game is skipped and
logged, so one odd game does not break a whole statistics page or game list.
"""

import re

from loguru import logger
from pydantic import BaseModel, ValidationError

from src.chesscom.exceptions import ChessAPIParseError
from src.chesscom.models import (
    ChessComDailyGame,
    ChessComGame,
    ChessComGamesArchives,
    ChessComPgnGame,
    ChessComPlayerProfile,
    ChessComPlayerStats,
)

# How many validation errors to include in an exception / log message.
_MAX_REPORTED_ERRORS = 3

# PGN tag pair, e.g. [White "hikaru"]; value may contain escaped quotes (\").
_PGN_HEADER_RE = re.compile(r'^\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$', re.MULTILINE)
# Games in a multi-game PGN file are separated by a blank line before the next [Event tag.
_PGN_GAME_SEPARATOR_RE = re.compile(r"\n\s*\n(?=\[Event\s)")


# Helpers ---------------------------------------------------------------------------


def _describe_errors(error: ValidationError) -> str:
    """Short human-readable summary of a pydantic ValidationError."""
    parts = [
        f"{'.'.join(str(loc) for loc in err['loc']) or '<root>'}: {err['msg']}"
        for err in error.errors()[:_MAX_REPORTED_ERRORS]
    ]
    if error.error_count() > _MAX_REPORTED_ERRORS:
        parts.append(f"... and {error.error_count() - _MAX_REPORTED_ERRORS} more")
    return "; ".join(parts)


def _validate[M: BaseModel](model: type[M], data: object, source: str) -> M:
    """Validates one object; raises ChessAPIParseError if it does not match the model."""
    try:
        return model.model_validate(data)
    except ValidationError as e:
        details = _describe_errors(e)
        logger.error(f"Failed to parse Chess.com {source}: {details}")
        raise ChessAPIParseError(source, details) from e


def _validate_each[M: BaseModel](
    model: type[M], items: list[object], source: str
) -> list[M]:
    """Validates every item; skips (and logs) items that do not match the model."""
    parsed: list[M] = []
    for index, item in enumerate(items):
        try:
            parsed.append(model.model_validate(item))
        except ValidationError as e:
            url = item.get("url") if isinstance(item, dict) else None
            logger.warning(
                f"Skipping malformed item #{index} ({url}) in Chess.com {source}: "
                f"{_describe_errors(e)}"
            )
    return parsed


def _games_list(data: object, source: str) -> list[object]:
    """Extracts the "games" list from a games response."""
    if not isinstance(data, dict) or not isinstance(data.get("games"), list):
        raise ChessAPIParseError(source, "expected an object with a 'games' list")
    return data["games"]


# Public parsers --------------------------------------------------------------------


def parse_player_profile(data: object) -> ChessComPlayerProfile:
    """Parses GET /pub/player/{username}."""
    return _validate(ChessComPlayerProfile, data, "player profile")


def parse_player_stats(data: object) -> ChessComPlayerStats:
    """Parses GET /pub/player/{username}/stats."""
    return _validate(ChessComPlayerStats, data, "player stats")


def parse_games_archives(data: object) -> ChessComGamesArchives:
    """Parses GET /pub/player/{username}/games/archives."""
    return _validate(ChessComGamesArchives, data, "games archives")


def parse_monthly_games(data: object) -> list[ChessComGame]:
    """Parses GET /pub/player/{username}/games/{YYYY}/{MM} (finished games of a month)."""
    source = "monthly games"
    return _validate_each(ChessComGame, _games_list(data, source), source)


def parse_daily_games(data: object) -> list[ChessComDailyGame]:
    """Parses GET /pub/player/{username}/games (ongoing daily games)."""
    source = "daily games"
    return _validate_each(ChessComDailyGame, _games_list(data, source), source)


def parse_pgn_headers(pgn: str) -> dict[str, str]:
    """Returns PGN tag pairs of a single game, e.g. {"White": "hikaru", "Result": "1-0"}."""
    header_section = pgn.replace("\r\n", "\n").strip().split("\n\n", 1)[0]
    return {
        key: value.replace('\\"', '"').replace("\\\\", "\\")
        for key, value in _PGN_HEADER_RE.findall(header_section)
    }


def parse_monthly_pgn(text: str) -> list[ChessComPgnGame]:
    """Parses GET /pub/player/{username}/games/{YYYY}/{MM}/pgn (multi-game PGN text)."""
    normalized = text.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    return [
        ChessComPgnGame(headers=parse_pgn_headers(chunk), pgn=chunk.strip())
        for chunk in _PGN_GAME_SEPARATOR_RE.split(normalized)
        if chunk.strip()
    ]
