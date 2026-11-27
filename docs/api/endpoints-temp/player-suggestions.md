# Player suggestions API

Endpoint behind the search box's dropdown: accounts suggested while typing a username.
Live, always up-to-date docs: run the backend and open `/docs/swagger`.

Chess.com has no username search, so the suggestions come from two places: the account with
exactly the name typed (if it exists, with its picture), and Chess.com's lists of titled
players (GM, IM, WGM, FM, WIM, CM, WFM, WCM, NM, WNM; some 20,000 usernames), loaded on the
first request and kept for a day.

## Request

```http
GET /api/v1/players/suggestions?q=hik
```

| Parameter | Values |
|-----------|--------|
| `q` | The start of a username: 2-25 letters, numbers, `_` or `-` (any case) |

## Response `200 OK`

```json
{
  "query": "hik",
  "players": [
    { "username": "hik", "url": "https://www.chess.com/member/Hik", "avatar": "https://images.chesscomfiles.com/…", "title": null, "exact": true },
    { "username": "hikaru", "url": "https://www.chess.com/member/Hikaru", "avatar": null, "title": "GM", "exact": false }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `query` | What was typed, lowercase |
| `players` | At most 8: the exact account first, then titled players whose username starts with `q`, highest title first, then the shortest username, then A to Z |
| `players[].username` | Lowercase, as the player page's address writes it (`/players/{username}`) |
| `players[].exact` | The account with exactly the username typed |

If Chess.com cannot be reached, the suggestions are those it can still give (the titled
players already loaded, maybe none): never an error, since the search itself still works.

## Errors

| Status | When | `detail` |
|--------|------|----------|
| `422` | `q` missing, shorter than 2 or longer than 25 characters, or not a username's characters | `detail[0].msg`: `Type 2-25 characters of a username: letters, numbers, _ or -.` |
| `429` | More than 5 requests per second | `{"error": "Rate limit exceeded: 5 per 1 second"}` |

## Dev mode

`RUN_MODE=dev`: the account typed (every username exists, except `notfound`), then sample
titled players (hikaru, magnuscarlsen, gothamchess, annacramling, ...). `notfound` gets no
suggestions (the empty state).

## Frontend

`frontend/src/features/player-search/`: `suggestPlayers(prefix)` (api), asked by
`usePlayerSuggestions(text)` once typing pauses for 300 ms; `SearchForm` is an ARIA combobox
with the dropdown (`player-suggestions.tsx`), which also offers the players looked up before
(`utils/recent-players.ts`, kept in the browser). Mock mode has its own demo suggestions
(`src/lib/mock-api.ts`).
