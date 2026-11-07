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
