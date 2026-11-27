# API optimization

This document describes how Checkmate REST API is optimized.

Chess.com's PubAPI has no fixed rate limit for **serial** requests, but **parallel** ones may
get `429 Too Many Requests`, and a client without a proper `User-Agent` can be blocked. Every
optimization below either avoids a request, makes it cheaper, keeps the client polite, or 
makes our responses smaller.

## Request path

A request to the API passes these layers; in order; the response cache can answer without reaching the rest:

```mermaid
flowchart LR
    browser([Browser]) --> gzip["GZipMiddleware<br/>compresses the response on the way out"]
    gzip --> limit["@limiter.limit 3/second<br/>per-IP rate limit"]
    limit --> ttl{"@ttl_cached_response<br/>fresh response cached?"}
    ttl -- "YES: X-Cache HIT" --> done([Response])
    ttl -- "NO: X-Cache MISS" --> service["Service<br/>players / games"]
    service --> sf{"Single-flight<br/>same path already requested?"}
    sf -- "NO: start a task" --> retry["retry<br/>429 / 5xx / timeouts, up to 3 attempts"]
    sf -. "YES: await that task" .-> retry
    retry --> etag["_get_once<br/>If-None-Match: ETag"]
    etag --> sem["Semaphore<br/>at most 2 parallel requests"]
    sem --> chess[("Chess.com PubAPI<br/>HTTP/2, compressed")]
```

All caches live in the memory of one process. The Docker image runs one uvicorn worker and
the Container App one replica; with more replicas, every replica would have its own caches and
rate limits.

## Chess.com client

### HTTP/2, compression and User-Agent

- `http2=True`: header compression, binary framing and multiplexing over one connection.
- `Accept-Encoding: gzip, deflate, br, zstd`: Chess.com compresses responses over ~200 bytes;
  a busy player's monthly archive is ~2 MB uncompressed; httpx decompresses transparently.
- `User-Agent` with contact information (`API_CHESSCOM_USER_AGENT`), as Chess.com requires.

### Retrying failed requests

Transient errors are retried up to **3 attempts** with **1 s** between them
(`ChessComClient.retry`): 5xx, timeouts and network errors (`ChessAPIUnavailableError`) and `429 Too Many Requests` (`ChessAPIRateLimitError`).

