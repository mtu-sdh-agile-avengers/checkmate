# Chess.com fixtures

Sample Chess.com PubAPI responses used by unit tests (`tests/unit/`).

They follow the documented PubAPI format (https://www.chess.com/news/view/published-data-api)
but use a fictional player (`checkmate_tester`), so tests never depend on real, changing data.

| File | Endpoint |
|------|----------|
| `player_profile.json` | `GET /pub/player/{username}` (all optional fields present) |
| `player_profile_minimal.json` | `GET /pub/player/{username}` (optional fields missing) |
| `player_stats.json` | `GET /pub/player/{username}/stats` |
| `games_archives.json` | `GET /pub/player/{username}/games/archives` |
| `monthly_games.json` | `GET /pub/player/{username}/games/{YYYY}/{MM}` (last game is intentionally malformed) |
| `daily_games.json` | `GET /pub/player/{username}/games` |
| `monthly_games.pgn` | `GET /pub/player/{username}/games/{YYYY}/{MM}/pgn` |

To record a real response (e.g. to check that the format has not changed):

```bash
curl -A "checkmate/0.1" https://api.chess.com/pub/player/hikaru/stats -o player_stats_real.json
```
