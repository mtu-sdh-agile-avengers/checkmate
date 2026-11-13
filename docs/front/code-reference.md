# CHECKMATE Scholar — source code reference

**Complete runnable-project source** in clearly labelled fenced code blocks. Generated binary WebP artwork is in the project ZIP. Tests are included below their respective features. The mock backend provides **illustrative** Chess.com-format profiles and statistics, not verified live data.

## 1. Feature-to-mockup mapping

| Mockup | Feature | Route | Responsibility |
|---|---|---|---|
| Search | `player-search` | `/` | Validated username or URL search + navigation |
| Summary Statistics | `summary-statistics` | `/players/:username/summary` | 7/15/30/All, Bullet/Blitz/Rapid/Daily filters, results and ratings |
| Overall Statistics | `overall-statistics` | `/players/:username/overall` | Lifetime results, rating progression, peak and opponent ratings |
| Profile | `player-profile` | `/players/:username` | ID, URL, username, avatar, title, location/country, timestamps, followers, streamer, Twitch, FIDE |

## 2. File tree

```text
checkmate-scholar-react/
├── public/
│   └── assets/
│       ├── chessboard-endgame.webp
│       ├── chessboard-midgame.webp
│       └── search-silhouette.webp
├── src/
│   ├── app/
│   │   ├── app.tsx
│   │   ├── providers.tsx
│   │   ├── router.tsx
│   │   └── styles.css
│   ├── components/
│   │   ├── chess/
│   │   │   └── chess-artwork.tsx
│   │   └── ui/
│   │       ├── app-header.tsx
│   │       ├── page-status.tsx
│   │       ├── panel.tsx
│   │       ├── rating-chart.tsx
│   │       └── stat-card.tsx
│   ├── config/
│   │   ├── constants.ts
│   │   └── routes.ts
│   ├── features/
│   │   ├── overall-statistics/
│   │   │   ├── api/
│   │   │   │   └── get-overall.ts
│   │   │   ├── components/
│   │   │   │   ├── overall-page.test.tsx
│   │   │   │   └── overall-page.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-overall.ts
│   │   │   └── types/
│   │   │       └── overall.ts
│   │   ├── player-profile/
│   │   │   ├── api/
│   │   │   │   └── get-player.ts
│   │   │   ├── components/
│   │   │   │   ├── profile-field.tsx
│   │   │   │   ├── profile-page.test.tsx
│   │   │   │   └── profile-page.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-player.ts
│   │   │   └── types/
│   │   │       └── profile.ts
│   │   ├── player-search/
│   │   │   ├── api/
│   │   │   │   └── search-player.ts
│   │   │   ├── components/
│   │   │   │   ├── search-form.tsx
│   │   │   │   ├── search-page.test.tsx
│   │   │   │   └── search-page.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-player-search.ts
│   │   │   ├── types/
│   │   │   │   └── search.ts
│   │   │   └── utils/
│   │   │       └── parse-query.ts
│   │   └── summary-statistics/
│   │       ├── api/
│   │       │   └── get-summary.ts
│   │       ├── components/
│   │       │   ├── summary-filters.tsx
│   │       │   ├── summary-page.test.tsx
│   │       │   └── summary-page.tsx
│   │       ├── hooks/
│   │       │   └── use-summary.ts
│   │       └── types/
│   │           └── filters.ts
│   ├── lib/
│   │   ├── mock-api.ts
│   │   └── query-client.ts
│   ├── testing/
│   │   ├── render-with-providers.tsx
│   │   └── setup.ts
│   ├── types/
│   │   └── chess.ts
│   ├── utils/
│   │   ├── format.ts
│   │   └── username.ts
│   └── main.tsx
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── CODE_REFERENCE.md
├── eslint.config.js
├── index.html
├── package.json
├── PROJECT_TREE.txt
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── VALIDATION.md
└── vite.config.ts
```

## 3. Core configuration


### `package.json`

```json
{
  "name": "checkmate-scholar",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.90.0",
    "lucide-react": "^0.552.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.9.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^24.8.0",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "@vitejs/plugin-react": "^5.1.0",
    "eslint": "^9.39.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.4.0",
    "jsdom": "^26.1.0",
    "prettier": "^3.6.2",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.46.0",
    "vite": "^7.1.12",
    "vitest": "^3.2.4"
  }
}
```


### `tsconfig.json`

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```


### `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```


### `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```


### `vite.config.ts`

```typescript
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup.ts'],
    css: false,
    clearMocks: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```


### `eslint.config.js`

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  prettier,
);
```


### `.prettierrc.json`

```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }
```


### `.prettierignore`

```text
node_modules
dist
coverage
*.zip
```


### `.gitignore`

```text
node_modules/
dist/
coverage/
.env
.env.local
*.tsbuildinfo
.DS_Store
```


### `.env.example`

```text
# Mock data is enabled by default. Replace the feature api fetchers when a live backend exists.
VITE_API_MODE=mock
```


### `index.html`

```text
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#191919" />
    <meta name="description" content="CHECKMATE Scholar — a thoughtfully designed chess performance dashboard." />
    <title>CHECKMATE · Scholar</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```


## 4. Application setup


### `src/app/app.tsx`

```tsx
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
```


### `src/app/providers.tsx`

```tsx
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { createQueryClient } from '@/lib/query-client';

const queryClient = createQueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}
```


### `src/app/router.tsx`

```tsx
import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppHeader } from '@/components/ui/app-header';
import { PageLoading } from '@/components/ui/page-status';

const SearchPage = lazy(() => import('@/features/player-search/components/search-page').then((m) => ({ default: m.SearchPage })));
const SummaryPage = lazy(() => import('@/features/summary-statistics/components/summary-page').then((m) => ({ default: m.SummaryPage })));
const OverallPage = lazy(() => import('@/features/overall-statistics/components/overall-page').then((m) => ({ default: m.OverallPage })));
const ProfilePage = lazy(() => import('@/features/player-profile/components/profile-page').then((m) => ({ default: m.ProfilePage })));

function AppLayout() {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <AppHeader />
      <main id="main-content" className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>CHECKMATE · SCHOLAR EDITION</span><span>Illustrative demo data — not live Chess.com records</span></footer>
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoading label="Loading page…" />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<SearchPage />} />
          <Route path="players/:username">
            <Route index element={<ProfilePage />} />
            <Route path="summary" element={<SummaryPage />} />
            <Route path="overall" element={<OverallPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
```


### `src/app/styles.css`

