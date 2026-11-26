from typing import Annotated

from fastapi import Depends, Request

from src.analysis.stockfish import load_stockfish_config
from src.chesscom.client.client import ExternalChessComAPIClient
from src.config import RunMode, get_config
from src.services.computer import BasicPlayer, ComputerPlayer, StockfishPlayer
from src.services.games import ChessComGamesService
from src.services.mocks.games import MockGamesService
from src.services.mocks.players import MockPlayersService
from src.services.players import ChessComPlayersService
from src.services.protocols import GamesService, PlayersService


def get_external_api_chess_client(request: Request) -> ExternalChessComAPIClient:
    return request.app.state.external_chess_api_client


ExternalApiChessClientDep = Annotated[
    ExternalChessComAPIClient, Depends(get_external_api_chess_client)
]


def get_players_service(chess_client: ExternalApiChessClientDep) -> PlayersService:
    if get_config().run_mode == RunMode.PROD:
        return ChessComPlayersService(chess_client)
    return MockPlayersService()


PlayersServiceDep = Annotated[PlayersService, Depends(get_players_service)]


def get_games_service(chess_client: ExternalApiChessClientDep) -> GamesService:
    if get_config().run_mode == RunMode.PROD:
        return ChessComGamesService(chess_client)
    return MockGamesService()


GamesServiceDep = Annotated[GamesService, Depends(get_games_service)]


def get_computer_player() -> ComputerPlayer:
    """Stockfish when STOCKFISH_PATH is set (or always in prod: without it, 503);
    the built-in BasicPlayer in dev mode without Stockfish."""
    config = get_config()
    if config.stockfish_path or config.run_mode == RunMode.PROD:
        return StockfishPlayer(config.stockfish_path, load_stockfish_config())
    return BasicPlayer()


ComputerPlayerDep = Annotated[ComputerPlayer, Depends(get_computer_player)]
