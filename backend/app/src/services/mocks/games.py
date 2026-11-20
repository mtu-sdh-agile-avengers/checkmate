"""Mock games service, used when RUN_MODE=dev (CMG4-61).

Returns a deterministic sample game without calling Chess.com, so the game page
 can be built and tested before the real implementation is used.

The sample game is the "Opera game" (Morphy, 1858): the requested player plays white
and wins by checkmate in 17 moves.

Game history list includes: 100 games in any month (1st-15th), all time classes, colors and
results; filtering, sorting and paging works like in a real service.

Without year / month the "latest" month is November 2026.

Special values for testing frontend states:
- username "notfound": the player does not exist -> 404
- username "nogames": the player has no games -> empty list
- game id "0" (`search=0`): the game is not in the player's archive -> 404
"""

from datetime import UTC, datetime, timedelta

from src.chesscom.client.exceptions import (
    ChessAPINotFoundError,
    ChessComGameNotFoundError,
)
from src.chesscom.parser.models import STANDARD_START_FEN, ArchiveMonth
from src.enums import GameResult, PlayerColor, TimeClass
from src.schemas.games import (
    GameAnalysisResponse,
    GameBoardDetailsResponse,
    GameMemberResponse,
    GameResponse,
    PaginatedGameListResponse,
    PlayerGameHistoryListQuery,
    PlayerGameSearchQuery,
)
from src.services.mocks.players import MOCK_NO_GAMES_USERNAME, MOCK_NOT_FOUND_USERNAME
from src.services.processing.pagination import build_game_list
from src.services.protocols import GamesService

MOCK_NOT_FOUND_GAME_ID = "0"
MOCK_OPPONENT = "mock_opponent"
# End time of the sample game when the request has no year / month (latest month).
MOCK_LATEST_END_TIME = datetime(2026, 11, 3, 18, 30, tzinfo=UTC)

_MOCK_FINAL_FEN = "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17"
_MOCK_MOVES = (
    "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 "
    "8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 "
    "14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0"
)
_MOCK_PLAYER_RATING = 1512
_MOCK_OPPONENT_RATING = 1488

MOCK_GAMES_PER_MONTH = 100

_MOCK_GAME_INTERVAL = timedelta(hours=1)

_MOCK_TIME_CLASSES = (
    TimeClass.BLITZ,
    TimeClass.BULLET,
    TimeClass.RAPID,
    TimeClass.BLITZ,
    TimeClass.DAILY,
    TimeClass.BULLET,
)

_MOCK_RESULTS = (
    GameResult.WIN,
    GameResult.WIN,
    GameResult.LOSS,
    GameResult.DRAW,
    GameResult.WIN,
    GameResult.LOSS,
    GameResult.LOSS,
)

_MOCK_TIME_CONTROLS = {
    TimeClass.BULLET: "60",
    TimeClass.BLITZ: "180+2",
    TimeClass.RAPID: "600",
    TimeClass.DAILY: "1/86400",
}

_MOCK_START_RATINGS = {
    TimeClass.BULLET: 1450,
    TimeClass.BLITZ: 2000,
    TimeClass.RAPID: 400,
    TimeClass.DAILY: 800,
}
_MOCK_RATING_STEP = {GameResult.WIN: 10, GameResult.LOSS: -10, GameResult.DRAW: 0}


def _mock_pgn(username: str, end_time: datetime) -> str:
    """PGN in the Chess.com format (headers + moves) of the sample game."""
    headers = {
        "Event": "Live Chess",
        "Site": "Chess.com",
        "Date": end_time.strftime("%Y.%m.%d"),
        "Round": "-",
        "White": username,
        "Black": MOCK_OPPONENT,
        "Result": "1-0",
        "CurrentPosition": _MOCK_FINAL_FEN,
        "Timezone": "UTC",
        "ECO": "C41",
        "UTCDate": end_time.strftime("%Y.%m.%d"),
        "UTCTime": end_time.strftime("%H:%M:%S"),
        "WhiteElo": str(_MOCK_PLAYER_RATING),
        "BlackElo": str(_MOCK_OPPONENT_RATING),
        "TimeControl": "180+2",
        "Termination": f"{username} won by checkmate",
    }
    header_lines = "\n".join(f'[{key} "{value}"]' for key, value in headers.items())
    return f"{header_lines}\n\n{_MOCK_MOVES}\n"


