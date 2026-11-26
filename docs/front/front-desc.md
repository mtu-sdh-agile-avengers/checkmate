# CHECKMATE

A functional **React + TypeScript + Vite** implementation of the CHECKMATE chess analytics Scholar mockups. Uses a simplified ivory/charcoal design system, feature-based architecture, angled chessboard artwork, accessible forms, responsive layouts, lazy routes, React Query and automated tests.

> **Two data modes.** With `VITE_API_MODE=live` the player search, the profile, the statistics channels (Recent and Overall), the Games channel and Deliberation's comparison show real Chess.com data through our backend API. Without it (the default), every page uses fictional demo data from `src/lib/mock-api.ts`.

## Setup

Requirements: Node.js **20.19+** or **22.12+**, npm.

```bash
npm install
npm run dev
```

Open the local Vite URL (normally <http://localhost:5173>). Type `hikaru` or `https://www.chess.com/member/hikaru` in Search, and submit.

```bash
npm run test         # Vitest + React Testing Library
npm run lint         # ESLint flat config
npm run typecheck    # strict TypeScript
npm run build        # production bundle
npm run format:check # Prettier
```

## Screens and route mapping

Every screen is a view of one chess stage (`src/app/stage-layout.tsx`); moving between them is a camera move: a pan to a player (no fade), or a crane up and tilt down onto the board for In-Game Chess and Deliberation, where the stage fades out as the table fades in.

| Feature | Route | Behaviour |
|---|---|---|
| `player-search` | `/` | Validates usernames and Chess.com member URLs; the main menu sits right under the search |
| `player-profile` + statistics + games | `/players/:username` (`?stats=overall`, `?stats=games`) | The camera pans to the television: profile beside the Recent (`summary-statistics`), Overall (`overall-statistics`) or Games (`game-history`) channel. Games lists a month of games, newest first; choosing one flickers to it (`game-details`: players, outcome, final position, moves), and `&game=<id>&month=YYYY-MM` links straight to it |
| `play-computer` | `/play` | In-Game Chess against Stockfish (on the backend): the camera looks straight down at the board on the table; pick a difficulty and Start game, and the two players walk in from either side and sit down (about 2.6 s, a click or key skips it). You play White: drag a piece to its square (mouse, pen or touch), or click it and then one of its highlighted squares (also by keyboard); the backend checks the move and answers. Every move slides (0.3 s), the computer's too, captures shrink away and castling brings the rook across. The move list in the panel follows the game in pairs (1. e4 e5), and the statistics television left of the board (under it on narrow screens) shows move and half-move count, time, last move, the material balance, and each side's pieces left and taken. A refused move says why in a notification ("Your king would be in check."), and so does a king coming into check, its square red while it lasts. Checkmate, stalemate and draws (50-move rule, insufficient material, threefold repetition, the last detected on the page) bring down the game-over set: You Win, You Lose or Draw and why, with Play Again and Go Back. An engine or network error takes the move back, with Try again (see "In-Game Chess" below) |
| `deliberation` (+ `player-comparison`) | `/deliberation` | Who would win? The VS television drops in to take both players (looked up on Chess.com) and a time class. On Confirm it rises; the board tips towards the viewer and the two play quick games at the table while the comparison runs (its steps and progress beside the table); then a beat, the camera drops to table level and the scene becomes a photograph of the table under one spotlight, the likely winner rising in it and the loser's king toppling, and the verdict television drops with the expected scores, the reasons and every statistic compared. "New comparison" starts again (see "Deliberation scene" below) |

### Deliberation scene

Built like the landing page's stage: CSS 3D perspective and the cut-out artwork of `src/components/chess/stage-art.tsx`, in the ivory/charcoal palette. Player A (White) is ivory everywhere (pieces, figure, half of the VS set), Player B (Black) ink, and each figure wears the player's picture. Every timing, angle, tone and quality threshold is in one object, `src/features/deliberation/config/scene.ts`; the stylesheets read it through custom properties.

| From | What happens | Where |
|---|---|---|
| Confirm | "Locked in", the VS set reels up (1.15 s) | `vs-tv.tsx` |
| +1.15 s | Quick games: a move every 330 ms (scripted real miniatures), pieces slide, hop and take; the player to move reaches for the piece; the board tilts 16° and sways. At least 2.7 s, as long as the comparison takes | `use-rapid-games.ts`, `rapid-board.tsx`, `tabletop.css` |
| Answer + steps | The beat: everything freezes, the table jolts closer (0.65 s) | `use-verdict-sequence.ts`, `tabletop.css` |
| +0.65 s | The camera tips down towards table level (1.4 s) and the table dissolves into the photograph | `tabletop.css`, `photo-scene.css` |
| +1.9 s | One spotlight comes up over the whole table, centred, fading softly into the dark at the edges; the winner rises in it | `photo-scene.css` |
| +2.25 s | The loser's king topples, on the loser's half of the table, in frame | `photo-scene.css` |
| +2.75 s | The verdict set drops (1.05 s), then tunes in | `verdict-tv.css` |

Quality (`use-scene-quality.ts`): `full`; `lite` on a device with ≤ 2 cores or ≤ 2 GB, or measured under 45 fps while the games run: slower games, a flat board (the 2D fallback), no sway, blur, dust or rim light; `still` with reduced motion: nothing moves and every effect is simply there.

### In-Game Chess

The backend stays the judge of every move (python-chess and Stockfish, `POST /api/v1/computer/move`): the board offers only the legal moves it sends. `src/features/play-computer/utils/chess-rules.ts` holds just enough rules for the page to explain itself, never to decide: it shows your move at once while the server answers (the position, its notation, a check it gives), and says why a move the server's list does not have is refused.

| What | How | Where |
|---|---|---|
| Drag and drop | Pointer events, so mouse, pen and touch alike. Press one of your pieces and move 6 px to pick it up; its targets light up and the one under it is marked. Let go on a legal square to play, anywhere else and it slides back. Your pieces' squares take `touch-action: none` (no page scroll while dragging), the others scroll as usual. Click-to-move and the keyboard work as before | `game-board.tsx`, `game-board.css` |
| Move animation | Each piece keeps an id from move to move (`components/chess/board-pieces.ts`, shared with Deliberation), so a move is a 0.3 s ease-in-out slide; captures shrink and fade, castling moves the rook too. The computer's reply waits until your piece has landed. The pieces' layer takes no clicks, so nothing waits for an animation | `board-replay.ts`, `use-computer-game.ts` |
| Your move at once | While the server answers, your move is shown, listed (with "+" if it checks) and the computer is to move; the server's notation replaces it with the reply. If the request fails, the piece slides back and Try again sends it again | `use-computer-game.ts` |
| Move list | Standard notation in numbered pairs, scrolling to the newest move; keyboard-scrollable | `move-list.tsx` |
| Notifications | Non-blocking toasts at the top, read out politely, stacked (four at most), each gone after 3 s: why a move is refused, and a king coming into check (yours or the computer's). The checked king's square glows red | `components/ui/toast-stack.tsx`, `hooks/use-toasts.ts` |
| Game over | A television on cables drops over the dimmed table 0.7 s after the last move: You Win / You Lose / Draw, by checkmate, stalemate, the 50-move rule, insufficient material or threefold repetition. A modal dialog: focus on Play Again, Tab kept inside, Escape puts it away to look at the board, the view behind is inert | `game-over-tv.tsx`, `game-result.ts` |

### Back to the menu

Leaving In-Game Chess or Deliberation for the menu is one camera move on one ease (the stage's `cubic-bezier(.65, 0, .2, 1)`), in one sequence from the click. `data-return` on the stage (`src/app/stage-layout.tsx`) carries it: `leaving` while the view is still on screen, then `settling` until everything is back in place. It outlasts every transition, so none is cut short at the end.

| From | What happens | Where |
|---|---|---|
| 0–0.45 s | The panel and the televisions fade and shrink away | `side-panel.css`, `game-tv.css`, `vs-tv.css`, `verdict-tv.css` |
| 0–0.8 s | The table tilts away the way it came, faded by 0.68 s; Deliberation's photograph pulls back and fades with it | `tabletop.css`, `photo-scene.css` |
| 0.15–1.05 s | The stage settles back down into place, fading in as the table fades out (a cross-fade, never a drop to black) | `stage-layout.css` |
| 0.25–1.15 s | The table set rises back into place and fades in, and the menu item that opened the view takes focus | `stage-layout.css`, `search-page.tsx` |

On narrow screens the view is a column the page scrolls, so the stage keeps that layout while the view leaves (nothing reflows under it) and comes back once it has gone. With reduced motion it is a simple fade: the view fades out and the stage fades in (0.3 s each), at the same time on wide screens and one after the other on narrow ones.

## Architecture

Based on [Bulletproof React](https://github.com/alan2207/bulletproof-react), following **shared → feature → app** dependencies. Each feature imports from its own folder or shared code, never another feature. Route components are lazy-loaded; React Query manages all simulated API data. Simple form/filter state stays local.

```
src/app            application root, providers, route configuration and global CSS
src/components     shared stat cards, navigation, chart, the stage and its cut-out artwork, the top-down table and board, statuses
src/features       player-search, summary-statistics, overall-statistics, player-profile, game-history, game-details, player-comparison, play-computer, deliberation
src/lib            mock API data functions and configured React Query client
src/config         routes, time-frame and time-class options
src/types          shared player/stat domain types
src/utils          URL validation and display formatting
src/testing        Vitest setup and render helpers
```

## Running with the backend (live data)

1. Start the backend: `cd backend/app` and `uv run fastapi dev` (API on <http://localhost:8000>; on Windows, if `uv` is not on your PATH, `py -m uv run fastapi dev`).
   With `RUN_MODE=prod` in `backend/app/.env` it reads real Chess.com data; with `RUN_MODE=dev` it returns its own sample data.
2. In `frontend`, copy `.env.example` to `.env` (it sets `VITE_API_MODE=live`), then run `npm run dev`.
3. Open a player page, e.g. <http://localhost:5173/players/hikaru> or `/players/hikaru/summary`.

The Vite dev server forwards every `/api` request to `http://localhost:8000` (`vite.config.ts`), so no CORS setup is needed.

| Page | Endpoint | Fetcher |
|---|---|---|
| Search (and Deliberation's player lookup) | `GET /api/v1/players/?search=` | `src/features/player-search/api/search-player.ts` |
| Profile | `GET /api/v1/players/{username}/profile` | `src/features/player-profile/api/get-player.ts` |
| Recent statistics | `GET /api/v1/players/{username}/summary?period=&timeClass=` | `src/features/summary-statistics/api/get-summary.ts` |
| Overall statistics | `GET /api/v1/players/{username}/summary?period=all&timeClass=` | `src/features/overall-statistics/api/get-overall.ts` |
| Games channel (list) | `GET /api/v1/players/{username}/games/list?year=&month=&timeClass=&pagingLimit=&page=` | `src/features/game-history/api/get-game-history.ts` |
| Games channel (one game) | `GET /api/v1/players/{username}/games/?search=&year=&month=` | `src/features/game-details/api/get-game.ts` |
| Deliberation (who would win) | `GET /api/v1/players/compare?p1=&p2=&timeClass=` | `src/features/player-comparison/api/compare-players.ts` (run by `src/app/deliberation-screen.tsx`) |
| In-Game Chess (your move and the computer's reply) | `POST /api/v1/computer/move` | `src/features/play-computer/api/play-move.ts` (run by `src/features/play-computer/hooks/use-computer-game.ts`) |

Each fetcher converts the API response into the page's own type (`Player`, `SummaryStats`), so components do not depend on the API format. Error messages from the API (for example an unknown player) are shown on the page as they are; `src/lib/api-client.ts` handles requests and errors.

In mock mode, `src/lib/mock-api.ts` adds an artificial delay to demonstrate loading states. A request for `notfound` or `error` is useful for testing the error screen.

`expectedRating` and `difference` come from the ML rating model (CMG4-11), which does not exist yet: in live mode they are empty and shown as "N/A".

## Mockup fidelity and assumptions

- Search/landing, Summary, Overall and Profile are the four screens retained from the latest Scholar designs; no login or publications were specified.
- In-Game Chess plays Stockfish on the backend, which needs a running backend with Stockfish installed (`docs/how-to-run.md`); in mock mode the panel says so. There is no evaluation bar on the statistics television: the backend returns positions, not evaluations. The games played at the Deliberation table while players are compared are a demonstration (scripted miniatures). The top-down boards draw FEN placements in the stage's cut-out style. Charts and controls are real HTML/SVG components.
- No avatar, unavailable title/FIDE/streamer data, etc., use explicit fallbacks.
- Ratings, win/loss counts, account data and date labels are clearly identified as illustrative examples; user input changes the demo profile handle, not live data.
- The UI is keyboard navigable, uses accessible labels and focus states, respects reduced motion and provides error/loading feedback. A production integration should validate live API response schemas and add end-to-end tests.

## Folders

Look at `PROJECT_TREE.txt` for the complete tree. In particular, each feature has an `api/`, `hooks/`, `components/`, and `types/` (or `utils/`) directory to make its responsibilities explicit.

## Notes for your development environment

Import the folder `checkmate-scholar-react` directly in WebStorm, open the built-in terminal in that folder, run `npm install`, then `npm run dev`. Do not upload `node_modules` to GitHub; `.gitignore` excludes it.
