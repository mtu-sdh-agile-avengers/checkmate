import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet } from '@/lib/api-client';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('api-client', () => {
  it('builds the URL from the base URL, path and query params', async () => {
    const fetchMock = mockFetchJson({ ok: true });

    await expect(
      apiGet('/players/hikaru/summary', { period: '7', timeClass: 'blitz' }),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/players/hikaru/summary?period=7&timeClass=blitz',
      expect.anything(),
    );
  });

  it('uses VITE_API_BASE_URL when it is set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api/v1/');
    const fetchMock = mockFetchJson({});

    await apiGet('/players/hikaru/profile');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/players/hikaru/profile',
      expect.anything(),
    );
  });

  it('throws the API error message ("detail") with the status', async () => {
    mockFetchJson({ detail: 'ghost player data is not available / does not exist' }, 404);

    const error = await apiGet('/players/ghost/profile').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      message: 'ghost player data is not available / does not exist',
    });
  });

  it('explains rate limiting (429) in plain words', async () => {
    mockFetchJson({ error: 'Rate limit exceeded: 1 per 1 second' }, 429);

    await expect(apiGet('/players/hikaru/profile')).rejects.toThrow('Too many requests');
  });

  it('reports when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiGet('/players/hikaru/profile')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('Cannot reach'),
    });
  });
});
