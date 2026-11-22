class ChessAPIError(Exception):
    """Base exception class for external chess API client."""


class ChessAPITooManyRetriesError(ChessAPIError):
    pass


class ChessAPINotFoundError(ChessAPIError):
    def __init__(self, path: str, message: str | None = None) -> None:

        if message is None:
            message = f"Requested resource not found at path: {path}"

        super().__init__(message)


class ChessComGameNotFoundError(ChessAPINotFoundError):
    """Raised when a game is not in the player's monthly archive.

    The message is meant for the end-user (returned as the 404 `detail`).
    """

    def __init__(
        self, username: str, game_id: str, year: int | None, month: int | None
    ) -> None:
        message = f"Game {game_id} was not found in {username}'s games"
        path = f"/player/{username}/games"
        if year is not None and month is not None:
            message = f"{message} from {year}-{month:02d}"
            path = f"{path}/{year}/{month:02d}"

        super().__init__(path, message)


class ChessAPIRateLimitError(ChessAPIError):
    def __init__(self, path: str) -> None:
        super().__init__(f"Rate limit exceeded at path: {path}")


class ChessAPIUnavailiableError(ChessAPIError):
    """Raised when external chess API is down or encounters server errors (5xx)."""


class ChessAPIParseError(ChessAPIError):
    """Raised when an external chess API response has an unexpected format."""

    def __init__(self, source: str, details: str | None = None) -> None:
        message = f"Unexpected response format from {source}"
        if details:
            message = f"{message}: {details}"

        super().__init__(message)
