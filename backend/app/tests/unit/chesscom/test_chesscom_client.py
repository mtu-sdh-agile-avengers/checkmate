"""Unit tests for ChessComClient with a mocked transport (no network).

Covers request paths, error mapping, retries and ETag caching (conditional requests).
`FakeChessCom` answers with prepared responses in order and records every request,
so tests can check which headers were sent.
"""

import asyncio

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


PROFILE = {"username": "hikaru", "followers": 1}


class FakeChessCom:
    """MockTransport handler: answers with the prepared responses in order and records requests."""

    def __init__(self, *responses: httpx.Response) -> None:
        self._responses = list(responses)
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self._responses.pop(0)

    def if_none_match(self, index: int) -> str | None:
        """`If-None-Match` header of the request number `index` (None if it was not sent)."""
        return self.requests[index].headers.get("If-None-Match")


def ok(body: dict, etag: str | None = None) -> httpx.Response:
    return httpx.Response(200, json=body, headers={"ETag": etag} if etag else {})


def text_ok(body: str, etag: str) -> httpx.Response:
    return httpx.Response(200, text=body, headers={"ETag": etag})


def not_modified() -> httpx.Response:
    return httpx.Response(304)


@pytest.fixture
def no_sleep(monkeypatch):
    """Makes retry pauses instant."""

    async def instant(_seconds: float) -> None:
        pass

    monkeypatch.setattr("src.chesscom.client.client.asyncio.sleep", instant)


def make_client(handler, *, allow_retry=False) -> ChessComClient:
    return ChessComClient(
        BASE_URL,
        USER_AGENT,
        transport=httpx.MockTransport(handler),
        use_http2=False,
        allow_retry=allow_retry,
    )


def respond_with(status: int, **kwargs):
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(status, **kwargs)

    handler.requests = requests
    return handler


# ---- Paths and parsing


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
async def test_compression_is_requested():
    server = FakeChessCom(ok(PROFILE))

    await make_client(server).get_player_profile("hikaru")

    assert "gzip" in server.requests[0].headers["Accept-Encoding"]


@pytest.mark.anyio
async def test_parallel_requests_are_limited():
    in_flight = 0
    max_in_flight = 0

    async def slow_server(request: httpx.Request) -> httpx.Response:
        nonlocal in_flight, max_in_flight
        in_flight += 1
        max_in_flight = max(max_in_flight, in_flight)
        await asyncio.sleep(0.01)  # keeps the request "open" while others start
        in_flight -= 1
        return httpx.Response(200, json={})

    client = ChessComClient(
        BASE_URL,
        USER_AGENT,
        transport=httpx.MockTransport(slow_server),
        use_http2=False,
        allow_retry=False,
        concurrent_requests_limit=2,
    )

    await asyncio.gather(*(client.get_player_profile(f"user{i}") for i in range(5)))

    assert max_in_flight == 2


# ---- Errors


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
async def test_error_keeps_cached_entry():
    server = FakeChessCom(ok(PROFILE, etag='"v1"'), httpx.Response(503), not_modified())
    client = make_client(server)

    await client.get_player_profile("hikaru")
    with pytest.raises(ChessAPIUnavailableError):
        await client.get_player_profile("hikaru")

    assert await client.get_player_profile("hikaru") == PROFILE
    assert server.if_none_match(2) == '"v1"'


# ---- Retries


@pytest.mark.anyio
async def test_retry_returns_the_first_success():
    client = make_client(respond_with(200))
    attempts = []

    async def flaky() -> str:
        attempts.append(1)
        if len(attempts) < 3:
            raise ChessAPIUnavailableError("down")
        return "ok"

    assert await client.retry(flaky, max_retries=5, retry_interval=0) == "ok"
    assert len(attempts) == 3


@pytest.mark.anyio
async def test_retry_gives_up_after_max_retries():
    client = make_client(respond_with(200))

    async def always_down() -> str:
        raise ChessAPIUnavailableError("down")

    with pytest.raises(ChessAPITooManyRetriesError):
        await client.retry(always_down, max_retries=2, retry_interval=0)


@pytest.mark.anyio
async def test_transient_error_is_retried(no_sleep):
    server = FakeChessCom(ok(PROFILE, etag='"v1"'), httpx.Response(503), not_modified())
    client = make_client(server, allow_retry=True)

    await client.get_player_profile("hikaru")
    profile = await client.get_player_profile("hikaru")  # 503, then a retry gets 304

    assert profile == PROFILE
    assert server.if_none_match(2) == '"v1"'  # the retry is a conditional request too


