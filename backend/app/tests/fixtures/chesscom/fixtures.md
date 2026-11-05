# Chess.com fixtures

Sample Chess.com PubAPI responses used by unit tests (`tests/unit/`).

There are two kinds of fixtures:

- **Real snapshot** (`hikaru_*`): GM Hikaru Nakamura's public data, downloaded on 4 Nov 2026.
  Proves the parser handles the actual Chess.com format. The October 2026 archive is trimmed
  to 13 games (wins, losses and all kinds of draws), the PGN file to 3 of those games.
- **Hand-written samples** (all other files): a fictional player (`checkmate_tester`) in the
  documented format (https://www.chess.com/news/view/published-data-api), covering edge cases
  real data may not contain (missing fields, a malformed game, chess960, a daily game).
  All games are valid chess (checked by replaying them with `python-chess`). The `Annotator`
  header in `monthly_games.pgn` is artificial: it tests escaped quotes.

Facts confirmed with the real data: the `rating` of a player in a game is the rating **after**
that game, and PGN `WhiteElo` / `BlackElo` equal those JSON ratings.

| File | Endpoint |
|------|----------|
| `player_profile.json` | `GET /pub/player/{username}` (all optional fields present) |
| `player_profile_minimal.json` | `GET /pub/player/{username}` (optional fields missing) |
| `player_stats.json` | `GET /pub/player/{username}/stats` |
| `games_archives.json` | `GET /pub/player/{username}/games/archives` |
| `monthly_games.json` | `GET /pub/player/{username}/games/{YYYY}/{MM}` (last game is intentionally malformed) |
| `daily_games.json` | `GET /pub/player/{username}/games` |
| `monthly_games.pgn` | `GET /pub/player/{username}/games/{YYYY}/{MM}/pgn` |
| `hikaru_profile.json` | real: `GET /pub/player/hikaru` |
| `hikaru_stats.json` | real: `GET /pub/player/hikaru/stats` |
| `hikaru_archives.json` | real: `GET /pub/player/hikaru/games/archives` |
| `hikaru_games_2026_10.json` | real: `GET /pub/player/hikaru/games/2026/10` (trimmed to 13 games) |
| `hikaru_games_2026_10.pgn` | real: `GET /pub/player/hikaru/games/2026/10/pgn` (trimmed to 3 games) |

To record a real response again (Windows PowerShell; on Linux / macOS use `curl -A ... -o ...`):

```powershell
Invoke-WebRequest -UserAgent "checkmate/0.1 (contact: your-email)" -Uri "https://api.chess.com/pub/player/hikaru/stats" -OutFile hikaru_stats.json
```

If you refresh a real snapshot, update the expected values in `tests/unit/chesscom_real_data_test.py`.
