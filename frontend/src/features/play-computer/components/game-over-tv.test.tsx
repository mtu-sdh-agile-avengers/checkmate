import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameOverTv } from '@/features/play-computer/components/game-over-tv';

const WIN = { outcome: 'win', title: 'You Win', reason: 'by checkmate' } as const;

type Handlers = { onReview?: () => void; onPlayAgain?: () => void; onMenu?: () => void; onClose?: () => void };

function renderSet(handlers: Handlers = {}) {
  return render(
    <>
      <button type="button">Outside</button>
      <GameOverTv
        result={WIN}
        level="Intermediate"
        onReview={handlers.onReview ?? vi.fn()}
        onPlayAgain={handlers.onPlayAgain ?? vi.fn()}
        onMenu={handlers.onMenu ?? vi.fn()}
        onClose={handlers.onClose ?? vi.fn()}
      />
    </>,
  );
}

describe('game-over set', () => {
  it('says how the game ended, as a modal dialog with focus on Review Game', async () => {
    renderSet();
    const dialog = screen.getByRole('dialog', { name: 'You Win' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('by checkmate');
    const review = screen.getByRole('button', { name: /^Review Game/ });
    expect(review).toHaveAccessibleName("Review Game: step through it with the engine's evaluation");
    expect(screen.getByRole('button', { name: /^Play Again/ })).toHaveAccessibleName('Play Again: a new game against the computer (Intermediate)');
    expect(screen.getByRole('button', { name: /^Main menu/ })).toBeInTheDocument();
    await vi.waitFor(() => expect(review).toHaveFocus());
  });

  it('keeps the keyboard inside: Tab and Shift+Tab go round its three buttons', async () => {
    const user = userEvent.setup();
    renderSet();
    const review = screen.getByRole('button', { name: /^Review Game/ });
    const playAgain = screen.getByRole('button', { name: /^Play Again/ });
    const menu = screen.getByRole('button', { name: /^Main menu/ });
    await vi.waitFor(() => expect(review).toHaveFocus());

    await user.tab();
    expect(playAgain).toHaveFocus();
    await user.tab();
    expect(menu).toHaveFocus();
    await user.tab();
    expect(review).toHaveFocus();
    await user.tab({ shift: true });
    expect(menu).toHaveFocus();
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(review).toHaveFocus();
    await user.keyboard('{Enter}'); // any other key is the buttons' own
  });

  it('brings focus back when it strays outside', async () => {
    renderSet();
    const review = screen.getByRole('button', { name: /^Review Game/ });
    await vi.waitFor(() => expect(review).toHaveFocus());

    screen.getByRole('button', { name: 'Outside' }).focus();

    expect(review).toHaveFocus();
  });

  it('opens the review, plays again, goes to the menu, or is put away with Escape, handing focus back', async () => {
    const user = userEvent.setup();
    const handlers = { onReview: vi.fn(), onPlayAgain: vi.fn(), onMenu: vi.fn(), onClose: vi.fn() };
    const before = document.createElement('button');
    document.body.append(before);
    before.focus();
    const { unmount } = renderSet(handlers);
    const review = screen.getByRole('button', { name: /^Review Game/ });
    await vi.waitFor(() => expect(review).toHaveFocus());

    await user.click(review);
    await user.click(screen.getByRole('button', { name: /^Play Again/ }));
    await user.click(screen.getByRole('button', { name: /^Main menu/ }));
    await user.keyboard('{Escape}');
    expect(handlers.onReview).toHaveBeenCalledTimes(1);
    expect(handlers.onPlayAgain).toHaveBeenCalledTimes(1);
    expect(handlers.onMenu).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(before).toHaveFocus();
    before.remove();
  });
});
