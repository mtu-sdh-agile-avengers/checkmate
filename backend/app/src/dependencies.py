from typing import Annotated

from fastapi import Depends, Request

from src.config import RunMode, get_config
from src.services.games import GamesService
from src.services.users import PlayersService
from src.chesscom.client import ExternalChessComAPIClient


def get_external_api_chess_client(request: Request) -> ExternalChessComAPIClient:
    return request.app.state.external_chess_api_client


ExternalApiChessClientDep = Annotated[
    ExternalChessComAPIClient, Depends(get_external_api_chess_client)
]


def get_players_service(chess_client: ExternalApiChessClientDep) -> PlayersService:
    if get_config().run_mode == RunMode.PROD:
        raise NotImplementedError("PlayersService for PROD mode is not implemented yet")
    raise NotImplementedError("PlayersService for DEV mode is not implemented yet")


PlayersServiceDep = Annotated[PlayersService, Depends(get_players_service)]


def get_games_service(chess_client: ExternalApiChessClientDep) -> GamesService:
    if get_config().run_mode == RunMode.PROD:
        raise NotImplementedError("GamesService for PROD mode is not implemented yet")
    raise NotImplementedError("GamesService for DEV mode is not implemented yet")


GamesServiceDep = Annotated[GamesService, Depends(get_games_service)]
