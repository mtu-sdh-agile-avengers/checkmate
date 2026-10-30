from typing import Annotated

from fastapi import Depends

from app.src.config import RunMode, get_config
from app.src.services.games import GamesService
from app.src.services.users import PlayersService


def get_players_service() -> PlayersService:
    if get_config().run_mode == RunMode.PROD:
        raise NotImplementedError("PlayersService for PROD mode is not implemented yet")
    raise NotImplementedError("PlayersService for DEV mode is not implemented yet")

PlayersServiceDep = Annotated[PlayersService, Depends(get_players_service)]
   
    
def get_games_service() -> GamesService:
    if get_config().run_mode == RunMode.PROD:
        raise NotImplementedError("GamesService for PROD mode is not implemented yet")
    raise NotImplementedError("GamesService for DEV mode is not implemented yet")
    
GamesServiceDep = Annotated[GamesService, Depends(get_games_service)]