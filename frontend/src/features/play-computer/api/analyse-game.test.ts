import { describe, expect, it, vi } from 'vitest';
import { analyseComputerGame, REVIEW_NEEDS_BACKEND_MESSAGE } from '@/features/play-computer/api/analyse-game';
import { FOOLS_MATE_ANALYSIS, FOOLS_MATE_GAME } from '@/features/play-computer/api/analyse-game.fixtures';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('analyseComputerGame', () => {
  it('sends every move of the game and returns the engine’s analysis', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(FOOLS_MATE_ANALYSIS);

    await expect(analyseComputerGame(FOOLS_MATE_GAME.moves)).resolves.toEqual(FOOLS_MATE_ANALYSIS);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/computer/analysis');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'] });
  });

  it('says the review needs the backend in mock mode', async () => {
    const fetchMock = mockFetchJson({});

    await expect(analyseComputerGame(['e2e4'])).rejects.toThrow(REVIEW_NEEDS_BACKEND_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
