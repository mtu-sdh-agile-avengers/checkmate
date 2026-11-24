# Game analysis API (CMG4-73)

Endpoint behind the replay and moves history page (story CMG4-18; implementation: CMG4-88;
page UI: CMG4-75; frontend client: CMG4-76). Live, always up-to-date docs: run the backend
and open `/docs/swagger`.

## Request

```http
GET /api/v1/players/{username}/games/analyze?search={game_id|url}&year={int}&month={int}
```

Same parameters as the game details endpoint (`game-details.md`): `search` is a game id or
game URL; `year` and `month` (together or neither) select the archive month, otherwise the
latest month is used.

## Response `200 OK`

DEV mock (the "Opera game", real Stockfish 16 evaluations), shortened:

```json
{
  "gameId": "169586417316",
  "gameUrl": "https://www.chess.com/game/live/169586417316",
  "engine": "Stockfish 16",
  "depth": 15,
  "initialFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": [
    {
      "ply": 1, "moveNumber": 1, "color": "white", "san": "e4", "uci": "e2e4",
      "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      "evalCp": 41, "mateIn": null, "bestMoveSan": "e4", "category": "best"
    },
    {
      "ply": 6, "moveNumber": 3, "color": "black", "san": "Bg4", "uci": "c8g4",
      "fen": "rn1qkbnr/ppp2ppp/3p4/4p3/3PP1b1/5N2/PPP2PPP/RNBQKB1R w KQkq - 1 4",
      "evalCp": 110, "mateIn": null, "bestMoveSan": "Nf6", "category": "inaccuracy"
    },
    {
      "ply": 33, "moveNumber": 17, "color": "white", "san": "Rd8#", "uci": "d1d8",
      "fen": "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17",
      "evalCp": 10000, "mateIn": 0, "bestMoveSan": "Rd8#", "category": "best"
    }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `engine`, `depth` | Engine name and search depth (plies), fixed in `stockfish.toml` |
| `initialFen` | Position before the first move: the board shown before move 1 |
| `moves[]` | Every half-move in order; empty if the game has no moves |
| `ply`, `moveNumber`, `color` | Half-move number (1, 2, 3, ...), move number as in PGN (1, 1, 2, ...) and who moved |
| `san`, `uci` | The move in algebraic notation (for the table) and UCI (for animating the board) |
| `fen` | Position **after** the move: what the board shows when the move is clicked |
| `evalCp` | Evaluation after the move in centipawns, White's point of view (+ = White better). A forced mate counts as +/-(10000 - moves to mate) |
| `mateIn` | Forced mate after the move: moves to mate, + White mates, - Black mates, `0` = checkmate on the board; `null` if none (shown separately from `evalCp`, CMG4-16) |
| `bestMoveSan` | Engine's best move in the position before the move; equals `san` when the best move was played; `null` if unknown (show "N/A") |
| `category` | `best`, `good`, `inaccuracy`, `miss`, `blunder` – from the mover's point of view, by centipawn loss (thresholds in `stockfish.toml`) |

The categories follow the Stockfish thresholds agreed in CMG4-16 (`inaccuracy` instead of the
`excellent` in the original story text).

## Errors

All errors (except `422`) have the body `{"detail": "<message for the end-user>"}`.

| Status | When | `detail` |
|--------|------|----------|
| `404` | The player does not exist | `ghost player data is not available / does not exist` |
| `404` | The game is not in the archive month | `Game 123 was not found in hikaru's games from 2026-10` |
| `422` | Invalid `search`, only one of `year` / `month` | FastAPI validation list; `detail[0].msg` is readable |
| `429` | More than 1 request per second | `{"error": "Rate limit exceeded: 1 per 1 second"}` |
| `502` | Chess.com returned an unexpected response | `Chess.com returned an unexpected response` |
| `503` | The chess engine is unavailable (not installed, crashed) | `Error during loading a game. Please try again` (CMG4-18: show it with a "Retry" button) |
| `503` | Chess.com is down or rate-limits us | `Chess.com is not available right now, try again later` |

## Implementation notes (CMG4-88)

- Find the game like `get_game_board_details` (`ChessComGamesService._find_game`), then
  `parse_pgn_moves(game.pgn)` and `evaluate_moves(...)` from `src/analysis/stockfish.py`
  (on `norbert/dev`).
- `ply` and `fen` are required, so `evaluate_moves` must fill them for every move, plus the
  optional `mate_in`; `move_number` is computed by the schema:

  ```python
  MoveEvaluationResponse(
      ply=move.ply,
      fen=move.fen,  # position after the move
      mate_in=after.score.white().mate(),  # None when there is no forced mate
      color=..., uci=..., san=..., eval_cp=..., best_move_san=..., category=...,
  )
  ```

- Every engine failure must become `GameAnalysisUnavailableError` (`src/services/exceptions.py`),
  otherwise the endpoint answers `500` instead of the `503` above: a missing `STOCKFISH_PATH`
  (instead of `RuntimeError`), `chess.engine.popen_uci` / `configure` failing (`OSError`,
  `EngineError`, `EngineTerminatedError`) and `engine.analyse` failing.

## DEV mode (`RUN_MODE=dev`)

Every game id returns the analysis of the sample game (33 half-moves, real Stockfish 16
evaluations at depth 15). Special values: username `notfound` -> `404` (player),
`search=0` -> `404` (game), `search=503` -> `503` (engine unavailable).
