"""Application level response cache (TTL).

A thin layer over `cachetools.TTLCache`: `@ttl_cached_response()` keeps the result of an endpoint in
memory for `ttl` (Time-To-Live) seconds, keyed by the request URL (path + query parameters).

A repeat request within the TTL is answered without calling Chess.com (i.e., without calling client.py functions) at all;
once it has expired, ETag cache in `ChessComClient` makes the refresh cheap if requested
data was not modified (`304 Not Modified`).
"""

import functools
import inspect
import time
from collections.abc import Awaitable, Callable
from typing import cast
from urllib.parse import urlencode

from cachetools import TTLCache
from fastapi import Request
from loguru import logger

CACHE_TTL_SECONDS = 2 * 60  # how long a response is served from memory; Time-To-Live
CACHE_MAX_ENTRIES = (
    256  # max entries per endpoint; Least Recently Used (LRU) entries are evicted first
)

_caches: list[
    TTLCache
] = []  # every cache created by @ttl_cached_response (to clear them in tests)


def _clock() -> float:
    """Time source of all caches (monotonic, i.e., not affected by system clock changes); patched in tests."""
    return time.monotonic()


def ttl_cached_response[**P, R](
    ttl: float = CACHE_TTL_SECONDS, maxsize: int = CACHE_MAX_ENTRIES
) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]:
    """Caches result of an async endpoint for `ttl` seconds, keyed by the request URL.

    Each decorated endpoint gets its own `TTLCache`. Only successful results are cached: if the
    endpoint raises (404, 503, ...), the exception propagates and nothing is stored. The result of
    a cache hit is the same object that was returned on the miss.

    Sets `request.state.cache_status` to "HIT" or "MISS" (used for the `X-Cache` response header).

    Place it right above the endpoint function, below `@limiter.limit`.

    Args:
        ttl (float): Seconds a cached result is served before the endpoint runs again
        (counted from the moment it was stored, not from the last read).
        maxsize (int): Max number of cached results of this endpoint; when exceeded, expired and
        then least recently used entries are evicted.

    Raises:
        TypeError: When decorating a function that is not async or has no `request` parameter
        (raised once at import time, not on a request).

    Returns:
        Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[R]]]: Decorator that wraps
        an endpoint, keeping its signature (so FastAPI still injects its parameters).
    """

    def decorator(func: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
        if not inspect.iscoroutinefunction(func):
            raise TypeError(
                f"{func.__qualname__}: @ttl_cached_response supports only async functions"
            )

        if "request" not in inspect.signature(func).parameters:
            raise TypeError(
                f"{func.__qualname__}: @ttl_cached_response requires a `request: Request` parameter"
            )

        # one cache per endpoint; `lambda` reads `_clock` at call time (tests can patch it)
        cache: TTLCache[str, R] = TTLCache(
            maxsize=maxsize, ttl=ttl, timer=lambda: _clock()
        )
        _caches.append(cache)

        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            request = cast(
                Request, kwargs["request"]
            )  # required for Pyright to work properly
            key = request_cache_key(request)

            try:
                data = cache[key]
            except KeyError:
                data = await func(*args, **kwargs)
                cache[key] = data
                request.state.cache_status = "MISS"
                return data

            request.state.cache_status = "HIT"
            logger.debug(f"Response cache hit: {key}")
            return data

        return wrapper

    return decorator


def request_cache_key(request: Request) -> str:
    """Returns cache key: lower-cased path + sorted query string.

    Requests that differ only in the username case or in the order of query parameters get the
    same key.

    Args:
        request (Request): Incoming HTTP request.

    Returns:
        str: Cache key, e.g. `/players/Hikaru/summary?timeClass=blitz&period=7`.
    """
    query = urlencode(sorted(request.query_params.multi_items()))
    return f"{request.url.path.lower()}?{query}"


def clear_caches() -> None:
    """Empties (clears) all response caches (useful for tests, so they don't see each other data)."""
    for cache in _caches:
        cache.clear()
