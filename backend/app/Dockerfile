# Backend image for production (Azure Container Apps): FastAPI + Stockfish.
# Stockfish is installed here from Debian, never committed to git.
# Build: docker build -t checkmate-backend backend/app
FROM python:3.14-slim-trixie

# Stockfish 17 from Debian: a portable build that runs on any x86-64 server CPU
RUN apt-get update \
    && apt-get install --yes --no-install-recommends stockfish \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.11.32

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv

# Dependencies first: this layer is reused while only the code changes
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY stockfish.toml ./
COPY src ./src

RUN useradd --create-home --uid 10001 checkmate
USER checkmate

# Settings without a secret; the contact User-Agent and CORS_ORIGINS come from the host
ENV PATH="/app/.venv/bin:$PATH" \
    RUN_MODE=prod \
    API_CHESSCOM_BASE_URL=https://api.chess.com/pub \
    STOCKFISH_PATH=/usr/games/stockfish

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

# --forwarded-allow-ips: behind Azure's proxy, the rate limits use the visitor's IP
# (X-Forwarded-For) instead of the proxy's, which would be shared by every visitor
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
