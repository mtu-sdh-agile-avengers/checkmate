# CHECKMATE

A functional **React + TypeScript + Vite** implementation of the CHECKMATE chess analytics Scholar mockups. Uses a simplified ivory/charcoal design system, feature-based architecture, angled chessboard artwork, accessible forms, responsive layouts, lazy routes, React Query and automated tests.

> **Two data modes.** With `VITE_API_MODE=live` the player search, the profile and both statistics channels (Recent and Overall) show real Chess.com data through our backend API. Without it (the default), every page uses fictional demo data from `src/lib/mock-api.ts`.

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
| `player-profile` + statistics | `/players/:username` (`?stats=overall`) | The camera pans to the television: profile beside the Recent (`summary-statistics`) or Overall (`overall-statistics`) channel |
| `play-computer` | `/play` | In-Game Chess: the camera looks straight down at the board on the table, difficulty panel (cosmetic until the game engine exists) |
| `deliberation` | `/deliberation` | Player vs player: the table from above with a player at each end, the VS television dropping in to pick both players (looked up on Chess.com) |

## Architecture

Based on [Bulletproof React](https://github.com/alan2207/bulletproof-react), following **shared → feature → app** dependencies. Each feature imports from its own folder or shared code, never another feature. Route components are lazy-loaded; React Query manages all simulated API data. Simple form/filter state stays local.

```
src/app            application root, providers, route configuration and global CSS
src/components     shared stat cards, navigation, chart, the stage and its cut-out artwork, the top-down table and board, statuses
src/features       player-search, summary-statistics, overall-statistics, player-profile, play-computer, deliberation
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

Each fetcher converts the API response into the page's own type (`Player`, `SummaryStats`), so components do not depend on the API format. Error messages from the API (for example an unknown player) are shown on the page as they are; `src/lib/api-client.ts` handles requests and errors.

In mock mode, `src/lib/mock-api.ts` adds an artificial delay to demonstrate loading states. A request for `notfound` or `error` is useful for testing the error screen.

`expectedRating` and `difference` come from the ML rating model (CMG4-11), which does not exist yet: in live mode they are empty and shown as "N/A".

## Mockup fidelity and assumptions

- Search/landing, Summary, Overall and Profile are the four screens retained from the latest Scholar designs; no login or publications were specified.
- In-Game Chess and Deliberation are **cosmetic**: there is no game engine yet. The top-down board draws a FEN placement (the start position) in the stage's cut-out style, which the engine will drive later. Charts and controls are real HTML/SVG components.
- No avatar, unavailable title/FIDE/streamer data, etc., use explicit fallbacks.
- Ratings, win/loss counts, account data and date labels are clearly identified as illustrative examples; user input changes the demo profile handle, not live data.
- The UI is keyboard navigable, uses accessible labels and focus states, respects reduced motion and provides error/loading feedback. A production integration should validate live API response schemas and add end-to-end tests.

## Folders

Look at `PROJECT_TREE.txt` for the complete tree. In particular, each feature has an `api/`, `hooks/`, `components/`, and `types/` (or `utils/`) directory to make its responsibilities explicit.

## Notes for your development environment

Import the folder `checkmate-scholar-react` directly in WebStorm, open the built-in terminal in that folder, run `npm install`, then `npm run dev`. Do not upload `node_modules` to GitHub; `.gitignore` excludes it.
