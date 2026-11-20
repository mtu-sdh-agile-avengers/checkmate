# Player search API (CMG4-83)

Endpoint behind the search page (CMG4-12, frontend: CMG4-47).
Live, always up-to-date docs: run the backend and open `/docs/swagger`.

## Request

```http
GET /api/v1/players/?search={username|url}
```

| Query param | Required | Values |
|-------------|----------|--------|
| `search` | yes | Chess.com username (`Hikaru`) or member profile URL (`https://www.chess.com/member/Hikaru`) |

Accepted URLs: `http(s)://`, `www.` / `m.` / no subdomain, or no scheme at all
(`chess.com/member/hikaru`); a trailing `/`, `?query` or `#fragment` is ignored.
Usernames are 3-25 letters, digits, `_` or `-` (same rule as the frontend validation).

## Response `200 OK`

```json
{
  "username": "hikaru",
  "url": "https://www.chess.com/member/Hikaru",
  "avatar": "https://images.chesscomfiles.com/uploads/v1/user/15448422.88c010c1.200x200o.3c5619f5441e.png",
  "title": "GM"
}
```

`avatar` and `title` are `null` when the player has none. The frontend opens
`/players/{username}` with the returned `username`.

## Errors

All errors (except `422`) have the body `{"detail": "<message for the end-user>"}`.

| Status | When | `detail` |
|--------|------|----------|
| `404` | The player does not exist | `No Chess.com player found for "ghost"` |
| `422` | `search` is missing, not a valid username or not a Chess.com member URL | FastAPI validation list; `detail[0].msg` is readable, e.g. `Please use a Chess.com link. Use a link like chess.com/member/username.` |
| `429` | More than 1 request per second | `{"error": "Rate limit exceeded: 1 per 1 second"}` |
| `502` | Chess.com returned an unexpected response | `Chess.com returned an unexpected response` |
| `503` | Chess.com is down or rate-limits us | `Chess.com is not available right now, try again later` |

## DEV mode (`RUN_MODE=dev`)

Any valid username is "found" (fixed avatar and title); `notfound` returns `404`.
