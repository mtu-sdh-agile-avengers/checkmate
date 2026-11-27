"""Unit tests for the response cache decorator `ttl_cached_response`"""

import inspect

import pytest
from fastapi import Request

from src import caching
from src.caching import clear_caches, request_cache_key, ttl_cached_response


def make_request(path: str, query: str = "") -> Request:
    """A bare GET request (no FastAPI app needed)."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": path,
        "query_string": query.encode(),
        "headers": [],
    }
    return Request(scope)


class FakeClock:
    """Replacement of `caching._clock`: time moves only when a test says so."""

    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def clock(monkeypatch) -> FakeClock:
    fake = FakeClock()
    monkeypatch.setattr(caching, "_clock", fake)
    return fake


# ---- Cache key


def test_key_ignores_username_case_and_query_order():
    a = request_cache_key(
        make_request("/api/v1/players/Hikaru/summary", "timeClass=blitz&period=7")
    )
    b = request_cache_key(
        make_request("/api/v1/players/hikaru/summary", "period=7&timeClass=blitz")
    )

    assert a == b == "/api/v1/players/hikaru/summary?period=7&timeClass=blitz"


def test_key_differs_for_different_query():
    assert request_cache_key(make_request("/x", "page=1")) != request_cache_key(
        make_request("/x", "page=2")
    )


def test_key_keeps_repeated_query_parameters():
    assert request_cache_key(make_request("/x", "tag=a&tag=b")) != request_cache_key(
        make_request("/x", "tag=b")
    )


# ---- Decorator


@pytest.mark.anyio
async def test_result_is_cached_until_ttl_expires(clock):
    calls = []

    @ttl_cached_response(ttl=60)
    async def endpoint(request: Request) -> dict:
        calls.append(1)
        return {"call": len(calls)}

    first = make_request("/x")
    assert await endpoint(request=first) == {"call": 1}
    assert first.state.cache_status == "MISS"

    clock.now += 59  # still fresh
    second = make_request("/x")
    assert await endpoint(request=second) == {"call": 1}  # endpoint did not run
    assert second.state.cache_status == "HIT"

    clock.now += (
        2  # 61 s after the miss: expired (TTL counts from to write, not from the hit)
    )
    assert await endpoint(request=make_request("/x")) == {"call": 2}


@pytest.mark.anyio
async def test_different_urls_are_cached_separately(clock):
    calls = []

    @ttl_cached_response()
    async def endpoint(request: Request) -> str:
        calls.append(request.url.path)
        return request.url.path

    assert await endpoint(request=make_request("/a")) == "/a"
    assert await endpoint(request=make_request("/b")) == "/b"
    assert calls == ["/a", "/b"]


@pytest.mark.anyio
async def test_errors_are_not_cached(clock):
    calls = []

    @ttl_cached_response()
    async def endpoint(request: Request) -> dict:
        calls.append(1)
        raise ValueError("Chess.com is down")

    for _ in range(2):
        request = make_request("/x")
        with pytest.raises(ValueError):
            await endpoint(request=request)
        assert not hasattr(
            request.state, "cache_status"
        )  # no X-Cache header for errors

    assert len(calls) == 2  # the second call ran the endpoint again


@pytest.mark.anyio
async def test_each_endpoint_has_its_own_cache(clock):
    @ttl_cached_response()
    async def first(request: Request) -> str:
        return "first"

    @ttl_cached_response()
    async def second(request: Request) -> str:
        return "second"

    assert await first(request=make_request("/same")) == "first"
    assert (
        await second(request=make_request("/same")) == "second"
    )  # same key, other cache


@pytest.mark.anyio
async def test_maxsize_evicts_least_recently_used(clock):
    calls = []

    @ttl_cached_response(maxsize=2)
    async def endpoint(request: Request) -> str:
        calls.append(request.url.path)
        return request.url.path

    for path in ["/a", "/b", "/c", "/a"]:  # "/c" evicts "/a" -> "/a" runs again
        await endpoint(request=make_request(path))

    assert calls == ["/a", "/b", "/c", "/a"]


@pytest.mark.anyio
async def test_clear_caches_empties_everything(clock):
    calls = []

    @ttl_cached_response()
    async def endpoint(request: Request) -> int:
        calls.append(1)
        return len(calls)

    await endpoint(request=make_request("/x"))
    clear_caches()
    assert await endpoint(request=make_request("/x")) == 2


def test_wrapper_keeps_name_and_signature():
    async def get_player_profile(request: Request, username: str) -> dict:
        return {}

    wrapped = ttl_cached_response()(get_player_profile)

    assert wrapped.__name__ == "get_player_profile"
    assert inspect.signature(wrapped) == inspect.signature(get_player_profile)


def test_function_without_request_is_rejected():
    async def endpoint(username: str) -> dict:
        return {}

    with pytest.raises(TypeError, match="request"):
        ttl_cached_response()(endpoint)


def test_sync_function_is_rejected():
    def endpoint(request: Request) -> dict:
        return {}

    with pytest.raises(TypeError, match="async"):
        ttl_cached_response()(endpoint)
