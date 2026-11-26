import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRouter } from '@/app/router';
import { createQueryClient } from '@/lib/query-client';
import { stubMotion } from '@/testing/motion';

afterEach(() => vi.useRealTimers());

function renderStage(route = '/') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <AppRouter />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Opens In-Game Chess and goes back to the menu with the panel's Back button. */
async function leaveInGameChess() {
  const user = userEvent.setup();
  const { container } = renderStage('/play');
  await user.click(await screen.findByRole('button', { name: 'Back' }, { timeout: 40_000 }));
  const stage = container.querySelector('.stage-screen');
  if (!stage) throw new Error('no stage');
  return { container, stage };
}

describe('the way back to the menu', () => {
  it('keeps the stage returning while the table view leaves, then until it has settled', async () => {
    stubMotion(false);
    const { container, stage } = await leaveInGameChess();

    // The view is still there, on its way out, and the menu waits for it to go.
    expect(stage).toHaveAttribute('data-return', 'leaving');
    expect(container.querySelector('.topdown-view')).toHaveAttribute('data-leaving', 'true');
    expect(container.querySelector('.search-page')).toHaveAttribute('inert');

    // Gone (0.8s): the stage settles back, and the menu item that opened the view has focus.
    await waitFor(() => expect(stage).toHaveAttribute('data-return', 'settling'), { timeout: 10_000 });
    expect(container.querySelector('.topdown-view')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '02 / In-Game Chess' })).toHaveFocus();

    // Settled (2s): nothing left running.
    await waitFor(() => expect(stage).not.toHaveAttribute('data-return'), { timeout: 10_000 });
  }, 60_000);

  it('is a short fade with reduced motion', async () => {
    stubMotion(true);
    const setTimer = vi.spyOn(window, 'setTimeout');
    const { container, stage } = await leaveInGameChess();

    expect(stage).toHaveAttribute('data-return', 'leaving');
    // The view stays for its fade (0.3s), the stage until the menu has faded in after it,
    // instead of the camera move (0.8s and 2s).
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 300);
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 900);
    expect(setTimer).not.toHaveBeenCalledWith(expect.any(Function), 2000);
    await waitFor(() => expect(stage).not.toHaveAttribute('data-return'), { timeout: 10_000 });
    expect(container.querySelector('.topdown-view')).not.toBeInTheDocument();
  }, 60_000);
});

describe('stage layout outside tests', () => {
  it('loads the other views while the browser is idle', async () => {
    vi.stubEnv('MODE', 'production');
    const idle = vi.fn((warm: () => void) => {
      warm();
      return 7;
    });
    const cancel = vi.fn();
    vi.stubGlobal('requestIdleCallback', idle);
    vi.stubGlobal('cancelIdleCallback', cancel);

    const { unmount } = renderStage();
    await screen.findByRole('searchbox', undefined, { timeout: 15_000 });
    unmount();

    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 4000 });
    expect(cancel).toHaveBeenCalledWith(7);
  }, 60_000);

  it('falls back to a timer where there is no idle callback', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubGlobal('requestIdleCallback', undefined);
    const setTimer = vi.spyOn(window, 'setTimeout');
    const clearTimer = vi.spyOn(window, 'clearTimeout');

    const { unmount } = renderStage();
    await screen.findByRole('searchbox', undefined, { timeout: 15_000 });
    unmount();

    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 1500);
    expect(clearTimer).toHaveBeenCalled();
  }, 60_000);
});
