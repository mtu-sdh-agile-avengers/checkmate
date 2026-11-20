# Game details API (CMG4-61)

Endpoint behind the game page (story CMG4-17; page UI: CMG4-63; frontend client: CMG4-64).
Live, always up-to-date docs: run the backend and open `/docs/swagger`.

## Request

```http
GET /api/v1/players/{username}/games/?year={int}&month={int}&search={game_id|url}
```

| Param | Required | Values |
|-------|----------|--------|
| `username` (path) | yes | Chess.com username of one of the two players |
| `search` | yes | Chess.com game id (`169586417316`) or game URL (`https://www.chess.com/game/live/169586417316`, `.../game/daily/912345678`, `.../analysis/game/live/...`) |
| `year` | no | archive year (>= 2007) |
| `month` | no | archive month `1`-`12`; send `year` and `month` together or neither |

Chess.com stores games in monthly archives (by the month the game **ended**, UTC). With
`year` and `month` the game is looked up in that archive; without them, in the player's
**latest** archive month. The game history list (CMG4-14) gives `year` / `month` for every
game, so links from it always find the game; a pasted game URL without them works only for
games from the latest month.

Query params are camelCase; unknown params (e.g. `gameId`) are rejected with `422`.
The same query is used by `GET .../games/analyze/` (CMG4-73).

## Response `200 OK`

```json
{
  "id": "186299800014",
  "url": "https://www.chess.com/game/live/186299800014",
  "timeClass": "blitz",
  "timeControl": "180",
  "endTime": "2026-10-31T19:39:20Z",
  "rated": true,
  "rules": "chess",
  "color": "white",
  "result": "win",
  "player": { "username": "Hikaru", "rating": 3453 },
  "opponent": { "username": "Sina-Movahed", "rating": 3299 },
  "avgRating": 3376.0,
  "pgn": "[Event \"Live Chess\"]\n[Site \"Chess.com\"]\n...\n\n1. e4 {[%clk 0:03:00]} 1... c5 ...",
  "initialSetup": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "fen": "8/6p1/6Pb/kP5P/8/8/3p4/3K1B2 b - - 7 79"
}
```

| Field | Meaning |
|-------|---------|
| `id`, `url` | Chess.com game id and link |
| `timeClass` | `bullet`, `blitz`, `rapid` or `daily` |
| `timeControl` | `<base seconds>[+<increment>]`, daily games: `1/<seconds per move>` |
| `endTime` | when the game ended (UTC) |
| `rated`, `rules` | rated game?; `chess` for standard chess, otherwise the variant (`chess960`, ...) |
| `color`, `result` | color and result (`win` / `loss` / `draw`) of the **requested** player |
| `player`, `opponent` | username (as written on Chess.com) and rating **after** the game |
| `avgRating` | average of both ratings |
| `pgn` | the whole game in PGN, incl. headers and clock comments (`{[%clk ...]}`) |
| `initialSetup`, `fen` | start and final position in FEN |

## Errors

All errors (except `422`) have the body `{"detail": "<message for the end-user>"}`.

| Status | When | `detail` |
|--------|------|----------|
| `404` | The player does not exist | `ghost player data is not available / does not exist` |
| `404` | The game is not in the archive month | `Game 123 was not found in hikaru's games from 2026-10` |
| `422` | Invalid `search`, only one of `year` / `month`, month not 1-12 | FastAPI validation list; `detail[0].msg` is readable, e.g. `Send both year and month, or neither of them.` |
| `429` | More than 1 request per second | `{"error": "Rate limit exceeded: 1 per 1 second"}` |
| `502` | Chess.com returned an unexpected response | `Chess.com returned an unexpected response` |
| `503` | Chess.com is down or rate-limits us | `Chess.com is not available right now, try again later` |

## DEV mode (`RUN_MODE=dev`)

Every game id returns the same sample game (the "Opera game", 17 moves): the requested
player is white and wins by checkmate, the opponent is `mock_opponent`, ratings 1512 / 1488.
`endTime` is in the requested `year` / `month` (3 Nov 2026 without them).
Special values: username `notfound` -> `404` (player), `search=0` -> `404` (game).

## Frontend (CMG4-64)

`../../../frontend/src/features/game-details` has the client for the game page (CMG4-63):

```tsx
import { useGame } from '@/features/game-details/hooks/use-game';

// archive (year / month) comes with every game of the history list (CMG4-14);
// without it the backend looks in the latest month
const { data: game, isPending, error } = useGame('hikaru', '186299800014', { year: 2026, month: 10 });
```

`game` is `GameDetails` (`src/types/chess.ts`): `player` / `opponent` with `username`, `rating`
and `color`, `result` of the player, `timeClass`, `timeControl` in words ("3 min + 2 s"),
`date` ("Oct 31, 2026"), `averageRating`, and `pgn` / `initialFen` / `finalFen` for the replay.
`error.message` is ready to show (e.g. the 404 message above). In mock mode (`VITE_API_MODE`
unset) it returns the demo "Opera game"; game id `0` simulates "not found".
