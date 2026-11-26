"""Errors raised by our own services (not by Chess.com), mapped to HTTP responses in
`src/exception_handlers.py`."""

# Message when the computer cannot play a move (In-Game Chess page)
CHESS_ENGINE_ERROR_MESSAGE = "The computer can't play right now. Please try again"
# Message of the game analysis error state on the replay page (CMG4-18 AC)
GAME_ANALYSIS_ERROR_MESSAGE = "Error during loading a game. Please try again"


class ChessEngineUnavailableError(Exception):
    """Raised when the chess engine (Stockfish) cannot be used: not installed (no
    STOCKFISH_PATH), cannot start, crashed or returned nothing.

    Returned as `503` with `user_message`.
    """

    user_message = CHESS_ENGINE_ERROR_MESSAGE


class GameAnalysisUnavailableError(ChessEngineUnavailableError):
    """The chess engine cannot analyse a game; returned as `503` with
    `GAME_ANALYSIS_ERROR_MESSAGE`. The analysis endpoint raises it from a
    `ChessEngineUnavailableError` of the engine.
    """

    user_message = GAME_ANALYSIS_ERROR_MESSAGE
