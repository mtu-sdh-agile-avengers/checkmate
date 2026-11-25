import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useComparison } from '@/features/player-comparison/hooks/use-comparison';
import { ValidationError } from '@/lib/errors';
import { createQueryClient } from '@/lib/query-client';
import { mockFetchJson } from '@/testing/mock-fetch';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

describe('useComparison', () => {
  it('loads nothing until the visitor asks for a comparison', () => {
    const { result } = renderHook(() => useComparison(null), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('shows invalid input at once, without a retry or a request', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson({});

    const { result } = renderHook(
      () => useComparison({ player1: 'hikaru', player2: 'HIKARU', timeClass: 'blitz' }),
      { wrapper },
    );

    // a retry would wait ~1 s, longer than waitFor's 1 s timeout
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ValidationError);
    expect(result.current.error?.message).toBe('Choose two different players to compare.');
    expect(result.current.failureCount).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
