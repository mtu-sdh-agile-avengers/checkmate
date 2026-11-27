# Analyse a game against the computer API

Endpoint behind the review of a finished In-Game Chess game (`/play/review`).
Live, always up-to-date docs: run the backend and open `/docs/swagger`.

The client sends the whole game; the engine evaluates every position, finds its best move in
each and judges every move played, the same way as a Chess.com game's analysis
(`game-analysis.md`).

## Request

```http
POST /api/v1/computer/analysis
Content-Type: application/json

{ "moves": ["f2f3", "e7e5", "g2g4", "d8h4"] }
```

| Field | Values |
|-------|--------|
| `moves` | Every move in UCI (`e2e4`, promotion `e7e8q`), in order, from the starting position; at most 600. Each must be legal in its position |

## Response `200 OK`

```json
{
  "engine": "Stockfish 17",
  "depth": 18,
  "initialFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "moves": [
    {
      "ply": 3, "moveNumber": 2, "color": "white", "san": "g4", "uci": "g2g4",
      "fen": "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
      "evalCp": -9999, "mateIn": -1,
      "bestMoveSan": "Nc3", "bestMoveUci": "b1c3",
      "category": "blunder"
    }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `engine`, `depth` | Who analysed and how deep; `Built-in evaluator (approximate)` and depth 2 in dev mode without Stockfish |
| `moves[].evalCp` | Evaluation after the move, centipawns, White's view; a forced mate is ±(10000 − moves) |
| `moves[].mateIn` | Forced mate after the move: > 0 White mates, < 0 Black mates, 0 checkmate on the board, `null` if none |
| `moves[].bestMoveSan`, `bestMoveUci` | The engine's best move in the position before this one (the review draws it as an arrow) |
| `moves[].category` | `best`, `good`, `inaccuracy`, `miss` or `blunder`, from the mover's view (thresholds in `backend/app/stockfish.toml`); the review shows `miss` as a mistake |

## Errors

| Status | When | `detail` |
|--------|------|----------|
| `422` | A move not written in UCI, not allowed in its position, or more than 600 moves | `detail[0].msg`, e.g. `Move 2 (e2e5) is not allowed in its position.` |
| `429` | More than 1 request per second | `{"error": "Rate limit exceeded: 1 per 1 second"}` |
| `503` | Stockfish is not set up (prod) or fails | `Error during loading a game. Please try again` |

## Who analyses

| `RUN_MODE` | `STOCKFISH_PATH` set | Engine |
|------------|----------------------|--------|
| `dev` | no | Built-in evaluator (`src/analysis/basic.py`): material, two half-moves and the exchanges under way; it sees pieces left hanging and mates within reach, so the figures are rough |
| `dev` / `prod` | yes | Stockfish at the analysis depth of `stockfish.toml` |
| `prod` | no | `503` |

## Frontend

`frontend/src/features/play-computer/`: `analyseComputerGame(moves)` (api), run by
`useGameReview(game)`, which keeps the analysis with the last finished game in the browser
(`utils/saved-game.ts`), so a reload of the review asks for nothing. In mock mode the review
says it needs the backend.
