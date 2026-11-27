import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOOLS_MATE_ANALYSIS, FOOLS_MATE_GAME } from '@/features/play-computer/api/analyse-game.fixtures';
import { ReviewTv } from '@/features/play-computer/components/review-tv';
import { useGameReview, type GameReview } from '@/features/play-computer/hooks/use-game-review';
import { loadFinishedGame, saveFinishedGame, type SavedGame } from '@/features/play-computer/utils/saved-game';
import { createQueryClient } from '@/lib/query-client';
import { closeAudio, unlockAudio } from '@/lib/sound';
import { FakeAudioContext } from '@/testing/audio';
import { mockFetchJson } from '@/testing/mock-fetch';

function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const review = (game: SavedGame | null, active = true) =>
  renderHook(({ shown, on }) => useGameReview(shown, on), { wrapper, initialProps: { shown: game, on: active } });
const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = window) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });

describe('useGameReview', () => {
  beforeEach(() => {
    FakeAudioContext.reset();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });
  afterEach(() => closeAudio());

  it('asks the engine once, keeps its analysis with the game, and opens at the final position', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    saveFinishedGame(FOOLS_MATE_GAME);
    const fetchMock = mockFetchJson(FOOLS_MATE_ANALYSIS);
    const { result } = review(FOOLS_MATE_GAME);

    expect(result.current.loading).toBe(true);
    expect(result.current.ply).toBe(4);
    await waitFor(() => expect(result.current.analysis).toEqual(FOOLS_MATE_ANALYSIS));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loadFinishedGame()?.analysis).toEqual(FOOLS_MATE_ANALYSIS);
    expect(result.current.current?.san).toBe('Qh4#');
    expect(result.current.summary?.marks).toEqual(['inaccuracy', null, 'blunder', null]);
    expect(result.current.summary?.moments).toHaveLength(1);
    expect(result.current.replay?.pieces.find((piece) => piece.square === 'h4')?.kind).toBe('queen');
  });

  it('steps with ← → Home End, not while typing or with a modifier, and clicks each step', async () => {
    const { result } = review({ ...FOOLS_MATE_GAME, analysis: FOOLS_MATE_ANALYSIS });
    unlockAudio();
    const clicks = () => FakeAudioContext.made.at(-1)?.started.filter(({ kind }) => kind === 'noise').length;

    press('Home');
    expect(result.current.ply).toBe(0);
    expect(result.current.current).toBeNull();
    press('ArrowLeft'); // already at the start
    expect(result.current.ply).toBe(0);
    press('ArrowRight');
    expect(result.current.ply).toBe(1);
    expect(clicks()).toBe(2); // to the start, then one step
    press('ArrowRight', { ctrlKey: true });
    press('x');
    expect(result.current.ply).toBe(1);

    const input = document.createElement('input');
    document.body.append(input);
    press('ArrowRight', {}, input);
    expect(result.current.ply).toBe(1);
    input.remove();

    press('End');
    expect(result.current.ply).toBe(4);
    act(() => result.current.goTo(99)); // past the end: the end
    act(() => result.current.goTo(-3)); // before the start: the start
    expect(result.current.ply).toBe(0);
  });

  it('opens another game at its final position', () => {
    const { result, rerender } = review({ ...FOOLS_MATE_GAME, analysis: FOOLS_MATE_ANALYSIS });
    act(() => result.current.goTo(0));

    rerender({ shown: { ...FOOLS_MATE_GAME, id: 'another', moves: ['e2e4'], history: ['e4'] }, on: true });

    expect(result.current.ply).toBe(1);
    expect(result.current.total).toBe(1);
  });

  it('takes no keys while away from the review, and shows no pieces for moves that do not play', () => {
    const { result } = review({ ...FOOLS_MATE_GAME, moves: ['e4e5'], history: ['e5'] }, false);

    press('Home');

    expect(result.current.ply).toBe(1);
    expect(result.current.replay).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('says why the engine could not answer, and tries again', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson({ detail: 'Error during loading a game. Please try again' }, 503);
    const { result } = review(FOOLS_MATE_GAME);

    // after one more try, a second later (the engine may only have been busy)
    await waitFor(() => expect(result.current.error?.message).toBe('Error during loading a game. Please try again'), { timeout: 5000 });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(FOOLS_MATE_ANALYSIS), { status: 200 }));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.analysis).toEqual(FOOLS_MATE_ANALYSIS));
  });
});

function Tv({ game }: { game: SavedGame }) {
  const shown: GameReview = useGameReview(game, true);
  return <ReviewTv review={shown} delayed />;
}

describe('the review TV', () => {
  it('shows the evaluation, the chances, the flags of each side and the engine; a click on the graph opens that position', async () => {
    const user = userEvent.setup();
    render(<Tv game={{ ...FOOLS_MATE_GAME, analysis: FOOLS_MATE_ANALYSIS }} />, { wrapper });
    const tv = screen.getByRole('complementary', { name: 'Evaluation' });
    expect(tv.style.getPropertyValue('--tv-delay')).toBe('1.05s');
    expect(screen.getByText('0-1')).toBeInTheDocument();
    expect(screen.getByText('You 0%')).toBeInTheDocument();
    expect(screen.getByText('Stockfish 17 · depth 18')).toBeInTheDocument();
    const you = screen.getByRole('row', { name: /^You/ });
    expect(you).toHaveTextContent('You101'); // 1 blunder, 0 mistakes, 1 inaccuracy
    expect(document.querySelectorAll('.review-tv__dot')).toHaveLength(2);

    const graph = document.querySelector<HTMLElement>('.review-tv__graph');
    if (!graph) throw new Error('no graph');
    graph.getBoundingClientRect = () => ({ left: 0, width: 400, top: 0, height: 92, right: 400, bottom: 92, x: 0, y: 0, toJSON: () => ({}) });
    await user.pointer({ keys: '[MouseLeft]', target: graph, coords: { clientX: 0, clientY: 10 } });

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('The starting position')).toBeInTheDocument();
  });

  it('says when the evaluation is rough (the built-in evaluator), loading, or off the air', async () => {
    const rough = { ...FOOLS_MATE_ANALYSIS, engine: 'Built-in evaluator (approximate)', depth: 2 };
    const { unmount } = render(<Tv game={{ ...FOOLS_MATE_GAME, analysis: rough }} />, { wrapper });
    expect(screen.getByText(/Rough figures/)).toBeInTheDocument();
    unmount();

    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson({ detail: 'Error during loading a game. Please try again' }, 503);
    render(<Tv game={FOOLS_MATE_GAME} />, { wrapper });
    expect(screen.getByText('Analysing every move…')).toBeInTheDocument();
    expect(await screen.findByText('No signal: the analysis did not load.', undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it('has nothing to show for a game without moves', () => {
    render(<Tv game={{ ...FOOLS_MATE_GAME, moves: [], history: [] }} />, { wrapper });

    expect(screen.getByText('Nothing to review yet.')).toBeInTheDocument();
  });
});