def _mock_game_id(month: ArchiveMonth, index: int) -> str:
    return f"{month.year}{month.month:02d}{index:03d}"


def _mock_month_games(username: str, month: ArchiveMonth) -> list[GameResponse]:
    ratings = dict(_MOCK_START_RATINGS)
    start = datetime(month.year, month.month, 1, 9, 0, tzinfo=UTC)
    games = []
    for index in range(MOCK_GAMES_PER_MONTH):
        time_class = _MOCK_TIME_CLASSES[index % len(_MOCK_TIME_CLASSES)]
        result = _MOCK_RESULTS[index % len(_MOCK_RESULTS)]
        ratings[time_class] += _MOCK_RATING_STEP[result]
        player_rating = ratings[time_class]
        opponent_rating = player_rating + (index * 10) % 201 - 100
        game_id = _mock_game_id(month, index + 1)
        kind = "daily" if time_class == TimeClass.DAILY else "live"
        games.append(
            GameResponse(
                id=game_id,
                url=f"https://www.chess.com/game/{kind}/{game_id}",
                time_class=time_class,
                time_control=_MOCK_TIME_CONTROLS[time_class],
                end_time=start + _MOCK_GAME_INTERVAL * index,
                rated=True,
                rules="chess",
                color=PlayerColor.WHITE if index % 2 == 0 else PlayerColor.BLACK,
                result=result,
                player=GameMemberResponse(username=username, rating=player_rating),
                opponent=GameMemberResponse(username=f"{MOCK_OPPONENT}_{index % 5 + 1}", rating=opponent_rating),
            )
        )
    return games


class MockGamesService(GamesService):
    async def get_game_history_list(
        self, username: str, query: PlayerGameHistoryListQuery
    ) -> PaginatedGameListResponse:
        if username.casefold() == MOCK_NOT_FOUND_USERNAME:
            raise ChessAPINotFoundError(f"/player/{username}/games/archives")

        if username.casefold() == MOCK_NO_GAMES_USERNAME:
            if query.year is None or query.month is None:
                return build_game_list([], None, query)
            return build_game_list([], ArchiveMonth(query.year, query.month), query)

        month = ArchiveMonth(MOCK_LATEST_END_TIME.year, MOCK_LATEST_END_TIME.month)
        if query.year is not None and query.month is not None:
            month = ArchiveMonth(query.year, query.month)

        return build_game_list(_mock_month_games(username, month), month, query)

    async def get_game_board_details(
        self, username: str, query: PlayerGameSearchQuery
    ) -> GameBoardDetailsResponse:
        if username.casefold() == MOCK_NOT_FOUND_USERNAME:
            raise ChessAPINotFoundError(f"/player/{username}/games")
        if query.game_id == MOCK_NOT_FOUND_GAME_ID:
            raise ChessComGameNotFoundError(
                username, query.game_id, query.year, query.month
            )

        end_time = MOCK_LATEST_END_TIME
        if query.year is not None and query.month is not None:
            end_time = end_time.replace(year=query.year, month=query.month, day=15)

        return GameBoardDetailsResponse(
            id=query.game_id,
            url=f"https://www.chess.com/game/live/{query.game_id}",
            time_class=TimeClass.BLITZ,
            time_control="180+2",
            end_time=end_time,
            rated=True,
            rules="chess",
            color=PlayerColor.WHITE,
            result=GameResult.WIN,
            player=GameMemberResponse(username=username, rating=_MOCK_PLAYER_RATING),
            opponent=GameMemberResponse(
                username=MOCK_OPPONENT, rating=_MOCK_OPPONENT_RATING
            ),
            pgn=_mock_pgn(username, end_time),
            initial_setup=STANDARD_START_FEN,
            fen=_MOCK_FINAL_FEN,
        )

    async def analyze_game_board(
        self, username: str, query: PlayerGameSearchQuery
    ) -> GameAnalysisResponse:
        raise NotImplementedError("Mock game analysis is not implemented yet")
