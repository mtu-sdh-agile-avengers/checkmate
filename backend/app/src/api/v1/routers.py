from fastapi import APIRouter
from app.src.api.v1.players import router as players_router
from app.src.api.v1.games import router as games_router


api_router = APIRouter(prefix="/api/v1")

api_router.include_router(players_router)
api_router.include_router(games_router)