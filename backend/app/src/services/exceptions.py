"""Errors raised by our own services (not by Chess.com), mapped to HTTP responses in
`src/exception_handlers.py`."""

# Message of the game analysis error state on the replay page (CMG4-18 AC)
GAME_ANALYSIS_ERROR_MESSAGE = "Error during loading a game. Please try again"


class GameAnalysisUnavailableError(Exception):
    """Raised when the chess engine cannot analyse a game, e.g. Stockfish is not
    installed (no STOCKFISH_PATH), crashed or timed out.

    Returned as `503` with `GAME_ANALYSIS_ERROR_MESSAGE`.
    """
