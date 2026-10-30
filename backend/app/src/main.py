from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import RedirectResponse
from loguru import logger
from fastapi.middleware.cors import CORSMiddleware
from src.config import get_config
from src.rate_limiting import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.api.v1.routers import api_router as api_v1_router
from src.chesscom.client import ChessComClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.debug(f"Server startup in {get_config().run_mode} mode")
    external_chess_api_client = ChessComClient()
    app.state.external_chess_api_client = external_chess_api_client

    yield
    logger.debug("Server shutdown")
    await external_chess_api_client.aclose()


def load_routers(app: FastAPI, *routers: APIRouter):
    for router in routers:
        app.include_router(router)


app = FastAPI(
    lifespan=lifespan,
    title="Checkmate REST API",
    version="0.1.0",
    docs_url="/docs/swagger",
    openapi_url="/docs/openapi.json",
    redoc_url="/docs",
)

# rate limiting set up
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # pyright: ignore[reportArgumentType]

# CORS configuration
logger.debug("Configuring CORS...")
origins = [
    "http://localhost:3000",  # default react app port
    "http://127.0.0.1:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["root"], description='Redirects to "/health"')
@limiter.limit("1/second")
async def root(request: Request):
    logger.debug("GET root route requested")
    return RedirectResponse("/health")


@app.get(
    "/health", tags=["health"], description="Returns server status if it's avaliable."
)
@limiter.limit("1/second")
async def health(request: Request):
    logger.debug("GET health route requested")
    return {"status": "ok"}


logger.debug("Loading routers...")
load_routers(app, api_v1_router)


# cd backend, uv run uvicorn src.main:app --port 8000 --reload | uv run pytest -v
if __name__ == "__main__":
    # to run locally first: npx firebase emulators:start --project demo-agentic-lender
    import uvicorn

    uvicorn.run("src.main:app", reload=True, port=8000)