@pytest.mark.anyio
async def test_retries_are_limited(no_sleep):
    server = FakeChessCom(httpx.Response(503), httpx.Response(503), httpx.Response(503))

    with pytest.raises(ChessAPITooManyRetriesError):
        await make_client(server, allow_retry=True).get_player_profile("hikaru")

    assert len(server.requests) == 3  # max_retries attempts in total


@pytest.mark.anyio
async def test_not_found_is_not_retried(no_sleep):
    server = FakeChessCom(httpx.Response(404))

    with pytest.raises(ChessAPINotFoundError):
        await make_client(server, allow_retry=True).get_player_profile("ghost")

    assert len(server.requests) == 1


@pytest.mark.anyio
async def test_rate_limit_is_retried(no_sleep):
    server = FakeChessCom(httpx.Response(429), ok(PROFILE))

    assert (
        await make_client(server, allow_retry=True).get_player_profile("hikaru")
        == PROFILE
    )
    assert len(server.requests) == 2


@pytest.mark.anyio
async def test_retry_waits_retry_interval_between_attempts(monkeypatch):
    pauses: list[float] = []

    async def record(seconds: float) -> None:
        pauses.append(seconds)

    monkeypatch.setattr("src.chesscom.client.client.asyncio.sleep", record)
    client = make_client(FakeChessCom())

    async def always_down() -> str:
        raise ChessAPIUnavailableError("down")

    with pytest.raises(ChessAPITooManyRetriesError):
        await client.retry(always_down, max_retries=3, retry_interval=0.5)

    assert pauses == [0.5, 0.5]  # no pause after the last attempt


@pytest.mark.anyio
async def test_retry_rejects_zero_attempts():
    client = make_client(FakeChessCom())

    async def never_called() -> str:
        raise AssertionError("must not be called")

    with pytest.raises(ValueError, match="max_retries"):
        await client.retry(never_called, max_retries=0)


# ---- ETag caching


@pytest.mark.anyio
async def test_first_request_is_not_conditional():
    server = FakeChessCom(ok(PROFILE, etag='"v1"'))

    assert await make_client(server).get_player_profile("hikaru") == PROFILE
    assert server.if_none_match(0) is None  # nothing cached yet


@pytest.mark.anyio
async def test_304_returns_cached_body():
    server = FakeChessCom(ok(PROFILE, etag='"v1"'), not_modified())
    client = make_client(server)

    await client.get_player_profile("hikaru")
    profile = await client.get_player_profile("hikaru")

    assert profile == PROFILE  # body of the first response; 304 has no body
    assert server.if_none_match(1) == '"v1"'


@pytest.mark.anyio
async def test_username_case_does_not_matter():
    server = FakeChessCom(ok(PROFILE, etag='"v1"'), not_modified())
    client = make_client(server)

    await client.get_player_profile("Hikaru")
    await client.get_player_profile("hikaru")

    assert server.if_none_match(1) == '"v1"'  # same cache entry


@pytest.mark.anyio
async def test_changed_data_replaces_cache_entry():
    server = FakeChessCom(
        ok({"followers": 1}, etag='"v1"'),
        ok({"followers": 2}, etag='"v2"'),  # data changed -> 200 with a new ETag
        not_modified(),
    )
    client = make_client(server)

    await client.get_player_profile("hikaru")
    assert await client.get_player_profile("hikaru") == {"followers": 2}
    assert await client.get_player_profile("hikaru") == {"followers": 2}

    assert server.if_none_match(2) == '"v2"'  # the new ETag is used from now on


@pytest.mark.anyio
async def test_response_without_etag_is_not_cached():
    server = FakeChessCom(ok(PROFILE), ok(PROFILE))
    client = make_client(server)

    await client.get_player_profile("hikaru")
    await client.get_player_profile("hikaru")

    assert server.if_none_match(1) is None  # nothing to revalidate


@pytest.mark.anyio
async def test_cached_body_cannot_be_changed_by_caller():
    server = FakeChessCom(ok(PROFILE, etag='"v1"'), not_modified())
    client = make_client(server)

    profile = await client.get_player_profile("hikaru")
    profile["followers"] = 999  # r.json() builds a new dict every time

    assert await client.get_player_profile("hikaru") == PROFILE


@pytest.mark.anyio
async def test_least_recently_used_entry_is_evicted(monkeypatch):
    monkeypatch.setattr(ChessComClient, "CACHE_MAX_ENTRIES", 2)
    server = FakeChessCom(
        ok({}, etag='"a"'),
        ok({}, etag='"b"'),
        not_modified(),  # "a" again -> becomes the most recently used
        ok({}, etag='"c"'),  # 3 entries > 2: "b" (least recently used) is evicted
        ok({}, etag='"b2"'),
        not_modified(),
    )
    client = make_client(server)

    for username in ["a", "b", "a", "c", "b"]:
        await client.get_player_profile(username)
    await client.get_player_profile("c")

    assert server.if_none_match(4) is None  # "b" was evicted: plain request
    assert server.if_none_match(5) == '"c"'  # "c" is still cached