```css
:root {
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  color: #1c1d1e;
  background: #f7f6f3;
  --ink: #1b1c1d;
  --paper: #f7f6f3;
  --surface: #fffefa;
  --muted: #72716e;
  --line: #e2dfd9;
  --radius: 17px;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
a { color: inherit; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: 0.63; }
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible {
  outline: 3px solid #80796d; outline-offset: 3px;
}
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
.skip-link { position: absolute; z-index: 90; top: -100px; left: 15px; padding: 10px; background: white; color: black; }
.skip-link:focus { top: 10px; }
.site-frame { min-height: 100vh; display: flex; flex-direction: column; }
.app-header {
  background: #1d1e1f; min-height: 82px; padding: 0 clamp(20px, 4vw, 70px); color: #fff;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  box-shadow: 0 2px 7px rgb(0 0 0 / 6%);
}
.brand { display: flex; align-items: center; gap: 13px; font-size: 25px; letter-spacing: -1.2px; font-weight: 830; text-decoration: none; white-space: nowrap; }
.primary-nav { display: flex; align-items: center; gap: 8px; }
.nav-link {
  color: #d2d1d0; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  padding: 12px 17px; min-height: 44px; border-radius: 11px; font-weight: 640; transition: background .16s, color .16s;
}
.nav-link:hover { background: #353638; color: #fff; }
.nav-link-active, .nav-link-active:hover { background: #fffdfa; color: #19191a; }
.header-demo { display: flex; align-items: center; gap: 11px; color: #c0beba; letter-spacing: .9px; }
.demo-caption { font-size: 11px; font-weight: 750; white-space: nowrap; }
.demo-dot { width: 7px; height: 7px; background: #d6d2ca; border-radius: 50%; }
.avatar-monogram { width: 37px; height: 37px; display: grid; place-items: center; border-radius: 50%; background: #e8e8e5; color: #1c1c1c; font-weight: 900; letter-spacing: 0; font-size: 13px; }
.main-content { flex: 1; width: min(1600px, 100%); margin: 0 auto; padding: clamp(28px, 3vw, 54px) clamp(20px, 3.2vw, 58px) 20px; }
.app-footer { display: flex; justify-content: space-between; gap: 20px; border-top: 1px solid var(--line); color: #817e78; font-size: 11px; letter-spacing: 1px; padding: 18px clamp(20px, 4vw, 70px); }
.eyebrow { display: inline-block; font-size: 12px; letter-spacing: 2.2px; font-weight: 800; color: #87847e; margin-bottom: 13px; }
h1, h2, h3, p { margin-top: 0; }
.page-title-row { display: flex; align-items: start; justify-content: space-between; gap: 30px; margin-bottom: 31px; }
.page-title-row h1 { font-size: clamp(36px, 3.4vw, 54px); line-height: 1.1; letter-spacing: -2.3px; margin: 0 0 7px; font-weight: 830; }
.page-title-row p { font-size: 17px; color: #676663; margin: 0; }
.label-pill { color: #575551; font-size: 11px; letter-spacing: 1px; font-weight: 800; background: #ebe9e3; padding: 12px 18px; border-radius: 30px; }
.panel { background: rgb(255 255 255 / 89%); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: 0 8px 35px rgb(40 36 27 / 3%); }
.button { border: 0; padding: 14px 19px; border-radius: 11px; font-weight: 750; display: inline-flex; gap: 9px; justify-content: center; align-items: center; transition: transform .15s, background .15s; }
.button:hover:not(:disabled) { transform: translateY(-1px); }
.button-dark { background: #1e1e20; color: #fff; }
.button-dark:hover:not(:disabled) { background: #343434; }
.icon-button { border: 1px solid var(--line); background: white; border-radius: 12px; padding: 10px; color: #4b4945; }

/* Search: the hero is imagery, not a rasterized form. */
.search-page { display: grid; grid-template-columns: minmax(460px, 1.15fr) minmax(360px, .85fr); min-height: min(650px, 75vh); align-items: center; gap: 30px; }
.search-copy { position: relative; z-index: 2; padding: 20px 0 30px; }
.search-copy h1 { font-size: clamp(76px, 7.8vw, 124px); letter-spacing: -6.5px; font-weight: 850; line-height: .96; margin: 0 0 25px; }
.muted-period { color: #a7a5a0; }
.search-copy > p { color: #575653; font-size: clamp(18px, 1.75vw, 23px); margin: 0 0 40px; }
.search-form { width: min(690px, 100%); }
.search-combo { min-height: 67px; border: 1px solid #d2d0cb; background: white; border-radius: 14px; display: flex; gap: 15px; align-items: center; padding: 7px 7px 7px 20px; box-shadow: 0 10px 34px rgb(40 40 40 / 5%); }
.search-combo > svg { flex: 0 0 auto; color: #686763; }
.search-combo input { border: none; outline: none; background: transparent; min-width: 0; flex: 1; font-size: 15px; }
.search-combo input:focus-visible { outline: none; }
.search-combo:focus-within { outline: 2px solid #b1afa8; outline-offset: 3px; }
.search-submit { white-space: nowrap; min-height: 50px; }
.form-help, .form-error { font-size: 13px; margin: 13px 0 0 2px; color: #74716b; }
.form-error { color: #9e2525; font-weight: 680; }
.inline-demo { color: #343331; font-weight: 700; padding: 0; border: 0; background: none; text-decoration: underline; }
.chess-art { position: relative; isolation: isolate; }
.chess-art img { width: 100%; height: auto; display: block; object-fit: contain; user-select: none; }
.search-illustration { align-self: stretch; display: flex; align-items: center; justify-content: center; min-height: 540px; }
.search-illustration img { height: min(660px, 72vh); width: auto; max-width: 100%; object-fit: contain; mix-blend-mode: multiply; mask-image: linear-gradient(to bottom, transparent 0%, black 9%, black 93%, transparent 100%); }

/* Statistics: a true, readable HTML analytics grid paired with 3D-looking chessboard artwork. */
.statistics-layout { display: grid; grid-template-columns: minmax(320px, .91fr) minmax(560px, 1.45fr); gap: clamp(22px, 3vw, 50px); align-items: center; }
.board-column { min-width: 0; display: grid; justify-items: center; align-self: stretch; align-content: center; }
.board-column .chess-art { width: 100%; }
.board-column .chess-art img { mix-blend-mode: multiply; mask-image: radial-gradient(ellipse 78% 73% at center, black 66%, transparent 100%); }
.illustration-label { text-align: center; font-size: 12px; letter-spacing: .45px; color: #96928b; margin: 8px 0 0; }
.analytics-column { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.metric-grid { display: grid; gap: 13px; }
.metric-grid-four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.metric-grid-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.metric-grid-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.stat-card { background: #fffefa; border: 1px solid var(--line); border-radius: var(--radius); padding: 20px 13px 18px; display: flex; align-items: center; flex-direction: column; justify-content: center; gap: 7px; text-align: center; min-width: 0; min-height: 139px; }
.stat-card svg { color: #252525; }
.stat-label { font-size: 13px; color: #575652; font-weight: 660; }
.stat-value { font-size: clamp(24px, 2.6vw, 36px); letter-spacing: -1.1px; font-weight: 820; white-space: nowrap; }
.stat-note { color: #807e77; font-size: 11px; }
.summary-rate-panel { padding: 14px 22px 17px; }
.result-rate { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.result-rate strong:first-child { font-size: 14px; }
.result-rate strong:last-child { font-size: 21px; }
.outcome-bar { height: 10px; display: flex; overflow: hidden; background: #e2e2e2; border-radius: 7px; }
.outcome-bar span:first-child { background: #292929; }
.outcome-bar span:nth-child(2) { background: #9a9a98; }
.outcome-bar span:nth-child(3) { background: #dededc; }
.rating-summary-grid .stat-card { min-height: 122px; }
.rating-summary-grid .stat-card .stat-value { font-size: clamp(23px, 2.3vw, 33px); }
.chart-panel { padding: 20px 23px 16px; }
.chart-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
.chart-heading h2 { font-size: clamp(18px, 1.45vw, 23px); letter-spacing: -.7px; margin: 0 0 4px; }
.chart-heading span { color: var(--muted); font-size: 12px; text-transform: capitalize; }
.chart-current { font-size: 22px; letter-spacing: -.8px; }
.rating-svg { width: 100%; height: clamp(160px, 19vw, 235px); display: block; overflow: visible; }
.summary-filters { display: flex; align-items: flex-end; gap: 17px; flex-wrap: wrap; }
.filter-label { display: block; color: #89857e; letter-spacing: 1px; font-size: 10px; font-weight: 840; text-transform: uppercase; margin-bottom: 9px; }
.filter-unit { min-width: 0; }
.segment-control { display: flex; align-items: center; padding: 4px; gap: 3px; border: 1px solid #d9d7d1; background: #f8f8f6; border-radius: 12px; }
.segment-control button { border: 0; background: transparent; font-size: 13px; border-radius: 9px; padding: 11px 14px; color: #505050; font-weight: 650; white-space: nowrap; }
.segment-control button:hover:not(.selected) { background: #e9e8e3; }
.segment-control button.selected { color: white; background: #222324; box-shadow: 0 2px 5px #00000017; }
.select-wrap { display: flex; align-items: center; gap: 7px; background: #f8f8f6; border: 1px solid #d9d7d1; border-radius: 12px; min-height: 47px; padding: 0 10px; }
.select-wrap select { border: 0; background: transparent; min-width: 80px; font-weight: 690; color: #2a2926; outline: none; }
.select-wrap:focus-within { outline: 2px solid #80796d; }
.overall-page .statistics-layout { align-items: center; }
.overall-chart .rating-svg { height: clamp(210px, 23vw, 305px); }

/* Profile */
.profile-layout { display: grid; grid-template-columns: minmax(620px, 1.38fr) minmax(270px, .62fr); gap: 36px; align-items: stretch; }
.profile-main { display: flex; flex-direction: column; gap: 19px; }
.profile-identity { padding: 28px; display: flex; align-items: center; gap: 24px; position: relative; }
.profile-avatar { width: 132px; height: 132px; flex: 0 0 auto; background: linear-gradient(145deg, #eceae5, #d6d4ce); border-radius: 19px; overflow: hidden; display: grid; place-items: end center; }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-silhouette { display: block; width: 86px; height: 86px; background: #2d2c2d; border-radius: 48% 48% 28% 28%; position: relative; margin-bottom: -19px; }
.avatar-silhouette::before { content: ''; position: absolute; width: 59px; height: 68px; border-radius: 45%; background: #2d2c2d; left: 13px; top: -27px; }
.identity-copy { min-width: 0; }
.identity-copy .eyebrow { margin-bottom: 7px; }
.identity-copy h2 { font-size: clamp(28px, 2.3vw, 36px); margin-bottom: 5px; display: flex; align-items: center; gap: 9px; }
.identity-copy a { display: inline-flex; gap: 7px; align-items: center; color: #52514f; font-size: 13px; overflow-wrap: anywhere; }
.identity-copy a:hover, .profile-field a:hover { color: #111; }
.title-tag { display: inline-flex; align-items: center; gap: 7px; margin-top: 15px; border-radius: 8px; background: #262626; color: white; padding: 9px 13px; font-weight: 750; font-size: 13px; }
.copy-profile { margin-left: auto; align-self: flex-start; }
.profile-detail-panel { padding: 25px 28px; }
.profile-fields { display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; }
.profile-field { border-bottom: 1px solid #eae7e0; display: flex; gap: 14px; align-items: center; min-height: 85px; }
.profile-field svg { flex: 0 0 auto; color: #424241; }
.profile-field .field-label { display: block; color: #88857e; font-size: 12px; margin-bottom: 6px; }
.profile-field strong { display: block; font-size: 14px; font-weight: 720; overflow-wrap: anywhere; line-height: 1.45; }
.profile-aside { display: grid; align-content: center; justify-items: center; overflow: hidden; }
.profile-aside .chess-art { width: min(100%, 380px); }
.profile-aside .chess-art img { mix-blend-mode: multiply; mask-image: radial-gradient(ellipse at center, black 48%, transparent 78%); }

/* Loading, empty and error states */
.status-screen { margin: 45px auto; min-height: 260px; border: 1px solid var(--line); border-radius: var(--radius); background: white; display: flex; flex-direction: column; gap: 14px; align-items: center; justify-content: center; font-weight: 650; text-align: center; color: #696761; padding: 25px; }
.status-screen p { margin: 0; }
.loading-spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #dedbd6; border-top-color: #333; animation: spin .7s linear infinite; }
.status-error { color: #932b2b; }
.empty-copy { color: #87837b; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }

@media (max-width: 1200px) {
  .app-header { padding-inline: 25px; }
  .header-demo .demo-caption, .header-demo .demo-dot { display: none; }
  .statistics-layout { grid-template-columns: minmax(250px, .75fr) minmax(510px, 1.25fr); gap: 22px; }
  .profile-layout { grid-template-columns: minmax(0, 1fr) 260px; }
  .stat-card { padding: 14px 8px; min-height: 115px; }
  .stat-value { font-size: 27px; }
  .summary-filters { gap: 8px; }
  .segment-control button { padding: 10px; }
}
@media (max-width: 900px) {
  .app-header { flex-wrap: wrap; padding: 15px 20px; justify-content: center; }
  .primary-nav { order: 3; width: 100%; justify-content: center; }
  .header-demo { margin-left: auto; }
  .main-content { padding: 30px 20px; }
  .search-page { grid-template-columns: 1fr 1fr; min-height: 490px; }
  .search-copy h1 { font-size: 65px; letter-spacing: -3px; }
  .search-combo { flex-wrap: wrap; }
  .search-submit { flex: 1 0 100%; }
  .search-illustration { min-height: 400px; }
  .statistics-layout, .profile-layout { grid-template-columns: 1fr; }
  .board-column .chess-art { width: min(660px, 88%); }
  .page-title-row { flex-wrap: wrap; }
  .profile-aside { display: none; }
}
@media (max-width: 600px) {
  .brand { font-size: 20px; }
  .header-demo { display: none; }
  .nav-link { padding: 9px; gap: 5px; font-size: 11px; min-height: 40px; flex: 1; }
  .nav-link svg { width: 15px; }
  .main-content { padding: 25px 15px; }
  .search-page { grid-template-columns: 1fr; }
  .search-copy h1 { font-size: clamp(51px, 13vw, 70px); }
  .search-copy > p { font-size: 16px; margin-bottom: 25px; }
  .search-illustration { min-height: 260px; max-height: 350px; }
  .search-illustration img { height: 310px; }
  .page-title-row h1 { font-size: 35px; letter-spacing: -1.4px; }
  .page-title-row p { font-size: 14px; }
  .summary-filters { width: 100%; }
  .filter-unit:first-child { flex: 1; }
  .segment-control button { flex: 1; padding: 10px 4px; font-size: 12px; }
  .statistics-layout { gap: 7px; }
  .board-column .chess-art { width: 100%; }
  .metric-grid { gap: 8px; }
  .metric-grid-four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-grid-three { grid-template-columns: 1fr; }
  .metric-grid-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stat-card { min-height: 108px; }
  .stat-value { font-size: 26px; }
  .profile-identity { padding: 17px; gap: 13px; }
  .profile-avatar { width: 78px; height: 78px; }
  .avatar-silhouette { transform: scale(.6); transform-origin: bottom; }
  .identity-copy h2 { font-size: 24px; }
  .copy-profile { display: none; }
  .profile-detail-panel { padding: 8px 18px; }
  .profile-fields { grid-template-columns: 1fr; }
  .profile-field { min-height: 70px; }
  .app-footer { flex-wrap: wrap; justify-content: center; text-align: center; font-size: 9px; }
}
```


