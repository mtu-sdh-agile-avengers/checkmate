# Game history list API (CMG4-52, CMG4-86)

Endpoint behind the game history list (story CMG4-14; page UI: CMG4-54; frontend client:
CMG4-55). Live, always up-to-date docs: run the backend and open `/docs/swagger`.

## Request

```http
GET /api/v1/players/{username}/games/list?year={int}&month={int}&timeClass={bullet|blitz|rapid|daily}&sortBy={matchDateTime|avgRating}&sortOrder={asc|desc}&pagingLimit={5|10|15|30|50|100}&page={int}
```

| Query param | Default | Values |
|-------------|---------|--------|
| `year`, `month` | latest archive month | archive month (the month the games ended, UTC); both or neither |
| `timeClass` | all time classes | `bullet`, `blitz`, `rapid`, `daily` |
| `sortBy` | `matchDateTime` | `matchDateTime` (end time) or `avgRating` (average of both ratings) |
| `sortOrder` | `desc` | `asc`, `desc` |
| `pagingLimit` | `50` | `5`, `10`, `15`, `30`, `50`, `100` games per page |
| `page` | `1` | page number, from 1 |

## Response `200 OK`

Real Hikaru data (`year=2026&month=10&timeClass=blitz&pagingLimit=5`), first item only:

```json
{
  "year": 2026,
  "month": 10,
  "items": [
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
      "avgRating": 3376.0
    }
  ],
  "pagingLimit": 5,
  "totalGames": 8,
  "totalPages": 2,
  "page": 1,
  "hasNext": true
}
```

Every item has the same fields as the game details (`game-details.md`) without the PGN / FEN.
`year` / `month` are `null` when the player has no games; `totalGames` counts the games of the
month after the `timeClass` filter.

Errors: `404` player does not exist, `422` invalid params or only one of `year` / `month`,
`429` / `502` / `503` as for every endpoint.

## Frontend (CMG4-55)

`frontend/src/features/game-history/` has the client for the game history list (CMG4-54):

```tsx
import { useGameHistory } from '@/features/game-history/hooks/use-game-history';

const { data: page, isPending, isPlaceholderData, error } = useGameHistory('hikaru', {
  timeClass: 'blitz',     // every filter is optional
  sortBy: 'avgRating',
  sortOrder: 'desc',
  pageSize: 50,
  page: 1,
});
// open a game: useGame(username, item.id, item.archive) on the game page
```

`page` is `GameHistoryPage` (`src/types/chess.ts`): `items` (`GameListItem`: both players with
rating and color, result, time class, time control in words, `date`, `dateTime`, average
rating and `archive` to open the game page), `totalGames`, `totalPages`, `page`, `hasNext`.
While another page loads the previous one stays on screen. In mock mode (`VITE_API_MODE`
unset) it returns 60 demo games a month; `notfound` fails and `nogames` has no games.
