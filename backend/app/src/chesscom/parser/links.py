"""Parsing of user input that points to a Chess.com player or game.

The end-user may type a username ("Hikaru") or paste a link copied from the browser
("https://www.chess.com/member/Hikaru", "https://www.chess.com/game/live/169586417316").
These helpers turn such input into the plain username / game id the PubAPI expects.
"""

import re
from urllib.parse import urlsplit

# Chess.com usernames: 3-25 letters, digits, "_" or "-" (same rule as the frontend).
USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]{3,25}$")
GAME_ID_RE = re.compile(r"^\d{1,20}$")
CHESSCOM_HOSTS = frozenset({"chess.com", "www.chess.com", "m.chess.com"})


def member_url(username: str) -> str:
    """The player's profile page on Chess.com, e.g. https://www.chess.com/member/Hikaru."""
    return f"https://www.chess.com/member/{username}"


class InvalidChessComInputError(ValueError):
    """Raised when the input is not a valid username / game id or Chess.com link.

    The message is meant for the end-user.
    """


def _url_path_parts(value: str, example: str) -> list[str] | None:
    """Returns the path segments of a Chess.com URL, or None if `value` is not a URL."""
    if "/" not in value:
        return None

    # Accept links without a scheme, e.g. "chess.com/member/hikaru".
    url = value if re.match(r"^https?://", value, re.IGNORECASE) else f"https://{value}"
    try:
        parts = urlsplit(url)
    except ValueError as e:
        raise InvalidChessComInputError(f"The link is not valid. {example}") from e

    if (parts.hostname or "").lower() not in CHESSCOM_HOSTS:
        raise InvalidChessComInputError(f"Please use a Chess.com link. {example}")

    return [part for part in parts.path.split("/") if part]


def parse_player_query(value: str) -> str:
    """Returns the username from a username or a Chess.com member profile URL.

    The username is lowercased, the way the Chess.com PubAPI writes usernames in its URLs.

    Raises:
        InvalidChessComInputError: if the input is neither of them.
    """
    value = value.strip()
    if not value:
        raise InvalidChessComInputError(
            "Enter a Chess.com username or member profile URL."
        )

    username = value
    path = _url_path_parts(value, "Use a link like chess.com/member/username.")
    if path is not None:
        if len(path) != 2 or path[0].lower() != "member":
            raise InvalidChessComInputError(
                "Use a link like chess.com/member/username."
            )
        username = path[1]

    if not USERNAME_RE.match(username):
        raise InvalidChessComInputError(
            "Usernames must be 3-25 characters: letters, numbers, _ or -."
        )

    return username.lower()


def parse_game_query(value: str) -> str:
    """Returns the game id from a game id or a Chess.com game URL.

    Accepted URLs end with the numeric game id, e.g. ".../game/live/169586417316",
    ".../game/daily/912345678" or ".../analysis/game/live/169586417316".

    Raises:
        InvalidChessComInputError: if the input is neither of them.
    """
    value = value.strip()
    example = "Use a game id or a link like chess.com/game/live/169586417316."

    game_id = value
    path = _url_path_parts(value, example)
    if path is not None:
        if "game" not in [part.lower() for part in path]:
            raise InvalidChessComInputError(example)
        game_id = path[-1]

    if not GAME_ID_RE.match(game_id):
        raise InvalidChessComInputError(example)

    return game_id
