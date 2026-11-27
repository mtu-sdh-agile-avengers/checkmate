import sys
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.gzip import GZipMiddleware

from src.api.v1.routers import api_router as api_v1_router
from src.chesscom.client.client import ChessComClient
from src.config import get_config
from src.exception_handlers import register_exception_handlers
from src.frontend import add_frontend
from src.rate_limiting import limiter

# loguru logs everything (DEBUG and up) by default: keep only `log_level` and above
logger.remove()
logger.add(sys.stderr, level=get_config().log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.debug(f"Server startup in {get_config().run_mode} mode")
    external_chess_api_client = ChessComClient(
        get_config().api_chesscom_base_url,
        get_config().api_chesscom_user_agent,
    )
    app.state.external_chess_api_client = external_chess_api_client
    try:
        yield
        logger.debug("Server shutdown")
    finally:
        await external_chess_api_client.aclose()


def load_routers(app: FastAPI, *routers: APIRouter):
    for router in routers:
        app.include_router(router)


app = FastAPI(
    lifespan=lifespan,
    title="Checkmate REST API",
    version="0.6.0",
    docs_url="/docs/swagger",
    openapi_url="/docs/openapi.json",
    redoc_url="/docs",
)

# rate limiting set up
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # pyright: ignore[reportArgumentType]

# chess.com errors -> HTTP error responses
register_exception_handlers(app)


# add "X-Cache" header to HTTP response ("HIT" / "MISS")
@app.middleware("http")
async def add_cache_header(request: Request, call_next):
    response = await call_next(request)

    if (cache_status := getattr(request.state, "cache_status", None)) is not None:
        response.headers["X-Cache"] = cache_status

    return response


# CORS configuration
logger.debug("Configuring CORS...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_config().cors_origins,  # 5173: default vite server port
    # allow_credentials=True,
    allow_methods=["GET", "POST"],  # POST: computer moves
    allow_headers=["*"],
)

# gzip compression of files >= 1KB; works for request with "gzip" in the Accept-Encoding
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)


@app.get(
    "/health", tags=["health"], description="Returns server status if it's available."
)
@limiter.limit("1/second")
async def health(request: Request):
    logger.debug("GET health route requested")
    return {"status": "ok"}


logger.debug("Loading routers...")
load_routers(app, api_v1_router)

# the built frontend at "/" in the production image (last: it catches every other path)
add_frontend(app, get_config().frontend_dist)


# cd backend/app, uv run uvicorn src.main:app --port 8000 --reload | uv run pytest -v
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", reload=True, port=8000)
