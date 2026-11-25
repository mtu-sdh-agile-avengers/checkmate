# Checkmate

[![CI/CD](https://github.com/mtu-sdh-agile-avengers/checkmate/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/mtu-sdh-agile-avengers/checkmate/actions/workflows/ci-cd.yml)

Statistics for any Chess.com player: profile, recent and all-time results, player comparison,
game history with move analysis, and a game against the computer (Stockfish).

| Folder | What it is |
| --- | --- |
| `backend/app` | FastAPI server (Python 3.14, uv) |
| `frontend` | React 19 + Vite client |
| `Dockerfile` | production image: the built frontend + the backend + Stockfish in one container |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline: tests, coverage, Docker image, deploy to Azure Container Apps |
| `infra/azure-setup.sh` | creates the Azure resources with the Azure CLI |
| `docs` | [How to run](docs/how-to-run.md), [deployment on Azure](docs/deployment-azure.md), API notes, team workflow |
