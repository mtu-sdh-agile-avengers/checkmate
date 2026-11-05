class ChessAPIError(Exception):
    """Base exception class for external chess API client."""

    pass


class ChessAPITooManyRetriesError(ChessAPIError):
    pass


class ChessAPINotFoundError(ChessAPIError):
    def __init__(self, path: str, message: str | None = None) -> None:

        if message is None:
            message = f"Requested resource not found at path: {path}"

        super().__init__(message)


class ChessAPIRateLimitError(ChessAPIError):
    def __init__(self, path: str) -> None:
        super().__init__(f"Rate limit exceeded at path: {path}")


class ChessAPIUnavailiableError(ChessAPIError):
    """Raised when external chess API is down or encounters server errors (5xx)."""

    pass


class ChessAPIParseError(ChessAPIError):
    """Raised when an external chess API response has an unexpected format."""

    def __init__(self, source: str, details: str | None = None) -> None:
        message = f"Unexpected response format from {source}"
        if details:
            message = f"{message}: {details}"

        super().__init__(message)
