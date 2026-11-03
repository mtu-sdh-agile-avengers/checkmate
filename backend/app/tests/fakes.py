"""Test doubles: a fake Chess.com client and a builder of raw Chess.com games."""

from datetime import datetime

from src.chesscom.exceptions import ChessAPINotFoundError
from src.chesscom.models import DRAW_RESULT_CODES, WIN_RESULT_CODE


def make_raw_game(
    *,
    username: str,
    end_time: datetime,
    result: str = WIN_RESULT_CODE,
    rating: int = 2000,
    opponent: str = "opponent",
    opponent_rating: int = 2000,
    color: str = "white",
    time_class: str = "blitz",
    rules: str = "chess",
    rated: bool = True,
    game_id: int = 1,
) -> dict:
    """Builds one game in Chess.com monthly-archive JSON format.

    `result` is the raw result code of `username` ("win", "checkmated", "agreed", ...);
    `rating` is the player's rating after the game.
    """
    if result == WIN_RESULT_CODE:
        opponent_result = "resigned"
    elif result in DRAW_RESULT_CODES:
        opponent_result = result
    else:
        opponent_result = WIN_RESULT_CODE

    player = {
        "username": username,
        "rating": rating,
        "result": result,
        "@id": f"https://api.chess.com/pub/player/{username.lower()}",
    }
    other = {
        "username": opponent,
        "rating": opponent_rating,
        "result": opponent_result,
        "@id": f"https://api.chess.com/pub/player/{opponent.lower()}",
    }
    white, black = (player, other) if color == "white" else (other, player)
    return {
        "url": f"https://www.chess.com/game/live/{game_id}",
        "time_control": "180",
        "end_time": int(end_time.timestamp()),
        "rated": rated,
        "time_class": time_class,
        "rules": rules,
        "white": white,
        "black": black,
    }


class FakeChessComClient:
    """In-memory replacement of ChessComClient: returns prepared raw responses.

    Every request path is recorded in `calls`, so tests can check what was requested.
    """

    API_BASE_URL = "https://api.chess.com/pub"

    def __init__(
        self,
        stats: dict | None = None,
        archive_months: list[tuple[int, int]] | None = None,
        monthly_games: dict[tuple[int, int], list[dict]] | None = None,
        not_found: bool = False,
    ) -> None:
        self.stats = stats or {}
        self.archive_months = archive_months or []
        self.monthly_games = monthly_games or {}
        self.not_found = not_found  # simulate a player that does not exist
        self.calls: list[str] = []

    def _request(self, path: str) -> None:
        self.calls.append(path)
        if self.not_found:
            raise ChessAPINotFoundError(path)

    async def get_player_profile(self, username: str) -> dict:
        raise NotImplementedError

    async def get_player_stats(self, username: str) -> dict:
        self._request(f"/player/{username}/stats")
        return self.stats

    async def get_player_games_archives(self, username: str) -> dict:
        self._request(f"/player/{username}/games/archives")
        base = f"{self.API_BASE_URL}/player/{username}/games"
        return {"archives": [f"{base}/{y}/{m:02d}" for y, m in self.archive_months]}

    async def get_player_monthly_games(
        self, username: str, year: str, month: str
    ) -> dict:
        self._request(f"/player/{username}/games/{year}/{month}")
        return {"games": self.monthly_games.get((int(year), int(month)), [])}

    async def get_player_monthly_pgn(self, username: str, year: str, month: str) -> str:
        raise NotImplementedError

    async def get_player_current_games(self, username: str) -> dict:
        raise NotImplementedError
