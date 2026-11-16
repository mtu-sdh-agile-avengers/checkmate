import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';

// Retry once, except for client errors (e.g. 404 unknown player): retrying cannot fix those.
// 429 (rate limit) is retried: the default 1 s delay matches the API limit of 1 request/second.
function shouldRetry(failureCount: number, error: Error): boolean {
  const clientError =
    error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429;
  return !clientError && failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  });
}
