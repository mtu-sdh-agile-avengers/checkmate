# CHECKMATE — Scholar

A functional **React + TypeScript + Vite** implementation of the CHECKMATE chess analytics Scholar mockups. Uses a simplified ivory/charcoal design system, feature-based architecture, angled chessboard artwork, accessible forms, responsive layouts, lazy routes, React Query and automated tests.

> **Demo only.** Statistics and profile fields are intentionally fictional illustrative fixtures. This app does **not** call Chess.com or determine actual ratings. The `hikaru` username is used as a visual placeholder because it appeared in the supplied mockup; no displayed numbers are verified player records.

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

| Feature | Route | Behaviour |
|---|---|---|
| `player-search` | `/` | Validates usernames and Chess.com member URLs; mutation + redirect |
| `summary-statistics` | `/players/:username/summary` | 7/15/30/All filter, Bullet/Blitz/Rapid/Daily filter, key statistics and rating chart |
| `overall-statistics` | `/players/:username/overall` | All-time totals, rating trend, peak and average opponent |
| `player-profile` | `/players/:username` | Username, URL, avatar fallback, ID, title, timestamps, location, country, followers, streamer, Twitch, FIDE |

## Architecture

Based on [Bulletproof React](https://github.com/alan2207/bulletproof-react), following **shared → feature → app** dependencies. Each feature imports from its own folder or shared code, never another feature. Route components are lazy-loaded; React Query manages all simulated API data. Simple form/filter state stays local.

```
src/app            application root, providers, route configuration and global CSS
src/components     shared stat cards, navigation, chart, board visuals, statuses
src/features       player-search, summary-statistics, overall-statistics, player-profile
src/lib            mock API data functions and configured React Query client
src/config         routes, time-frame and time-class options
src/types          shared player/stat domain types
src/utils          URL validation and display formatting
src/testing        Vitest setup and render helpers
```

## Changing the backend

Replace the functions in `src/features/*/api/` to call your backend (or a backend proxy to the Chess.com API) while preserving the shared `Player`, `SummaryStats` and `OverallStats` types. The mock repository lives in `src/lib/mock-api.ts` and adds an artificial delay to demonstrate loading states. A request for `notfound` or `error` is useful for testing the error screen.

`expectedRating`, `actualRating`, and `difference` in this demo represent a placeholder comparison, **not an official Chess.com prediction or performance rating**. A real implementation needs an explicit rating model and interpretation.

## Mockup fidelity and assumptions

- Search/landing, Summary, Overall and Profile are the four screens retained from the latest Scholar designs; no login or publications were specified.
- The 3D chessboard artwork is cropped from the previously generated Scholar mockups and is intentionally **static**. This is not a live chess engine or 3D scene; on mobile it becomes a responsive illustration. Charts and controls are real HTML/SVG components.
- No avatar, unavailable title/FIDE/streamer data, etc., use explicit fallbacks.
- Ratings, win/loss counts, account data and date labels are clearly identified as illustrative examples; user input changes the demo profile handle, not live data.
- The UI is keyboard navigable, uses accessible labels and focus states, respects reduced motion and provides error/loading feedback. A production integration should validate live API response schemas and add end-to-end tests.

## Folders

Look at `PROJECT_TREE.txt` for the complete tree. In particular, each feature has an `api/`, `hooks/`, `components/`, and `types/` (or `utils/`) directory to make its responsibilities explicit.

## Notes for your development environment

Import the folder `checkmate-scholar-react` directly in WebStorm, open the built-in terminal in that folder, run `npm install`, then `npm run dev`. Do not upload `node_modules` to GitHub; `.gitignore` excludes it.