Other errors (e.g. `404 Not Found`) are not retried. When every attempt fails,
`ChessAPITooManyRetriesError` is raised (503 for the user). Each attempt is a separate
conditional request (see [ETag caching](#etag-caching)). Retries can be turned off with
`allow_retry=False` (used in unit tests).

### Concurrency

**Semaphore (limit 2):** at most two requests to Chess.com run at the same time, so parallel work
  (e.g. several monthly archives for a summary) does not trigger `429 Too Many Requests`.

**Single-flight:** concurrent calls for the same path share **one** request. The first call
  starts an `asyncio.Task` and registers it in `_in_flight`; others with the same path
  (case-insensitive) await that task. When it finishes, it removes itself, so the next call
  makes a new request. Only overlapping requests are merged; data is never older than a
  normal request would return.

```mermaid
sequenceDiagram
    participant A as Request A
    participant B as Request B
    participant C as ChessComClient
    participant API as Chess.com
    A->>C: get_player_stats("hikaru")
    Note over C: no task for the path - create one, register in _in_flight
    B->>C: get_player_stats("Hikaru")
    Note over C: task found - await the same task
    C->>API: GET /player/hikaru/stats (once)
    API-->>C: 200 OK
    Note over C: task done - remove it from _in_flight
    C-->>A: response
    C-->>B: the same response
```

- `asyncio.shield`: a cancelled caller (closed tab) does not cancel the shared request.
- Errors reach every waiting caller; one series of retries serves all of them.

> [!NOTE] 
> It helps when many users open the same player at once, when a popular player's cache entry expires, 
> or when Chess.com is slow and requests pile up.

### ETag caching

Chess.com sends an [`ETag` with each response](https://support.chess.com/en/articles/9650547-what-is-the-pubapi-and-how-do-i-use-it#h_6043ff32a8). The client keeps the last `200 OK` response of a
path and sends its ETag in `If-None-Match` next time:

```mermaid
sequenceDiagram
    participant C as ChessComClient
    participant API as Chess.com
    C->>API: GET /player/hikaru/stats
    API-->>C: 200 OK, ETag "v1", body
    Note over C: store ("v1", response)
    C->>API: GET /player/hikaru/stats, If-None-Match "v1"
    alt data not changed
        API-->>C: 304 Not Modified, no body
        Note over C: return the stored response
    else data changed
        API-->>C: 200 OK, ETag "v2", new body
        Note over C: replace the stored response
    end
```

- `304 Not Modified` - the cached response is returned (no body is downloaded);
- `200 OK` with an ETag - the new response replaces the cached one;
- `200 OK` without an ETag - the entry is dropped (nothing to revalidate);
- errors (404, 503, ...) leave the cached entry as it is.

Limits (least recently used entries are evicted first):

| Limit | Value | Why |
|---|---|---|
| `CACHE_MAX_ENTRIES` | 512 | caps the number of cached paths |
| `CACHE_MAX_BYTES` | 64 MiB of decoded bodies | a busy month is ~2 MB: 512 of them would be ~1 GB |

The key is the lower-cased path: Chess.com usernames are case-insensitive.

## Response cache

`@ttl_cached_response()` keeps an endpoint's result in memory, so a repeated request does not
reach the service (and Chess.com) at all:

- **TTL:** 2 minutes (game analysis: 30 minutes); counted from when the result was stored.
- **Size:** 256 entries per endpoint, least recently used evicted first.
- **Key:** lower-cased path + query parameters in sorted order, e.g.
  `/api/v1/players/hikaru/summary?period=7&timeClass=blitz` (`Hikaru` / `hikaru` and any
  parameter order share one entry).
- **Only successful results** are cached; errors are recomputed next time.
- **`X-Cache` response header:** `MISS` (computed now) or `HIT` (served from the cache).
- Every endpoint that calls Chess.com or Stockfish is decorated, right below
  `@limiter.limit`. The rate limit therefore also counts cache hits; it is 3 requests per
  second per IP, enough for quickly switching filters.

## How caching works together

Within the TTL, Chess.com is not called at all; after it, the ETag makes the refresh cheap when
the data has not changed.

```mermaid
sequenceDiagram
    participant U as Browser
    participant T as Response cache (TTL 2 min)
    participant E as ChessComClient (ETag cache)
    participant API as Chess.com

    Note over U,API: t = 0 - nothing cached yet
    U->>T: GET /players/hikaru/summary?period=all
    T->>E: not cached - call the service
    E->>API: GET /player/hikaru/stats
    API-->>E: 200 OK, ETag "v1", body
    Note over E: store ETag "v1" and the body
    E-->>T: response
    Note over T: store the result for 2 minutes
    T-->>U: X-Cache MISS

    Note over U,API: t = 1 min - within the TTL
    U->>T: the same request
    T-->>U: X-Cache HIT (Chess.com is not called)

    Note over U,API: t = 3 min - TTL expired, ETag still stored
    U->>T: the same request
    T->>E: expired - call the service again
    E->>API: GET /player/hikaru/stats, If-None-Match "v1"
    API-->>E: 304 Not Modified, no body
    E-->>T: the stored response
    T-->>U: X-Cache MISS (the body is not downloaded again)
```

## Response compression

`GZipMiddleware(minimum_size=1000, compresslevel=5)` compresses responses of 1000+ bytes for
clients that send `Accept-Encoding: gzip` (every modern browser does): game lists, analyses (a FEN per
move), the frontend build.

> [!NOTE] 
> Level 5 compresses almost as well as level 9 at a fraction of the CPU cost.
