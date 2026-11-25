"""Shared pytest configuration and fixtures.

Every test gets ONE level marker (registered in pyproject.toml), so CI can run and report
the levels separately (`pytest -m unit`):
- unit: tests/unit, black-box tests of one function or class with fakes;
- integration: tests/api and tests/test_health.py (the whole app through HTTP) and the
  tests marked `integration` that start a real Stockfish process;
- acceptance: tests/acceptance, white-box tests of the non-functional requirements
  (speed, accuracy, memory use, rate limits).

Required settings are provided here as environment variables, so tests do not depend on
a developer's local `.env` file (and can run in CI). Real environment variables, if set,
still take priority. This must happen before `src` modules are imported, because
`src.chesscom.client` reads the config at import time.
"""

import json
import os
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("RUN_MODE", "dev")
os.environ.setdefault("API_CHESSCOM_BASE_URL", "https://api.chess.com/pub")
os.environ.setdefault("API_CHESSCOM_USER_AGENT", "checkmate-tests/0.1")

TESTS_DIR = Path(__file__).parent
FIXTURES_DIR = TESTS_DIR / "fixtures"
TEST_LEVELS = ("unit", "integration", "acceptance")


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Marks every test with its level by folder, unless it already has a level marker."""
    for item in items:
        if any(item.get_closest_marker(level) for level in TEST_LEVELS):
            continue
        folder = item.path.relative_to(TESTS_DIR).parts[0]
        level = folder if folder in ("unit", "acceptance") else "integration"
        item.add_marker(getattr(pytest.mark, level))


@pytest.fixture
def chesscom_fixture() -> Callable[[str], object]:
    """Loads a sample Chess.com response from `tests/fixtures/chesscom`.

    `.json` files are returned decoded (dict); any other file is returned as text.
    """

    def load(name: str) -> object:
        path = FIXTURES_DIR / "chesscom" / name
        text = path.read_text(encoding="utf-8")
        return json.loads(text) if path.suffix == ".json" else text

    return load


@pytest.fixture
def api_client() -> Iterator[TestClient]:
    """Test client of the whole app with rate limiting disabled.

    Tests can replace dependencies via `api_client.app.dependency_overrides`;
    overrides are cleared after each test.
    """
    from src.main import app  # imported here, after the env defaults above are set
    from src.rate_limiting import limiter

    limiter.enabled = False  # tests send many requests per second
    try:
        with TestClient(app) as client:
            yield client
    finally:
        limiter.enabled = True
        app.dependency_overrides.clear()
