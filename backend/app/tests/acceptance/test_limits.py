"""NFR robustness: the API protects itself and serves several users at once.

- a client sending moves too fast gets 429 instead of overloading the engine;
- 20 players moving at the same time all get their answer within 2 seconds.
"""

import asyncio
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from src.dependencies import get_computer_player
from src.main import app
from src.rate_limiting import limiter
from src.services.computer import BasicPlayer

MOVE_URL = "/api/v1/computer/move"


def test_too_many_moves_in_a_second_are_rejected():
    app.dependency_overrides[get_computer_player] = lambda: BasicPlayer()
    limiter.reset()
    try:
        with TestClient(app) as client:
            codes = [client.post(MOVE_URL, json={}).status_code for _ in range(6)]
    finally:
        app.dependency_overrides.clear()
        limiter.reset()

    assert codes[:5] == [200] * 5  # 5 moves per second are allowed
    assert codes[5] == 429


@pytest.mark.anyio
async def test_twenty_players_at_once_are_all_answered_quickly():
    app.dependency_overrides[get_computer_player] = lambda: BasicPlayer()
    limiter.enabled = False
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            start = time.perf_counter()
            responses = await asyncio.gather(
                *(client.post(MOVE_URL, json={"move": "e2e4"}) for _ in range(20))
            )
            elapsed = time.perf_counter() - start
    finally:
        limiter.enabled = True
        app.dependency_overrides.clear()

    assert [r.status_code for r in responses] == [200] * 20
    assert elapsed < 2.0