@pytest.mark.anyio
async def test_unexpected_304_without_cache_is_an_error():
    server = FakeChessCom(not_modified())

    with pytest.raises(ChessAPIError):
        await make_client(server).get_player_profile("hikaru")


@pytest.mark.anyio
async def test_304_returns_cached_pgn_text():
    pgn = '[Event "Live Chess"]\n\n1. e4 *'
    server = FakeChessCom(text_ok(pgn, '"v1"'), not_modified())
    client = make_client(server)

    await client.get_player_monthly_pgn("hikaru", "2026", "11")

    assert await client.get_player_monthly_pgn("hikaru", "2026", "11") == pgn
    assert server.if_none_match(1) == '"v1"'


@pytest.mark.anyio
async def test_response_without_etag_drops_cached_entry():
    server = FakeChessCom(ok(PROFILE, etag='"v1"'), ok(PROFILE), ok(PROFILE))
    client = make_client(server)

    for _ in range(3):
        await client.get_player_profile("hikaru")

    assert server.if_none_match(1) == '"v1"'
    assert server.if_none_match(2) is None  # the 200 without ETag removed the entry


@pytest.mark.anyio
async def test_cache_size_limit_evicts_least_recently_used(monkeypatch):
    monkeypatch.setattr(ChessComClient, "CACHE_MAX_BYTES", 100)
    big = {"data": "x" * 60}  # ~70 bytes of JSON: two of them do not fit in 100
    server = FakeChessCom(
        ok(big, etag='"a"'), ok(big, etag='"b"'), ok(big, etag='"a2"')
    )
    client = make_client(server)

    await client.get_player_profile("a")
    await client.get_player_profile("b")  # over 100 bytes together: "a" is evicted
    await client.get_player_profile("a")

    assert server.if_none_match(2) is None  # "a" had been evicted: plain request


@pytest.mark.anyio
async def test_cache_size_is_tracked_on_replace_and_drop():
    server = FakeChessCom(
        ok(PROFILE, etag='"v1"'), ok(PROFILE, etag='"v2"'), ok(PROFILE)
    )
    client = make_client(server)

    await client.get_player_profile("hikaru")
    size = client._etag_cache_bytes
    await client.get_player_profile("hikaru")  # replaced, not added twice
    assert client._etag_cache_bytes == size

    await client.get_player_profile("hikaru")  # 200 without ETag: entry dropped
    assert client._etag_cache_bytes == 0


# ---- Single-flight

@pytest.mark.anyio
async def test_concurrent_requests_of_same_path_share_one_request():
    server = FakeChessCom(ok(PROFILE))  # one response only: a second request would fail
    client = make_client(server)

    first, second = await asyncio.gather(
        client.get_player_profile("hikaru"),
        client.get_player_profile("Hikaru"),  # same path, other case
    )

    assert first == second == PROFILE
    assert len(server.requests) == 1
    assert client._in_flight == {}  # the finished request was forgotten


@pytest.mark.anyio
async def test_shared_request_error_reaches_every_caller():
    server = FakeChessCom(httpx.Response(404))
    client = make_client(server)

    results = await asyncio.gather(
        client.get_player_profile("ghost"),
        client.get_player_profile("ghost"),
        return_exceptions=True,
    )

    assert all(isinstance(result, ChessAPINotFoundError) for result in results)
    assert len(server.requests) == 1


@pytest.mark.anyio
async def test_sequential_requests_are_not_merged():
    server = FakeChessCom(ok(PROFILE, etag='"v1"'), not_modified())
    client = make_client(server)

    await client.get_player_profile("hikaru")
    await client.get_player_profile("hikaru")

    assert len(server.requests) == 2  # the first had finished: a new (conditional) request
    assert server.if_none_match(1) == '"v1"'


@pytest.mark.anyio
async def test_cancelled_caller_does_not_cancel_others():
    release = asyncio.Event()

    async def slow_server(request: httpx.Request) -> httpx.Response:
        await release.wait()  # holds the request open until the test lets it go
        return httpx.Response(200, json=PROFILE)

    client = make_client(slow_server)
    leaving = asyncio.create_task(client.get_player_profile("hikaru"))
    staying = asyncio.create_task(client.get_player_profile("hikaru"))
    await asyncio.sleep(0)  # both tasks now wait for the same shared request

    leaving.cancel()  # e.g. this user closed the tab
    release.set()

    assert await staying == PROFILE  # the shared request was not cancelled
    with pytest.raises(asyncio.CancelledError):
        await leaving