### `src/config/constants.ts`

```typescript
export const APP_NAME = 'CHECKMATE';
export const DEMO_USERNAME = 'hikaru';
export const MOCK_DELAY_MS = 260;
export const TIME_FRAMES = [
  { value: '7', label: '7 days' },
  { value: '15', label: '15 days' },
  { value: '30', label: '30 days' },
  { value: 'all', label: 'All' },
] as const;
export const TIME_CLASSES = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'rapid', label: 'Rapid' },
  { value: 'daily', label: 'Daily' },
] as const;
```


### `src/config/routes.ts`

```typescript
export const ROUTES = {
  search: '/',
  summary: (username: string) => `/players/${encodeURIComponent(username)}/summary`,
  overall: (username: string) => `/players/${encodeURIComponent(username)}/overall`,
  profile: (username: string) => `/players/${encodeURIComponent(username)}`,
} as const;
```


### `src/types/chess.ts`

```typescript
export type TimeFrame = '7' | '15' | '30' | 'all';
export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily';

export type Player = {
  id: string;
  username: string;
  url: string;
  avatar: string | null;
  title: string | null;
  location: string | null;
  country: string | null;
  joined: number;
  lastOnline: number | null;
  followers: number;
  isStreamer: boolean;
  twitchUrl: string | null;
  fide: number | null;
};

export type RatingPoint = { date: string; rating: number };

export type SummaryStats = {
  timeFrame: TimeFrame;
  timeClass: TimeClass;
  from: string;
  to: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  expectedRating: number;
  actualRating: number;
  difference: number;
  lastChange: number;
  ratingHistory: RatingPoint[];
};

export type OverallStats = {
  from: string;
  to: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  peakRating: number;
  peakDate: string;
  averageOpponent: number;
  ratingHistory: RatingPoint[];
};
```


