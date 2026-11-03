# Player statistics summary API (CMG4-48)

Contract of the endpoint behind the "Overall and recent statistics" page (CMG4-13).
Live, always up-to-date docs: run the backend and open `/docs/swagger`.

## Request

```http
GET /api/v1/players/{username}/summary?period={1|7|15|30|all}&timeClass={bullet|blitz|rapid|daily}
```

| Query param | Required | Values | Default |
|-------------|----------|--------|---------|
| `period` | no | `1`, `7`, `15`, `30` (last N days), `all` (all-time) | `all` |
| `timeClass` | yes | `bullet`, `blitz`, `rapid`, `daily` | – |

Query params are camelCase; unknown params (e.g. `time_class`) are rejected with `422`.

## Response `200 OK`

```json
{
  "username": "hikaru",
  "dayPeriod": "7",
  "timeClass": "blitz",
  "wins": 23,
  "losses": 15,
  "draws": 4,
  "rating": {
    "current": 2318,
    "highest": 2401,
    "expected": null,
    "change": 18,
    "difference": null
  },
  "ratingHistory": [
    { "date": "2026-11-02T09:17:02Z", "rating": 2310 },
    { "date": "2026-11-03T02:05:02Z", "rating": 2320 },
    { "date": "2026-11-03T18:53:02Z", "rating": 2318 }
  ],
  "totalGamesPlayed": 42,
  "winRate": 0.5476
}
```

| Field | Meaning |
|-------|---------|
| `wins`, `losses`, `draws`, `totalGamesPlayed` | Rated standard chess games of the time class in the period (`all`: all-time record). |
| `winRate` | `wins / totalGamesPlayed`, 0..1 (show as %); `0.0` when there are no games. |
| `rating.current` / `rating.highest` | Current and best-ever rating of the time class; `null` if never played. |
| `rating.expected` | ML-estimated rating (CMG4-11); `null` until the model exists. |
| `rating.difference` | `expected - current`; `null` while `expected` is `null`. |
| `rating.change` | Rating change over the period ("+18 Elo"); `null` for `all` or when there are no games. |
| `ratingHistory` | Rating after each game, oldest first (rating trend chart); empty for `all`. |

**No games in the period:** still `200`, with `totalGamesPlayed: 0` – the page shows
"No games in the last X days".

## Errors

All errors have the body `{"detail": "<message for the end-user>"}`.

| Status | When |
|--------|------|
| `404` | Player does not exist, e.g. `"ghost player data is not available / does not exist"` |
| `422` | Invalid query params (FastAPI validation error format) |
| `429` | Too many requests to our API (rate limit) |
| `502` | Chess.com returned an unexpected response |
| `503` | Chess.com is unavailable or rate-limits us – try again later |

## Mock (`RUN_MODE=dev`)

In dev mode the endpoint returns deterministic sample data without calling Chess.com:

- any username – sample statistics (numbers depend on `period` and `timeClass`)
- `nogames` – a player with no games in the period
- `notfound` – `404` error
