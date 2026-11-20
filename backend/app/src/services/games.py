"""Games service backed by the Chess.com PubAPI (used when RUN_MODE=prod).

The `GamesService` protocol it implements lives in `src/services/protocols.py`;
the DEV-mode mock lives in `src/services/mocks/games.py`.
"""

from src.chesscom.client.client import ExternalChessComAPIClient
from src.chesscom.client.exceptions import (
    ChessAPIParseError,
    ChessComGameNotFoundError,
)
from src.chesscom.parser.models import STANDARD_START_FEN, ArchiveMonth, ChessComGame
from src.chesscom.parser.parser import parse_games_archives, parse_monthly_games
from src.schemas.games import (
    GameAnalysisResponse,
    GameBoardDetailsResponse,
    GameMemberResponse,
    GameResponse,
    PaginatedGameListResponse,
    PlayerGameHistoryListQuery,
    PlayerGameSearchQuery,
)
from src.services.processing.pagination import build_game_list
from src.services.protocols import GamesService


class ChessComGamesService(GamesService):
    def __init__(self, chess_client: ExternalChessComAPIClient) -> None:
        self._client = chess_client

    async def get_game_history_list(
        self, username: str, query: PlayerGameHistoryListQuery
    ) -> PaginatedGameListResponse:
        month = await self._archive_month(username, query)
        if month is None:
            return build_game_list([], None, query)

        games = await self._month_games(username, month)
        items = [to_game_response(game, username) for game in games]
        return build_game_list(items, month, query)

    async def get_game_board_details(
        self, username: str, query: PlayerGameSearchQuery
    ) -> GameBoardDetailsResponse:
        game = await self._find_game(username, query)
        return to_game_board_details(game, username)

    async def analyze_game_board(
        self, username: str, query: PlayerGameSearchQuery
    ) -> GameAnalysisResponse:
        raise NotImplementedError("Game analysis is not implemented yet")

    # Helper functions (call client & parser directly) ----------------------------------------------

    async def _find_game(
        self, username: str, query: PlayerGameSearchQuery
    ) -> ChessComGame:
        """Finds the game in the requested (or latest) monthly archive of the player."""
        month = await self._archive_month(username, query)
        if month is not None:  # if None, then player has never finished a game
            for game in await self._month_games(username, month):
                if game.game_id == query.game_id:
                    return game

        raise ChessComGameNotFoundError(
            username,
            query.game_id,
            month.year if month else None,
            month.month if month else None,
        )

    async def _archive_month(
        self, username: str, query: PlayerGameSearchQuery | PlayerGameHistoryListQuery
    ) -> ArchiveMonth | None:
        """Returns (parsed) requested archive month, or the latest one; None if there are none."""
        if query.year is not None and query.month is not None:
            return ArchiveMonth(query.year, query.month)

        archives = parse_games_archives(
            await self._client.get_player_games_archives(username)
        )
        return archives.months[-1] if archives.months else None

    async def _month_games(
        self,
        username: str,
        month: ArchiveMonth,
    ) -> list[ChessComGame]:
        """Returns (parsed) requested (list of) monthly games; empty list if there are none."""
        raw_games = await self._client.get_player_monthly_games(
            username, str(month.year), f"{month.month:02d}"
        )
        return parse_monthly_games(raw_games)


# Mappings of Chess.com games to Response schemas ----------------------------------------------


def to_game_response(game: ChessComGame, username: str) -> GameResponse:
    """Returns game details from the point of view of `username` (selected player)."""
    return GameResponse(**_game_fields(game, username))


def to_game_board_details(
    game: ChessComGame, username: str
) -> GameBoardDetailsResponse:
    """Builds GameBoardDetailsResponse from ChessComGame (game with the moves (PGN) and positions (FEN) for the game details page)."""
    if not game.pgn or not game.fen:
        raise ChessAPIParseError("monthly games", f"game {game.url} has no PGN / FEN")

    return GameBoardDetailsResponse(
        **_game_fields(game, username),
        pgn=game.pgn,
        initial_setup=game.initial_setup or STANDARD_START_FEN,
        fen=game.fen,
    )


def _game_fields(game: ChessComGame, username: str) -> dict:
    player = game.side_of(username)
    opponent = game.opponent_of(username)
    return {
        "id": game.game_id,
        "url": game.url,
        "time_class": game.time_class,
        "time_control": game.time_control,
        "end_time": game.end_time,
        "rated": game.rated,
        "rules": game.rules,
        "color": game.color_of(username),
        "result": game.result_for(username),
        "player": GameMemberResponse(username=player.username, rating=player.rating),
        "opponent": GameMemberResponse(
            username=opponent.username, rating=opponent.rating
        ),
    }