### `src/utils/format.ts`

```typescript
export const formatNumber = (value: number): string => new Intl.NumberFormat('en-IE').format(value);

export const signedNumber = (value: number): string => `${value > 0 ? '+' : ''}${value}`;

export const formatUtc = (timestamp: number | null): string =>
  timestamp === null
    ? 'Unavailable'
    : new Intl.DateTimeFormat('en-IE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        hour12: false,
      }).format(timestamp * 1000) + ' UTC';
```


### `src/utils/username.ts`

```typescript
/** Accept a Chess.com username or https://chess.com/member/<username> URL. */
export function parseChessUsername(input: string): string {
  const value = input.trim();
  if (!value) throw new Error('Enter a Chess.com username or member profile URL.');

  let username = value;
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('The profile URL is invalid.');
    }
    if (!['chess.com', 'www.chess.com'].includes(url.hostname.toLowerCase())) {
      throw new Error('Please use a Chess.com member URL.');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'member') {
      throw new Error('Use a URL like chess.com/member/username.');
    }
    username = parts[1] ?? '';
  }
  if (!/^[a-zA-Z0-9_-]{3,25}$/.test(username)) {
    throw new Error('Usernames must be 3–25 characters: letters, numbers, _ or -.');
  }
  return username.toLowerCase();
}
```


### `src/lib/mock-api.ts`

```typescript
import { MOCK_DELAY_MS } from '@/config/constants';
import type { OverallStats, Player, RatingPoint, SummaryStats, TimeClass, TimeFrame } from '@/types/chess';

// Mock repository: all figures are fictional design fixtures, NOT live Chess.com records.
const currentUtc = 1793743200; // 2026-11-03 UTC; fixed for reproducible screenshots.
const historyOffsets = [0, 4, 6, 5, 10, 13, 11, 16, 19, 17, 21, 24, 27, 25, 31, 34, 33, 38, 41, 44, 42, 48, 52, 50, 56];

async function mockDelay(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function ensureAvailable(username: string): void {
  if (username === 'notfound') throw new Error('This profile is not in the demo data. Try hikaru.');
  if (username === 'error') throw new Error('Demo service unavailable. Please retry.');
}

function makeHistory(endRating: number, frame: TimeFrame): RatingPoint[] {
  const total = frame === '7' ? 7 : frame === '15' ? 15 : frame === '30' ? 30 : 24;
  const start = frame === 'all' ? new Date('2023-01-12T12:00:00Z') : new Date('2026-11-03T12:00:00Z');
  if (frame !== 'all') start.setUTCDate(start.getUTCDate() - (total - 1));
  const spread = frame === 'all' ? 310 : 85;
  const endingWave = historyOffsets[(total - 1) % historyOffsets.length] ?? 0;
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(start);
    if (frame === 'all') date.setUTCMonth(date.getUTCMonth() + i * 2);
    else date.setUTCDate(date.getUTCDate() + i);
    const offset = historyOffsets[i % historyOffsets.length] ?? 0;
    const fraction = i / Math.max(1, total - 1);
    const trend = endRating - spread + spread * fraction;
    return { date: date.toISOString().slice(0, 10), rating: Math.round(trend + offset - endingWave * fraction) };
  });
}

export async function mockFindPlayer(username: string): Promise<Player> {
  await mockDelay();
  ensureAvailable(username);
  return {
    id: '1029387',
    username,
    url: `https://www.chess.com/member/${encodeURIComponent(username)}`,
    avatar: null,
    title: username === 'hikaru' ? 'GM' : null,
    location: username === 'hikaru' ? 'Los Angeles, CA' : null,
    country: username === 'hikaru' ? 'United States (US)' : null,
    joined: 1263556800,
    lastOnline: 1793284200,
    followers: username === 'hikaru' ? 1245678 : 0,
    isStreamer: username === 'hikaru',
    twitchUrl: username === 'hikaru' ? 'https://www.twitch.tv/gmhikaru' : null,
    fide: username === 'hikaru' ? 2780 : null,
  };
}

