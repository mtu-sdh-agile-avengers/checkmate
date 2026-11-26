import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AFTER_E4_E5, GAME_START } from '@/features/play-computer/api/play-move.fixtures';
import { PlayComputerView } from '@/features/play-computer/components/play-computer-view';
import { renderWithProviders } from '@/testing/render-with-providers';

/** The backend answers each POST with the next of these responses. */
function mockGameResponses(...bodies: object[]) {
  const fetchMock = vi.fn();
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }),
    );
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('play-computer view', () => {
  it('plays a move against the computer in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START, AFTER_E4_E5);
    const user = userEvent.setup();
    renderWithProviders(<PlayComputerView />, { route: '/play', path: '/play' });

    await user.click(await screen.findByRole('button', { name: 'Start game' }));
    expect(await screen.findByText('Your move.')).toBeInTheDocument();

    // pick up the e2 pawn: e3 and e4 light up
    await user.click(screen.getByRole('button', { name: 'e2, white pawn' }));
    expect(screen.getByRole('button', { name: 'e2, white pawn' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'e4, move here' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e3, move here' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'e4, move here' }));

    expect(await screen.findByText('The computer played e5. Your move.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e4, white pawn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e5, black pawn' })).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as { move: string };
    expect(body.move).toBe('e2e4');
  });

  it('ignores squares without a legal move', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START);
    const user = userEvent.setup();
    renderWithProviders(<PlayComputerView />, { route: '/play', path: '/play' });

    await user.click(await screen.findByRole('button', { name: 'Start game' }));
    await screen.findByText('Your move.');
    await user.click(screen.getByRole('button', { name: 'e8, black king' }));
    await user.click(screen.getByRole('button', { name: 'e5' }));

    expect(screen.queryByRole('button', { name: /move here/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the start of the game
  });

  it('explains that playing needs the backend in mock mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PlayComputerView />, { route: '/play', path: '/play' });

    await user.click(await screen.findByRole('button', { name: 'Start game' }));

    await waitFor(() => expect(screen.getByText(/Playing needs the backend/)).toBeInTheDocument());
    expect(screen.getByRole('img', { name: /Board for your game/ })).toBeInTheDocument();
  });
});
