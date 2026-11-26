# Play against the computer API

Endpoint behind the In-Game Chess page (main menu "02 / In-Game Chess", `/play`).
Live, always up-to-date docs: run the backend and open `/docs/swagger`.

The server knows the rules and plays the computer: every request carries the position and
the player's move, the server checks it, lets the computer reply and returns the new position
with the player's legal moves. The frontend needs no chess library and no engine.

## Request

```http
POST /api/v1/computer/move
Content-Type: application/json

{ "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "move": "e2e4", "level": "intermediate", "playerColor": "white" }
```

| Field | Default | Values |
|-------|---------|--------|
| `fen` | starting position | Position before the move: send the `fen` of the last response |
| `move` | `null` | The player's move in UCI (`e2e4`, castling `e1g1`, promotion `e7e8q`); `null` starts a game |
| `level` | `intermediate` | `beginner`, `intermediate`, `advanced`, `expert` (strength in `backend/app/stockfish.toml`) |
| `playerColor` | `white` | `white` or `black`; with `black` and no `move` the computer plays first |

## Response `200 OK`

```json
{
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  "playerMove": { "uci": "e2e4", "san": "e4", "fromSquare": "e2", "toSquare": "e4" },
  "computerMove": { "uci": "e7e5", "san": "e5", "fromSquare": "e7", "toSquare": "e5" },
  "turn": "white",
  "legalMoves": ["a2a3", "a2a4", "b1a3", "..."],
  "check": false,
  "status": "playing",
  "winner": null
}
```

| Field | Meaning |
|-------|---------|
| `fen` | Current position; send it with the next move |
| `playerMove`, `computerMove` | The moves just played; `computerMove` is `null` when the game ended with the player's move |
| `legalMoves` | The player's legal moves in UCI; empty when the game is over |
| `status` | `playing`, `checkmate`, `stalemate` or `draw` (insufficient material, 50-move rule) |
| `winner` | `white` / `black` after checkmate, otherwise `null` |

The position is all the server knows about a game, so threefold repetition is not detected.

## Errors

| Status | When | `detail` |
|--------|------|----------|
| `422` | Invalid position, a move that is not allowed, not the player's turn, game already over | `detail[0].msg`, e.g. `This move is not allowed in this position.` |
| `429` | More than 5 requests per second | `{"error": "Rate limit exceeded: 5 per 1 second"}` |
| `503` | Stockfish is not set up (prod) or fails | `The computer can't play right now. Please try again` |

## Who plays the computer

| `RUN_MODE` | `STOCKFISH_PATH` set | Computer |
|------------|----------------------|----------|
| `dev` | no | Built-in basic player (mates in one, takes material, otherwise varies); ignores `level` |
| `dev` / `prod` | yes | Stockfish at the strength of `level` |
| `prod` | no | `503` |

Stockfish is a program installed on each machine, never committed: see `docs/how-to-run.md`.

## Frontend

`frontend/src/features/play-computer/`: `useComputerGame(level)` gives `game` (position,
`legalMoves`, last move, status), `history` (moves in SAN), `start()`, `play(uci)`,
`thinking` and `error`. The board (`TopDownBoard` with `interaction`) lets the player pick a
piece and one of its highlighted squares; a pawn reaching the last rank becomes a queen.
In mock mode (`VITE_API_MODE` unset) the page says that playing needs the backend.