export async function mockGetSummary(
  username: string,
  frame: TimeFrame,
  timeClass: TimeClass,
): Promise<SummaryStats> {
  await mockDelay();
  ensureAvailable(username);
  const frameScale: Record<TimeFrame, number> = { '7': 0.26, '15': 0.52, '30': 1, all: 10.6 };
  const classScale: Record<TimeClass, number> = { bullet: 1.25, blitz: 1, rapid: 0.78, daily: 0.18 };
  const games = Math.max(2, Math.round(60 * frameScale[frame] * classScale[timeClass]));
  const wins = Math.round(games * 0.55);
  const draws = Math.round(games * 0.1);
  const losses = games - wins - draws;
  const classOffset: Record<TimeClass, number> = { bullet: -70, blitz: 0, rapid: 35, daily: -120 };
  const actualRating = 1486 + classOffset[timeClass] + (frame === '7' ? -10 : frame === '15' ? -6 : 0);
  const expectedRating = actualRating - 14;
  return {
    timeFrame: frame,
    timeClass,
    from: frame === 'all' ? 'Jan 12, 2023' : frame === '30' ? 'Oct 5, 2026' : frame === '15' ? 'Oct 20, 2026' : 'Oct 28, 2026',
    to: 'Nov 3, 2026',
    games,
    wins,
    draws,
    losses,
    winRate: Math.round((wins / games) * 100),
    expectedRating,
    actualRating,
    difference: actualRating - expectedRating,
    lastChange: 8,
    ratingHistory: makeHistory(actualRating, frame),
  };
}

export async function mockGetOverall(username: string): Promise<OverallStats> {
  await mockDelay();
  ensureAvailable(username);
  return {
    from: 'Jan 12, 2023',
    to: 'Nov 3, 2026',
    games: 1240,
    wins: 682,
    draws: 134,
    losses: 424,
    winRate: 55,
    peakRating: 1562,
    peakDate: 'Oct 28, 2026',
    averageOpponent: 1428,
    ratingHistory: makeHistory(1548, 'all'),
  };
}

// Static browser fixtures make it easy to replace the mock with a real API client later.
export const mockMetadata = { sample: true, asOf: currentUtc } as const;
```


### `src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  });
}
```


## 5. Shared UI components


### `src/components/chess/chess-artwork.tsx`

```tsx
export type ChessArtworkVariant = 'opening' | 'midgame' | 'endgame' | 'profile';

const assets: Record<ChessArtworkVariant, { src: string; alt: string }> = {
  opening: {
    src: '/assets/search-silhouette.webp',
    alt: 'Faceless chess player seated beyond an opening chessboard',
  },
  midgame: {
    src: '/assets/chessboard-midgame.webp',
    alt: 'Angled realistic black-and-ivory 3D chessboard with pieces in a middlegame position',
  },
  endgame: {
    src: '/assets/chessboard-endgame.webp',
    alt: 'Angled realistic 3D chessboard showing a sparse finished-game position',
  },
  profile: {
    src: '/assets/search-silhouette.webp',
    alt: 'Anonymous seated chess player silhouette',
  },
};

export function ChessArtwork({ variant, className = '' }: { variant: ChessArtworkVariant; className?: string }) {
  const asset = assets[variant];
  return (
    <div className={`chess-art chess-art-${variant} ${className}`.trim()}>
      <img src={asset.src} alt={asset.alt} draggable={false} />
    </div>
  );
}
```


### `src/components/ui/app-header.tsx`

```tsx
import { BarChart3, Crown, Search, TrendingUp, UserRound } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { APP_NAME, DEMO_USERNAME } from '@/config/constants';
import { ROUTES } from '@/config/routes';

