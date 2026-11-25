# Checkmate

[![CI/CD](https://github.com/mtu-sdh-agile-avengers/checkmate/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/mtu-sdh-agile-avengers/checkmate/actions/workflows/ci-cd.yml)

Statistics for any Chess.com player: profile, recent and all-time results, player comparison,
game history with move analysis, and a game against the computer (Stockfish).

| Folder | What it is |
| --- | --- |
| `backend/app` | FastAPI server (Python 3.14, uv), Dockerfile with Stockfish |
| `frontend` | React 19 + Vite client |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline: tests, coverage, Docker image, deploy to Azure |
| `docs` | [How to run](docs/how-to-run.md), [deployment on Azure](docs/deployment-azure.md), API notes, team workflow |
