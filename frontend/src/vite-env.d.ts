/// <reference types="vite/client" />

// Environment variables used by the app (see .env.example).
interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'live' | 'mock';
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
