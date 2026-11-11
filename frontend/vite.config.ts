import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const BACKEND_URL = 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Requests to /api go to the backend (cd backend/app && uv run fastapi dev)
  server: { proxy: { '/api': BACKEND_URL } },
  preview: { proxy: { '/api': BACKEND_URL } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup.ts'],
    css: false,
    clearMocks: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
