# Player comparison API (CMG4-56)

Endpoint behind the two-player comparison page (story CMG4-15; page UI: CMG4-59;
frontend client: CMG4-60). Live, always up-to-date docs: run the backend and open `/docs/swagger`.

## Request

```http
GET /api/v1/players/compare?p1={username|url}&p2={username|url}&timeClass={bullet|blitz|rapid|daily}
```

| Query param | Required | Values |
|-------------|----------|--------|
| `p1` | yes | Player 1: username (`Hikaru`) or member URL (`https://www.chess.com/member/Hikaru`) |
| `p2` | yes | Player 2: same rules; must be a different player than `p1` |
| `timeClass` | yes | `bullet`, `blitz`, `rapid`, `daily` |

Usernames and URLs follow the same rules as the player search (`player-search.md`).

## Response `200 OK`

DEV mock (`RUN_MODE=dev`), shortened:

```json
{
  "timeClass": "blitz",
  "player1": {
    "username": "hikaru", "dayPeriod": "all", "timeClass": "blitz",
    "wins": 4210, "losses": 3895, "draws": 402,
    "rating": { "current": 2318, "highest": 2401, "expected": null, "change": null, "difference": null },
    "ratingHistory": [], "totalGamesPlayed": 8507, "winRate": 0.4949
  },
  "player2": {
    "username": "magnuscarlsen", "dayPeriod": "all", "timeClass": "blitz",
    "wins": 3800, "losses": 3775, "draws": 437,
    "rating": { "current": 2254, "highest": 2361, "expected": null, "change": null, "difference": null },
    "ratingHistory": [], "totalGamesPlayed": 8012, "winRate": 0.4743
  },
  "winLikelihood": { "player1": 0.5911, "player2": 0.4089 },
  "winner": "hikaru"
}
```

| Field | Meaning |
|-------|---------|
| `player1`, `player2` | All-time summary of each player in the time class, exactly as `GET /players/{username}/summary?period=all` (see `player-summary.md`) |
| `winLikelihood` | Elo expected score of each player (0-1, show as %), from their current ratings: `E1 = 1 / (1 + 10^((R2 - R1) / 400))`, `E2 = 1 - E1`. A win counts 1 and a draw 0.5, so it is the share of points each player is expected to score. `null` if a player has no rating in this time class |
| `winner` | Username of the player with the higher likelihood; `null` if equal or `winLikelihood` is `null` |

Examples of the likelihood: equal ratings 50 % / 50 %; +100 points 64 % / 36 %; +200 points 76 % / 24 %; +400 points 91 % / 9 %.

Which player is "better" in a field (green / red highlight on the page, CMG4-15) is decided by
the frontend: higher is better for games, wins, win rate and ratings, lower is better for losses.

## Errors

All errors (except `422`) have the body `{"detail": "<message for the end-user>"}`.

| Status | When | `detail` |
|--------|------|----------|
| `404` | One or both players do not exist | `Player ghost data is unavailable` / `Players ghost1, ghost2 data is unavailable` |
| `422` | Invalid `p1` / `p2` / `timeClass`, or the same player twice | FastAPI validation list; `detail[0].msg` is readable, e.g. `Player 2: Please use a Chess.com link. ...` or `Choose two different players to compare.` |
| `429` | More than 1 request per second | `{"error": "Rate limit exceeded: 1 per 1 second"}` |
| `502` | Chess.com returned an unexpected response | `Chess.com returned an unexpected response` |
| `503` | Chess.com is down or rate-limits us | `Chess.com is not available right now, try again later` |

## How it is computed (`RUN_MODE=prod`, CMG4-89)

Two requests to Chess.com, in parallel: `/player/{p1}/stats` and `/player/{p2}/stats`.
Records and ratings come from these stats (like `period=all`); the likelihood from `rating.current`.

## DEV mode (`RUN_MODE=dev`)

Player 1 gets the sample all-time statistics; player 2 the same sample with a 64-point lower
rating, fewer wins and fewer losses, so each player has fields where they are better.
Every username starting with `notfound` (e.g. `notfound2`) does not exist -> `404`;
`nogames` has no games.

## Frontend (CMG4-60)

`frontend/src/features/player-comparison/` has the client for the comparison page (CMG4-59):

```tsx
import { useComparison, type ComparisonRequest } from '@/features/player-comparison/hooks/use-comparison';

// null until the visitor presses Compare (or Enter), then e.g.
// { player1: 'hikaru', player2: 'https://www.chess.com/member/MagnusCarlsen', timeClass: 'blitz' }
const [request, setRequest] = useState<ComparisonRequest | null>(null);
const { data: comparison, isPending, error } = useComparison(request);
```

`comparison` is `PlayerComparison` (`src/types/chess.ts`): `player1` / `player2` usernames,
`metrics` (one row per statistic: games, wins, draws, losses, win rate, current and highest
rating) where `better` says which value to highlight green (the other one red; `null` = no
highlight), `winLikelihood` in percent with one decimal and `winner`. Both inputs are
checked before the request; `error.message` is ready to show (e.g. "Player 2: ...",
"Choose two different players to compare." or the 404 message above). In mock mode
(`VITE_API_MODE` unset) it returns demo data; usernames starting with `notfound` simulate
unavailable players.