export function AppHeader() {
  const { username = DEMO_USERNAME } = useParams<{ username: string }>();
  const links = [
    { label: 'Search', path: ROUTES.search, icon: Search, end: true },
    { label: 'Statistics', path: ROUTES.summary(username), icon: BarChart3, end: false },
    { label: 'Overall', path: ROUTES.overall(username), icon: TrendingUp, end: false },
    { label: 'Profile', path: ROUTES.profile(username), icon: UserRound, end: true },
  ];
  return (
    <header className="app-header">
      <NavLink to="/" className="brand" aria-label={`${APP_NAME} home`}>
        <Crown size={30} strokeWidth={2.5} fill="currentColor" />
        <span>{APP_NAME}</span>
      </NavLink>
      <nav className="primary-nav" aria-label="Main navigation">
        {links.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={path}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="header-demo" title="Example data, not a live account">
        <span className="demo-dot" />
        <span className="demo-caption">DEMO</span>
        <span className="avatar-monogram">JD</span>
      </div>
    </header>
  );
}
```


### `src/components/ui/page-status.tsx`

```tsx
import { AlertCircle, RotateCcw } from 'lucide-react';

export function PageLoading({ label = 'Loading statistics…' }: { label?: string }) {
  return (
    <div className="status-screen" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="status-screen status-error" role="alert">
      <AlertCircle aria-hidden="true" />
      <p>{message}</p>
      <button className="button button-dark" onClick={onRetry} type="button">
        <RotateCcw size={17} /> Retry
      </button>
    </div>
  );
}
```


### `src/components/ui/panel.tsx`

```tsx
import type { ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
}
```


### `src/components/ui/rating-chart.tsx`

```tsx
import { useId } from 'react';
import type { RatingPoint } from '@/types/chess';
import { formatNumber } from '@/utils/format';

export function RatingChart({
  points,
  title = 'Rating progression',
  subtitle,
}: {
  points: RatingPoint[];
  title?: string;
  subtitle?: string;
}) {
  const gradientId = useId().replace(/:/g, '-');
  if (points.length === 0) return <p className="empty-copy">No rating history available.</p>;

  const ratings = points.map((point) => point.rating);
  const minimum = Math.floor((Math.min(...ratings) - 30) / 50) * 50;
  const maximum = Math.ceil((Math.max(...ratings) + 30) / 50) * 50;
  const xStart = 44;
  const xEnd = 720;
  const yStart = 30;
  const yEnd = 210;
  const plot = points.map((point, index) => {
    const x = xStart + (index / Math.max(1, points.length - 1)) * (xEnd - xStart);
    const y = yEnd - ((point.rating - minimum) / Math.max(1, maximum - minimum)) * (yEnd - yStart);
    return { x, y };
  });
  const line = plot.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${xStart},${yEnd} ${line} ${xEnd},${yEnd}`;
  const lastPoint = plot[plot.length - 1];
  const ticks = [minimum, (minimum + maximum) / 2, maximum];
  const firstDate = points[0]?.date ?? '';
  const lastDate = points[points.length - 1]?.date ?? '';
  const dateLabel = (date: string) => {
    const parsed = new Date(`${date}T12:00:00Z`);
    return parsed.toLocaleDateString('en-IE', { month: 'short', day: 'numeric', year: points.length > 30 ? 'numeric' : undefined, timeZone: 'UTC' });
  };

  return (
    <div className="chart-wrap">
      <div className="chart-heading">
        <div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div>
        <strong className="chart-current">{formatNumber(points[points.length - 1]?.rating ?? 0)}</strong>
      </div>
      <svg viewBox="0 0 760 254" preserveAspectRatio="none" className="rating-svg" role="img" aria-label={`${title}: from ${formatNumber(points[0]?.rating ?? 0)} to ${formatNumber(points[points.length - 1]?.rating ?? 0)}`}>
        <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#343434" stopOpacity="0.18"/><stop offset="100%" stopColor="#343434" stopOpacity="0.012"/></linearGradient></defs>
        {ticks.map((tick) => {
          const y = yEnd - ((tick - minimum) / Math.max(1, maximum - minimum)) * (yEnd - yStart);
          return <g key={tick}><line x1={xStart} y1={y} x2={xEnd} y2={y} stroke="#dedbd5" strokeWidth="1"/><text x="5" y={y + 4} fontSize="14" fill="#77736d">{formatNumber(Math.round(tick))}</text></g>;
        })}
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline points={line} fill="none" stroke="#202020" strokeWidth="3.25" strokeLinejoin="round" strokeLinecap="round" />
        {lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#202020" />}
        <text x={xStart} y="246" fontSize="14" fill="#77736d">{dateLabel(firstDate)}</text>
        <text x={xEnd} y="246" fontSize="14" textAnchor="end" fill="#77736d">{dateLabel(lastDate)}</text>
      </svg>
    </div>
  );
}
```


### `src/components/ui/stat-card.tsx`

```tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  note?: string;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, note, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      {Icon && <Icon size={20} strokeWidth={2.4} aria-hidden="true" />}
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {note && <small className="stat-note">{note}</small>}
    </div>
  );
}
```


## 6. Feature modules, hooks, APIs and tests


### `src/features/player-search/api/search-player.ts`

```typescript
import { mockFindPlayer } from '@/lib/mock-api';
import { parseChessUsername } from '@/features/player-search/utils/parse-query';
import type { Player } from '@/types/chess';

export async function searchPlayer(input: string): Promise<Player> {
  const username = parseChessUsername(input);
  return mockFindPlayer(username);
}
```


### `src/features/player-search/components/search-form.tsx`

```tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { usePlayerSearch } from '@/features/player-search/hooks/use-player-search';

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const search = usePlayerSearch();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError('');
    try {
      const player = await search.mutateAsync(query);
      navigate(ROUTES.summary(player.username));
    } catch (error: unknown) {
      setValidationError(error instanceof Error ? error.message : 'Unable to search. Please try again.');
    }
  }

  return (
    <form className="search-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label htmlFor="player-query" className="sr-only">Chess.com username or member profile URL</label>
      <div className="search-combo">
        <Search size={22} aria-hidden="true" />
        <input
          id="player-query"
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setValidationError(''); search.reset(); }}
          placeholder="Enter a Chess.com username or profile URL"
          autoComplete="off"
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? 'search-error' : 'search-help'}
        />
        <button type="submit" className="button button-dark search-submit" disabled={search.isPending}>
          {search.isPending ? 'Searching…' : 'Search player'} <ArrowRight size={19} aria-hidden="true" />
        </button>
      </div>
      {validationError ? <p id="search-error" className="form-error" role="alert">{validationError}</p> :
        <p id="search-help" className="form-help">Try <button type="button" className="inline-demo" onClick={() => setQuery('hikaru')}>hikaru</button> for the demo. No live account lookup is performed.</p>}
    </form>
  );
}
```


### `src/features/player-search/components/search-page.test.tsx`

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/testing/render-with-providers';
import { SearchPage } from '@/features/player-search/components/search-page';
import { parseChessUsername } from '@/features/player-search/utils/parse-query';

describe('player-search', () => {
  it('parses username or valid Chess.com URL and rejects unrelated URLs', () => {
    expect(parseChessUsername('Hikaru')).toBe('hikaru');
    expect(parseChessUsername('https://www.chess.com/member/Hikaru')).toBe('hikaru');
    expect(() => parseChessUsername('https://example.com/member/hikaru')).toThrow(/chess.com/i);
  });

  it('shows an accessible error for an invalid search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);
    await user.type(screen.getByRole('searchbox'), 'https://example.com/member/hikaru');
    await user.click(screen.getByRole('button', { name: /search player/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chess.com');
  });
});
```


### `src/features/player-search/components/search-page.tsx`

```tsx
import { ChessArtwork } from '@/components/chess/chess-artwork';
import { SearchForm } from '@/features/player-search/components/search-form';

export function SearchPage() {
  return (
    <div className="search-page">
      <div className="search-copy">
        <span className="eyebrow">01 / PLAYER LOOKUP</span>
        <h1>Find your<br />player<span className="muted-period">.</span></h1>
        <p>Discover the numbers behind every move.</p>
        <SearchForm />
      </div>
      <ChessArtwork variant="opening" className="search-illustration" />
    </div>
  );
}
```


### `src/features/player-search/hooks/use-player-search.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { searchPlayer } from '@/features/player-search/api/search-player';

export function usePlayerSearch() {
  return useMutation({ mutationFn: searchPlayer });
}
```


### `src/features/player-search/types/search.ts`

```typescript
export type SearchFormValues = { query: string };
```


### `src/features/player-search/utils/parse-query.ts`

```typescript
export { parseChessUsername } from '@/utils/username';
```


### `src/features/summary-statistics/api/get-summary.ts`

```typescript
import { mockGetSummary } from '@/lib/mock-api';
import type { SummaryStats, TimeClass, TimeFrame } from '@/types/chess';

export function getSummary(username: string, timeFrame: TimeFrame, timeClass: TimeClass): Promise<SummaryStats> {
  return mockGetSummary(username, timeFrame, timeClass);
}
```


### `src/features/summary-statistics/components/summary-filters.tsx`

```tsx
import { Clock3 } from 'lucide-react';
import { TIME_CLASSES, TIME_FRAMES } from '@/config/constants';
import type { TimeClass, TimeFrame } from '@/types/chess';

export function SummaryFilters({
  frame,
  timeClass,
  onFrameChange,
  onClassChange,
}: {
  frame: TimeFrame;
  timeClass: TimeClass;
  onFrameChange: (value: TimeFrame) => void;
  onClassChange: (value: TimeClass) => void;
}) {
  return (
    <div className="summary-filters" aria-label="Statistics filters">
      <div className="filter-unit">
        <span className="filter-label">Time frame</span>
        <div className="segment-control" role="group" aria-label="Time frame">
          {TIME_FRAMES.map(({ value, label }) => (
            <button type="button" key={value} onClick={() => onFrameChange(value)} className={frame === value ? 'selected' : ''} aria-pressed={frame === value}>{label}</button>
          ))}
        </div>
      </div>
      <div className="filter-unit">
        <label className="filter-label" htmlFor="time-class">Time class</label>
        <div className="select-wrap"><Clock3 size={18} aria-hidden="true" />
          <select id="time-class" value={timeClass} onChange={(event) => onClassChange(event.target.value as TimeClass)}>
            {TIME_CLASSES.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
```


### `src/features/summary-statistics/components/summary-page.test.tsx`

```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SummaryPage } from '@/features/summary-statistics/components/summary-page';
import { renderWithProviders } from '@/testing/render-with-providers';

describe('summary-statistics', () => {
  it('loads demo statistics and supports changing the time frame', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SummaryPage />, { route: '/players/hikaru/summary', path: '/players/:username/summary' });
    expect(await screen.findByText('Summary statistics')).toBeInTheDocument();
    expect(await screen.findByText('55%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '7 days' }));
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });
});
```


### `src/features/summary-statistics/components/summary-page.tsx`

```tsx
import { useState } from 'react';
import { BarChart3, Crown, Equal, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ChessArtwork } from '@/components/chess/chess-artwork';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { RatingChart } from '@/components/ui/rating-chart';
import { StatCard } from '@/components/ui/stat-card';
import { SummaryFilters } from '@/features/summary-statistics/components/summary-filters';
import { useSummary } from '@/features/summary-statistics/hooks/use-summary';
import type { TimeClass, TimeFrame } from '@/types/chess';
import { formatNumber, signedNumber } from '@/utils/format';

export function SummaryPage() {
  const { username = '' } = useParams<{ username: string }>();
  const [frame, setFrame] = useState<TimeFrame>('30');
  const [timeClass, setTimeClass] = useState<TimeClass>('blitz');
  const { data, isPending, isFetching, error, refetch } = useSummary(username, frame, timeClass);

  return (
    <div className="statistics-page">
      <div className="page-title-row">
        <div><span className="eyebrow">02 / CHESS PERFORMANCE</span><h1>Summary statistics</h1><p>{data ? `${data.from} – ${data.to}` : 'Select a period to analyse'}</p></div>
        <SummaryFilters frame={frame} timeClass={timeClass} onFrameChange={setFrame} onClassChange={setTimeClass} />
      </div>
      {isPending ? <PageLoading /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : data ? (
        <div className="statistics-layout" aria-busy={isFetching}>
          <div className="board-column"><ChessArtwork variant="midgame" /><p className="illustration-label">Mid-game visualisation · {timeClass} {isFetching ? '· Updating…' : ''}</p></div>
          <div className="analytics-column">
            <div className="metric-grid metric-grid-four">
              <StatCard icon={BarChart3} label="Games played" value={formatNumber(data.games)} />
              <StatCard icon={Crown} label="Wins" value={formatNumber(data.wins)} />
              <StatCard icon={Equal} label="Draws" value={formatNumber(data.draws)} />
              <StatCard icon={X} label="Losses" value={formatNumber(data.losses)} />
            </div>
            <Panel className="summary-rate-panel">
              <div className="result-rate"><strong>Win rate</strong><strong>{data.winRate}%</strong></div>
              <div className="outcome-bar" aria-label={`${data.wins} wins, ${data.draws} draws, ${data.losses} losses`}>
                <span style={{ width: `${(data.wins / data.games) * 100}%` }} />
                <span style={{ width: `${(data.draws / data.games) * 100}%` }} />
                <span style={{ width: `${(data.losses / data.games) * 100}%` }} />
              </div>
            </Panel>
            <div className="metric-grid metric-grid-three rating-summary-grid">
              <StatCard label="Expected rating" value={formatNumber(data.expectedRating)} />
              <StatCard label="Actual rating" value={formatNumber(data.actualRating)} note={`Last change ${signedNumber(data.lastChange)} Elo`} />
              <StatCard label="Rating difference" value={`${signedNumber(data.difference)} Elo`} />
            </div>
            <Panel className="chart-panel"><RatingChart points={data.ratingHistory} subtitle={`Last ${frame === 'all' ? 'available' : `${frame} days`} · ${timeClass}`} /></Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```


### `src/features/summary-statistics/hooks/use-summary.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getSummary } from '@/features/summary-statistics/api/get-summary';
import type { TimeClass, TimeFrame } from '@/types/chess';

export function useSummary(username: string, frame: TimeFrame, timeClass: TimeClass) {
  return useQuery({
    queryKey: ['summary', username, frame, timeClass],
    queryFn: () => getSummary(username, frame, timeClass),
  });
}
```


### `src/features/summary-statistics/types/filters.ts`

```typescript
import type { TimeClass, TimeFrame } from '@/types/chess';
export type SummaryFilters = { timeFrame: TimeFrame; timeClass: TimeClass };
```


### `src/features/overall-statistics/api/get-overall.ts`

```typescript
import { mockGetOverall } from '@/lib/mock-api';
import type { OverallStats } from '@/types/chess';

export function getOverall(username: string): Promise<OverallStats> {
  return mockGetOverall(username);
}
```


### `src/features/overall-statistics/components/overall-page.test.tsx`

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverallPage } from '@/features/overall-statistics/components/overall-page';
import { renderWithProviders } from '@/testing/render-with-providers';

describe('overall-statistics', () => {
  it('shows the illustrative lifetime result and rating chart', async () => {
    renderWithProviders(<OverallPage />, { route: '/players/hikaru/overall', path: '/players/:username/overall' });
    expect(await screen.findByText('1,240')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /rating progression/i })).toBeInTheDocument();
    expect(screen.getByText('Peak rating')).toBeInTheDocument();
  });
});
```


### `src/features/overall-statistics/components/overall-page.tsx`

```tsx
import { BarChart3, Crown, Equal, Trophy, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ChessArtwork } from '@/components/chess/chess-artwork';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { RatingChart } from '@/components/ui/rating-chart';
import { StatCard } from '@/components/ui/stat-card';
import { useOverall } from '@/features/overall-statistics/hooks/use-overall';
import { formatNumber } from '@/utils/format';

export function OverallPage() {
  const { username = '' } = useParams<{ username: string }>();
  const { data, isPending, error, refetch } = useOverall(username);
  return (
    <div className="statistics-page overall-page">
      <div className="page-title-row"><div><span className="eyebrow">03 / LONG-TERM PERFORMANCE</span><h1>Overall statistics</h1><p>{data ? `${data.from} – ${data.to}` : 'Full account history'}</p></div><span className="label-pill">ALL TIME</span></div>
      {isPending ? <PageLoading /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : data ? (
        <div className="statistics-layout">
          <div className="board-column"><ChessArtwork variant="endgame" /><p className="illustration-label">Finished-game visualisation · sample position</p></div>
          <div className="analytics-column">
            <div className="metric-grid metric-grid-four">
              <StatCard icon={BarChart3} label="Games" value={formatNumber(data.games)} />
              <StatCard icon={Crown} label="Wins" value={formatNumber(data.wins)} note={`${data.winRate}% win rate`} />
              <StatCard icon={Equal} label="Draws" value={formatNumber(data.draws)} />
              <StatCard icon={X} label="Losses" value={formatNumber(data.losses)} />
            </div>
            <Panel className="chart-panel overall-chart"><RatingChart points={data.ratingHistory} title="Rating progression" subtitle="All available sample history" /></Panel>
            <div className="metric-grid metric-grid-two">
              <StatCard icon={Trophy} label="Peak rating" value={formatNumber(data.peakRating)} note={data.peakDate} />
              <StatCard icon={BarChart3} label="Average opponent" value={formatNumber(data.averageOpponent)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```


### `src/features/overall-statistics/hooks/use-overall.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getOverall } from '@/features/overall-statistics/api/get-overall';

export function useOverall(username: string) {
  return useQuery({ queryKey: ['overall', username], queryFn: () => getOverall(username) });
}
```


### `src/features/overall-statistics/types/overall.ts`

```typescript
import type { OverallStats } from '@/types/chess';
export type OverallResult = OverallStats;
```


### `src/features/player-profile/api/get-player.ts`

```typescript
import { mockFindPlayer } from '@/lib/mock-api';
import type { Player } from '@/types/chess';

export function getPlayer(username: string): Promise<Player> {
  return mockFindPlayer(username);
}
```


### `src/features/player-profile/components/profile-field.tsx`

```tsx
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function ProfileField({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="profile-field">
      <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
      <div><span className="field-label">{label}</span><strong>{children}</strong></div>
    </div>
  );
}
```


### `src/features/player-profile/components/profile-page.test.tsx`

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfilePage } from '@/features/player-profile/components/profile-page';
import { renderWithProviders } from '@/testing/render-with-providers';

describe('player-profile', () => {
  it('displays all requested demo fields including streamer and FIDE details', async () => {
    renderWithProviders(<ProfilePage />, { route: '/players/hikaru', path: '/players/:username' });
    expect(await screen.findByText('FIDE rating')).toBeInTheDocument();
    expect(screen.getByText('2,780')).toBeInTheDocument();
    expect(screen.getByText('Streamer status')).toBeInTheDocument();
    expect(screen.getByText('Twitch URL')).toBeInTheDocument();
    expect(screen.getByText('Player ID')).toBeInTheDocument();
  });
});
```


### `src/features/player-profile/components/profile-page.tsx`

```tsx
import { useState } from 'react';
import { CalendarDays, Check, Clock3, Copy, ExternalLink, Flag, Hash, MapPin, Radio, ShieldCheck, Twitch, UsersRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ChessArtwork } from '@/components/chess/chess-artwork';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { ProfileField } from '@/features/player-profile/components/profile-field';
import { usePlayer } from '@/features/player-profile/hooks/use-player';
import { formatNumber, formatUtc } from '@/utils/format';

export function ProfilePage() {
  const { username = '' } = useParams<{ username: string }>();
  const [copied, setCopied] = useState(false);
  const { data: player, isPending, error, refetch } = usePlayer(username);
  async function copyProfile(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setCopied(false); }
  }
  return (
    <div className="profile-page">
      <div className="page-title-row"><div><span className="eyebrow">04 / PLAYER LOOKUP</span><h1>Player profile</h1><p>Account details and chess identity</p></div></div>
      {isPending ? <PageLoading /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : player ? (
        <div className="profile-layout">
          <div className="profile-main">
            <Panel className="profile-identity">
              <div className="profile-avatar" aria-label={player.avatar ? 'Player avatar' : 'No player avatar available'}>
                {player.avatar ? <img src={player.avatar} alt={`${player.username} avatar`} /> : <span className="avatar-silhouette" aria-hidden="true" />}
              </div>
              <div className="identity-copy"><span className="eyebrow">USERNAME</span><h2>{player.username} <ExternalLink size={22} aria-hidden="true" /></h2>
                <a href={player.url} target="_blank" rel="noopener noreferrer">{player.url} <ExternalLink size={14} aria-hidden="true" /></a>
                <div className="title-tag"><ShieldCheck size={16} aria-hidden="true" /> {player.title ?? 'No title listed'}</div>
              </div>
              <button type="button" className="icon-button copy-profile" aria-label={copied ? "Profile URL copied" : "Copy profile URL"} onClick={() => void copyProfile(player.url)} title="Copy profile URL">{copied ? <Check size={19} /> : <Copy size={19} />}</button>
            </Panel>
            <Panel className="profile-detail-panel">
              <div className="profile-fields">
                <ProfileField icon={Hash} label="Player ID">{player.id}</ProfileField>
                <ProfileField icon={MapPin} label="Location">{player.location ?? 'Not provided'}</ProfileField>
                <ProfileField icon={Flag} label="Country">{player.country ?? 'Not provided'}</ProfileField>
                <ProfileField icon={CalendarDays} label="Joined (UTC)">{formatUtc(player.joined)}</ProfileField>
                <ProfileField icon={Clock3} label="Last online (UTC)">{formatUtc(player.lastOnline)}</ProfileField>
                <ProfileField icon={UsersRound} label="Followers">{formatNumber(player.followers)}</ProfileField>
                <ProfileField icon={Radio} label="Streamer status">{player.isStreamer ? 'Yes' : 'No'}</ProfileField>
                <ProfileField icon={Twitch} label="Twitch URL">{player.twitchUrl ? <a href={player.twitchUrl} target="_blank" rel="noopener noreferrer">{player.twitchUrl}</a> : 'Not provided'}</ProfileField>
                <ProfileField icon={ShieldCheck} label="FIDE rating">{player.fide === null ? 'Not provided' : formatNumber(player.fide)}</ProfileField>
              </div>
            </Panel>
          </div>
          <aside className="profile-aside"><ChessArtwork variant="profile" /><p className="illustration-label">Anonymous chess identity · illustrative artwork</p></aside>
        </div>
      ) : null}
    </div>
  );
}
```


### `src/features/player-profile/hooks/use-player.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getPlayer } from '@/features/player-profile/api/get-player';

export function usePlayer(username: string) {
  return useQuery({ queryKey: ['player', username], queryFn: () => getPlayer(username) });
}
```


### `src/features/player-profile/types/profile.ts`

```typescript
import type { Player } from '@/types/chess';
export type ProfileRecord = Player;
```


## 7. Testing utilities


### `src/testing/render-with-providers.tsx`

```tsx
import type { ReactElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createQueryClient } from '@/lib/query-client';

export function renderWithProviders(
  page: ReactElement,
  { route = '/', path = '/' }: { route?: string; path?: string } = {},
) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes><Route path={path} element={page} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
```


### `src/testing/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```


### `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import '@/app/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```


## 8. README and validation


### `README.md`

```markdown
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
```


### `VALIDATION.md`

```markdown
# Validation report

## Checked in this environment

- Source: 43 TypeScript/TSX/JS files syntactically parsed using the TypeScript compiler's transpilation API, with zero syntax diagnostics.
- Dependency boundaries: zero imports from one feature into another feature.
- Local alias resolution: all `@/` imports target an existing source module.
- Layout: a static HTML/CSS screenshot was rendered with headless Chromium to verify the summary page's desktop grid and visual assets (not the actual running React application).
- Assets: all three WebP images were generated and included in `public/assets`.
- Archive: all source files, tests, config files, assets and documentation are included in the ZIP.

## Not checked here

- `npm install`, production build, ESLint, Prettier and Vitest could not be run because the npm registry is not reachable in this environment and there is no local dependency cache.
- The complete React application was **not** browser-tested; only its CSS and imagery were visually checked in a static representation.

## How to validate locally

```sh
npm install
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

Please report any local errors along with the console output so they can be corrected precisely.
```
