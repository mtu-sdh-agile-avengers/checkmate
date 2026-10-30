"""App configuration.

Settings are loaded by pydantic-settings from the `.env` file; access ONLY through `get_config()`
rather than creating `Config` instance directly.

NOTE: real environment variables override local `.env`; pydentic-settings does not load `.env` vars into os.environ.
"""


from enum import StrEnum
from functools import lru_cache
from typing import Literal

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# if RunMode is DEV, then mocks are used
class RunMode(StrEnum):
    PROD = "prod"
    DEV = "dev"

class Config(BaseSettings):
    run_mode: Literal[RunMode.PROD, RunMode.DEV]
    
    model_config = SettingsConfigDict(env_file="app/.env", env_file_encoding="utf-8")
    

@lru_cache  # allows Config object to be created only once, the first time it's called
def get_config() -> Config:
    """Returns the application settings (cached).

    Returns:
        Config: application config object
    """
    
    # Pyright sees required field(s) with no arguments passed and reports
    # "Argument(s) missing for parameter(s)" error; pydantic-settings fills Config() from the `.env` file
    return Config()  # pyright: ignore[reportCallIssue]