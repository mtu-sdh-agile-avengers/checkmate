"""Tests for the Chess.com HTTP client with a mocked transport (no network)."""

import httpx
import pytest

from src.chesscom.client.client import ChessComClient
from src.chesscom.client.exceptions import (
    ChessAPIError,
    ChessAPINotFoundError,
    ChessAPIRateLimitError,
    ChessAPITooManyRetriesError,
    ChessAPIUnavailableError,
)

BASE_URL = "https://api.chess.com/pub"
USER_AGENT = "checkmate-tests/0.1 (contact: test@example.com)"


def make_client(handler) -> ChessComClient:
    return ChessComClient(
        BASE_URL,
        USER_AGENT,
        transport=httpx.MockTransport(handler),
        use_http2=False,
    )


def respond_with(status: int, **kwargs):
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(status, **kwargs)

    handler.requests = requests
    return handler


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("call", "path"),
    [
        (lambda c: c.get_player_profile("hikaru"), "/pub/player/hikaru"),
        (lambda c: c.get_player_stats("hikaru"), "/pub/player/hikaru/stats"),
        (
            lambda c: c.get_player_games_archives("hikaru"),
            "/pub/player/hikaru/games/archives",
        ),
        (
            lambda c: c.get_player_monthly_games("hikaru", "2026", "11"),
            "/pub/player/hikaru/games/2026/11",
        ),
        (lambda c: c.get_player_current_games("hikaru"), "/pub/player/hikaru/games"),
        (lambda c: c.get_titled_players("GM"), "/pub/titled/GM"),
    ],
)
async def test_json_endpoints_call_the_right_path(call, path):
    handler = respond_with(200, json={"ok": True})
    client = make_client(handler)

    assert await call(client) == {"ok": True}

    request = handler.requests[0]
    assert request.url.path == path
    assert request.headers["User-Agent"] == USER_AGENT
    await client.aclose()


@pytest.mark.anyio
async def test_monthly_pgn_is_returned_as_text():
    handler = respond_with(200, text='[Event "Live Chess"]\n\n1. e4 *')
    client = make_client(handler)

    pgn = await client.get_player_monthly_pgn("hikaru", "2026", "11")

    assert pgn.startswith('[Event "Live Chess"]')
    assert handler.requests[0].url.path == "/pub/player/hikaru/games/2026/11/pgn"


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("status", "error"),
    [
        (404, ChessAPINotFoundError),
        (410, ChessAPINotFoundError),
        (429, ChessAPIRateLimitError),
        (500, ChessAPIUnavailableError),
        (503, ChessAPIUnavailableError),
        (403, ChessAPIError),  # e.g. a missing User-Agent with contact info
    ],
)
async def test_http_errors_become_client_errors(status, error):
    client = make_client(respond_with(status))

    with pytest.raises(error):
        await client.get_player_profile("ghost")


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("exception", "message"),
    [
        (httpx.ReadTimeout("slow"), "Timeout"),
        (httpx.ConnectError("offline"), "Network error"),
    ],
)
async def test_timeouts_and_network_errors_mean_unavailable(exception, message):
    def handler(request: httpx.Request) -> httpx.Response:
        raise exception

    client = make_client(handler)

    with pytest.raises(ChessAPIUnavailableError, match=message):
        await client.get_player_stats("hikaru")


def test_custom_transport_with_http2_is_rejected():
    with pytest.raises(ValueError, match="http2"):
        ChessComClient(BASE_URL, USER_AGENT, transport=httpx.MockTransport(None))


@pytest.mark.anyio
async def test_retry_returns_the_first_success():
    client = make_client(respond_with(200))
    attempts = []

    async def flaky() -> str:
        attempts.append(1)
        if len(attempts) < 3:
            raise ChessAPIUnavailableError("down")
        return "ok"

    assert await client.retry(flaky, max_retries=5, timeout=1, retry_interval=0) == "ok"
    assert len(attempts) == 3


@pytest.mark.anyio
async def test_retry_gives_up_after_max_retries():
    client = make_client(respond_with(200))

    async def always_down() -> str:
        raise ChessAPIUnavailableError("down")

    with pytest.raises(ChessAPITooManyRetriesError):
        await client.retry(always_down, max_retries=2, timeout=1, retry_interval=0)
