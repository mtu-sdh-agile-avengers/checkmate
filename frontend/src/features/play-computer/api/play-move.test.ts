import { describe, expect, it, vi } from 'vitest';
import {
  NEEDS_BACKEND_MESSAGE,
  playComputerMove,
  toGameState,
} from '@/features/play-computer/api/play-move';
import { AFTER_E4_E5 } from '@/features/play-computer/api/play-move.fixtures';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('play-computer api', () => {
  it('adds the placement and the move to highlight', () => {
    const state = toGameState(AFTER_E4_E5);

    expect(state.placement).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(state.lastMove).toEqual({ from: 'e7', to: 'e5' }); // the computer's reply
    expect(
      toGameState({ ...AFTER_E4_E5, playerMove: null, computerMove: null }).lastMove,
    ).toBeNull();
  });

  it('posts the position and the move in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(AFTER_E4_E5);

    const state = await playComputerMove({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      move: 'e2e4',
      level: 'advanced',
    });

    expect(state.computerMove?.san).toBe('e5');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/computer/move',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as object;
    expect(body).toEqual({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      move: 'e2e4',
      level: 'advanced',
      playerColor: 'white',
    });
  });

  it('shows the message of a refused move', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson(
      { detail: [{ type: 'illegal_move', msg: 'This move is not allowed in this position.' }] },
      422,
    );

    await expect(playComputerMove({ move: 'e2e5', level: 'beginner' })).rejects.toThrow(
      'This move is not allowed in this position.',
    );
  });

  it('needs the backend in mock mode', async () => {
    const fetchMock = mockFetchJson({});

    await expect(playComputerMove({ level: 'beginner' })).rejects.toThrow(NEEDS_BACKEND_MESSAGE);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
