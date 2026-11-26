# Production image: the React frontend and the FastAPI backend with Stockfish in one container.
# The site is at "/" and the API at "/api/v1" on the same origin (no CORS needed).
# Build from the repository root: docker build -t checkmate .

# 1. Frontend: the static files of the site
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ENV VITE_API_MODE=live \
    VITE_API_BASE_URL=/api/v1
RUN npm run build

# 2. Backend with Stockfish, serving the site too
FROM python:3.14-slim-trixie

# Stockfish 17 from Debian: a portable build that runs on any x86-64 server CPU,
# installed here and never committed to git
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
COPY backend/app/pyproject.toml backend/app/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/app/stockfish.toml ./
COPY backend/app/src ./src
COPY --from=frontend /frontend/dist ./frontend

RUN useradd --create-home --uid 10001 checkmate
USER checkmate

# Settings without a secret; the contact User-Agent comes from the host (Azure)
ENV PATH="/app/.venv/bin:$PATH" \
    RUN_MODE=prod \
    API_CHESSCOM_BASE_URL=https://api.chess.com/pub \
    STOCKFISH_PATH=/usr/games/stockfish \
    FRONTEND_DIST=/app/frontend

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

# --forwarded-allow-ips: behind Azure's proxy, the rate limits use the visitor's IP
# (X-Forwarded-For) instead of the proxy's, which would be shared by every visitor
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
