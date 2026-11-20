from src.schemas.common import ErrorResponse

COMMON_RESPONSES: dict[int | str, dict] = {
    429: {"description": "Request limit exceeded. Try again in a moment"},
    502: {"model": ErrorResponse, "description": "Unexpected Chess.com response"},
    503: {"model": ErrorResponse, "description": "Chess.com is not available"},
}
