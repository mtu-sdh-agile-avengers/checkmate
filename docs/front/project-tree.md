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
