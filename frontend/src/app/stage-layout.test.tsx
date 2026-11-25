import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRouter } from '@/app/router';
import { createQueryClient } from '@/lib/query-client';

afterEach(() => vi.useRealTimers());

function renderStage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <AppRouter />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

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
  }, 30_000);

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
  }, 30_000);
});
