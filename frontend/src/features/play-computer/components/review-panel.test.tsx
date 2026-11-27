import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FOOLS_MATE_ANALYSIS, FOOLS_MATE_GAME } from '@/features/play-computer/api/analyse-game.fixtures';
import { ReviewPanel } from '@/features/play-computer/components/review-panel';
import { useGameReview } from '@/features/play-computer/hooks/use-game-review';
import type { SavedGame } from '@/features/play-computer/utils/saved-game';
import { createQueryClient } from '@/lib/query-client';
import { mockFetchJson } from '@/testing/mock-fetch';

function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Panel({ game }: { game: SavedGame }) {
  const review = useGameReview(game, true);
  return <ReviewPanel game={game} review={review} levelName="Intermediate" onPlayAgain={vi.fn()} onPlay={vi.fn()} onMenu={vi.fn()} />;
}

/** 1. e4 e5: a quiet start, nothing flagged. */
const QUIET: SavedGame = {
  id: 'quiet',
  level: 'beginner',
  moves: ['e2e4', 'e7e5'],
  history: ['e4', 'e5'],
  result: { outcome: 'draw', title: 'Draw', reason: 'by threefold repetition' },
  analysis: {
    ...FOOLS_MATE_ANALYSIS,
    moves: [
      { ...FOOLS_MATE_ANALYSIS.moves[1]!, ply: 1, color: 'white', san: 'e4', uci: 'e2e4', evalCp: 30, category: 'best', bestMoveSan: 'e4' },
      { ...FOOLS_MATE_ANALYSIS.moves[1]!, ply: 2, color: 'black', san: 'e5', uci: 'e7e5', evalCp: 25, category: 'good', bestMoveSan: 'c5' },
    ],
  },
};

describe('the review panel', () => {
  it('says when no move turned the game, and shows no better move for an unflagged one', () => {
    render(<Panel game={QUIET} />, { wrapper });

    expect(screen.getByText(/No big swings/)).toBeInTheDocument();
    expect(screen.getByText('+0.3')).toBeInTheDocument();
    expect(screen.queryByText(/^Best was/)).not.toBeInTheDocument(); // e5 is good: c5 is not offered
  });

  it('keeps the step buttons focusable at either end, and focus follows the move shown in the list', async () => {
    const user = userEvent.setup();
    render(<Panel game={{ ...FOOLS_MATE_GAME, analysis: FOOLS_MATE_ANALYSIS }} />, { wrapper });
    const last = screen.getByRole('button', { name: 'Last position' });
    expect(last).toHaveAttribute('aria-disabled', 'true');
    await user.click(last); // nothing to do: still here, still focusable
    expect(screen.getByText('4 / 4')).toBeInTheDocument();

    const moves = screen.getByRole('list', { name: 'Moves' });
    const shown = within(moves).getByRole('button', { name: 'Qh4#' });
    expect(shown).toHaveAttribute('tabindex', '0');
    expect(within(moves).getByRole('button', { name: 'e5' })).toHaveAttribute('tabindex', '-1');
    shown.focus();
    await user.keyboard('{ArrowLeft}');

    expect(within(moves).getByRole('button', { name: 'g4, Blunder' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Previous move' }));
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
  });

  it('says the engine could not answer, and tries again', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const user = userEvent.setup();
    const fetchMock = mockFetchJson({ detail: 'Error during loading a game. Please try again' }, 503);
    render(<Panel game={FOOLS_MATE_GAME} />, { wrapper });
    expect(screen.getByRole('status')).toHaveTextContent('Analysing every move…');

    const alert = await screen.findByRole('alert', undefined, { timeout: 5000 });
    expect(alert).toHaveTextContent('Error during loading a game. Please try again');
    fetchMock.mockResolvedValue(new Response(JSON.stringify(FOOLS_MATE_ANALYSIS), { status: 200 }));
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Move 2 g4 allowed a forced mate/ })).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
