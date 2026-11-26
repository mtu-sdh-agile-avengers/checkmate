"""App configuration.

Settings are loaded by pydantic-settings from the `.env` file; access ONLY through `get_config()`
rather than creating `Config` instance directly.

NOTE: real environment variables override local `.env`; pydentic-settings does not load `.env` vars into os.environ.
"""

from enum import StrEnum
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


# if RunMode is DEV, then mocks are used
class RunMode(StrEnum):
    PROD = "prod"
    DEV = "dev"


class Config(BaseSettings):
    run_mode: Literal[RunMode.PROD, RunMode.DEV]
    api_chesscom_base_url: str
    api_chesscom_user_agent: str
    # Path to the Stockfish executable (machine-specific); engine settings live in
    # `stockfish.toml`. None = Stockfish is not installed / game analysis unavailable.
    stockfish_path: str | None = None

    # Folder of the built frontend (`npm run build`) to serve at "/" next to the API; set in
    # the Docker image. None = API only (in development Vite serves the frontend).
    frontend_dist: str | None = None

    # if initialized, could be overridden by CORS_ORIGINS in .env for other ports; required for Vite client
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # if initialized, could be overridden by CORS_ORIGINS in .env for other ports; required for Vite client
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache  # allows Config object to be created only once, the first time it's called
def get_config() -> Config:
    """Returns the application settings (cached).

    Returns:
        Config: application config object
    """

    # Pyright sees required field(s) with no arguments passed and reports
    # "Argument(s) missing for parameter(s)" error; pydantic-settings fills Config() from the `.env` file
    return Config()  # pyright: ignore[reportCallIssue]
