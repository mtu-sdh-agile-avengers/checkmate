import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameOverTv } from '@/features/play-computer/components/game-over-tv';

const WIN = { outcome: 'win', title: 'You Win', reason: 'by checkmate' } as const;

function renderSet(handlers: { onPlayAgain?: () => void; onGoBack?: () => void; onClose?: () => void } = {}) {
  return render(
    <>
      <button type="button">Outside</button>
      <GameOverTv
        result={WIN}
        level="Intermediate"
        onPlayAgain={handlers.onPlayAgain ?? vi.fn()}
        onGoBack={handlers.onGoBack ?? vi.fn()}
        onClose={handlers.onClose ?? vi.fn()}
      />
    </>,
  );
}

describe('game-over set', () => {
  it('says how the game ended, as a modal dialog with focus on Play Again', async () => {
    renderSet();
    const dialog = screen.getByRole('dialog', { name: 'You Win' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('by checkmate');
    const playAgain = screen.getByRole('button', { name: /^Play Again/ });
    expect(playAgain).toHaveAccessibleName('Play Again: a new game against the computer (Intermediate)');
    expect(screen.getByRole('button', { name: 'Go Back to the main menu' })).toBeInTheDocument();
    await vi.waitFor(() => expect(playAgain).toHaveFocus());
  });

  it('keeps the keyboard inside: Tab and Shift+Tab go round its two buttons', async () => {
    const user = userEvent.setup();
    renderSet();
    const playAgain = screen.getByRole('button', { name: /^Play Again/ });
    const goBack = screen.getByRole('button', { name: /^Go Back/ });
    await vi.waitFor(() => expect(playAgain).toHaveFocus());

    await user.tab();
    expect(goBack).toHaveFocus();
    await user.tab();
    expect(playAgain).toHaveFocus();
    await user.tab({ shift: true });
    expect(goBack).toHaveFocus();
    await user.tab({ shift: true });
    expect(playAgain).toHaveFocus();
    await user.keyboard('{Enter}'); // any other key is the buttons' own
  });

  it('brings focus back when it strays outside', async () => {
    renderSet();
    const playAgain = screen.getByRole('button', { name: /^Play Again/ });
    await vi.waitFor(() => expect(playAgain).toHaveFocus());

    screen.getByRole('button', { name: 'Outside' }).focus();

    expect(playAgain).toHaveFocus();
  });

  it('plays again, goes back, or is put away with Escape, handing focus back', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    const onGoBack = vi.fn();
    const onClose = vi.fn();
    const before = document.createElement('button');
    document.body.append(before);
    before.focus();
    const { unmount } = renderSet({ onPlayAgain, onGoBack, onClose });
    const playAgain = screen.getByRole('button', { name: /^Play Again/ });
    await vi.waitFor(() => expect(playAgain).toHaveFocus());

    await user.click(playAgain);
    await user.click(screen.getByRole('button', { name: /^Go Back/ }));
    await user.keyboard('{Escape}');
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onGoBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(before).toHaveFocus();
    before.remove();
  });
});
