import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollMemory } from '@/app/scroll-memory';

/** The page, scrolled to `y` (jsdom lays nothing out, so the test says where it is). */
function scrollPage(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}
function pageHeight(height: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: height, configurable: true });
}

function Links() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return (
    <>
      <p>At {pathname}{search}</p>
      <button type="button" onClick={() => navigate('/players/hikaru')}>Player</button>
      <button type="button" onClick={() => navigate('/players/hikaru?stats=overall', { replace: true })}>Overall</button>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
    </>
  );
}

const renderApp = (entries = ['/']) =>
  render(
    <MemoryRouter initialEntries={entries}>
      <ScrollMemory />
      <Links />
    </MemoryRouter>,
  );
const scrolledTo = () => vi.mocked(window.scrollTo).mock.calls.map(([options]) => (options as ScrollToOptions).top);

describe('scroll positions across navigation', () => {
  beforeEach(() => {
    pageHeight(3000);
    scrollPage(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a new page at the top, keeps the place when only the query changes, and returns to it on Back', async () => {
    const user = userEvent.setup();
    renderApp();
    scrollPage(500);

    await user.click(screen.getByRole('button', { name: 'Player' }));
    expect(scrolledTo()).toEqual([0, 0]); // the first page (nothing kept), then the new one: the top

    scrollPage(900);
    await user.click(screen.getByRole('button', { name: 'Overall' }));
    expect(screen.getByText('At /players/hikaru?stats=overall')).toBeInTheDocument();
    expect(scrolledTo()).toEqual([0, 0]); // stays where it is

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('At /')).toBeInTheDocument();
    expect(scrolledTo().at(-1)).toBe(500);
  });

  it('keeps the positions for the session, and leaves the browser’s own restoration off while it runs', () => {
    // jsdom has no scrollRestoration; browsers do
    Object.defineProperty(window.history, 'scrollRestoration', { value: 'auto', writable: true, configurable: true });
    const { unmount } = renderApp();
    expect(window.history.scrollRestoration).toBe('manual');
    scrollPage(250);
    window.dispatchEvent(new Event('pagehide'));

    expect(JSON.parse(window.sessionStorage.getItem('checkmate:scroll') ?? '{}')).toEqual({ default: 250 });
    unmount();
    expect(window.history.scrollRestoration).toBe('auto');

    renderApp(); // a reload: the same history entry
    expect(scrolledTo().at(-1)).toBe(250);
    Reflect.deleteProperty(window.history, 'scrollRestoration');
  });

  it('waits for a page to grow tall enough, but not forever, and stops for the visitor', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
    window.sessionStorage.setItem('checkmate:scroll', JSON.stringify({ default: 1200 }));
    pageHeight(900); // not tall enough yet
    renderApp();
    expect(scrolledTo().at(-1)).toBe(132); // as far as it goes (900 - 768)

    pageHeight(2500);
    act(() => vi.advanceTimersByTime(20));
    expect(scrolledTo().at(-1)).toBe(1200);
    const calls = scrolledTo().length;
    act(() => vi.advanceTimersByTime(200));
    expect(scrolledTo()).toHaveLength(calls); // done: no more tries
  });

  it('gives up after a while, or when the visitor scrolls first', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
    window.sessionStorage.setItem('checkmate:scroll', JSON.stringify({ default: 1200 }));
    pageHeight(900);
    const { unmount } = renderApp();
    act(() => vi.advanceTimersByTime(2000));
    const calls = scrolledTo().length;
    act(() => vi.advanceTimersByTime(500));
    expect(scrolledTo()).toHaveLength(calls);
    unmount();

    vi.mocked(window.scrollTo).mockClear();
    renderApp();
    window.dispatchEvent(new Event('wheel'));
    act(() => vi.advanceTimersByTime(500));
    expect(scrolledTo()).toHaveLength(1);
  });

  it('does without session storage', () => {
    window.sessionStorage.setItem('checkmate:scroll', '[1, 2]');
    renderApp();
    expect(scrolledTo()).toEqual([0]);

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow();
    renderApp();
    setItem.mockRestore();
    getItem.mockRestore();
  });
});
