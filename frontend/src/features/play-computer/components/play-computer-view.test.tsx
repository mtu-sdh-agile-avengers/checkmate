import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FOOLS_MATE_ANALYSIS, FOOLS_MATE_GAME } from '@/features/play-computer/api/analyse-game.fixtures';
import type { ComputerMoveDto } from '@/features/play-computer/api/play-move';
import { AFTER_E4_E5, GAME_START } from '@/features/play-computer/api/play-move.fixtures';
import { PlayComputerView } from '@/features/play-computer/components/play-computer-view';
import { loadFinishedGame, saveFinishedGame } from '@/features/play-computer/utils/saved-game';
import { dragPiece } from '@/testing/pointer';
import { renderWithProviders } from '@/testing/render-with-providers';

// Whole games against a mocked server: generous limits, as the whole suite runs in parallel
// (see app/router.test.tsx), for every lookup here and for each test.
configure({ asyncUtilTimeout: 10_000 });
const GAME_TIMEOUT = 30_000;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** The backend answers each POST with the next of these responses. */
function mockGameResponses(...bodies: object[]) {
  const fetchMock = vi.fn();
  for (const body of bodies) fetchMock.mockResolvedValueOnce(json(body));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const played = (uci: string, san: string) => ({ uci, san, fromSquare: uci.slice(0, 2), toSquare: uci.slice(2, 4) });
/** 1. Nf3 Nf6: both knights out. */
const KNIGHTS_OUT: ComputerMoveDto = {
  ...GAME_START,
  fen: 'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2',
  playerMove: played('g1f3', 'Nf3'),
  computerMove: played('g8f6', 'Nf6'),
  legalMoves: ['f3g1', 'f3e5', 'e2e4'],
};
/** 2. Ng1 Ng8: back where the game started (only the move counters differ). */
const KNIGHTS_BACK: ComputerMoveDto = {
  ...GAME_START,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 4 3',
  playerMove: played('f3g1', 'Ng1'),
  computerMove: played('f6g8', 'Ng8'),
};
/** 1. e4 e5 2. d4 Bb4+: your king is in check; only a block or Ke2 will do. */
const BISHOP_CHECK: ComputerMoveDto = {
  fen: 'rnbqk1nr/pppp1ppp/8/4p3/1b1PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3',
  playerMove: played('d2d4', 'd4'),
  computerMove: played('f8b4', 'Bb4+'),
  turn: 'white',
  legalMoves: ['b1c3', 'b1d2', 'c1d2', 'c2c3', 'd1d2', 'e1e2'],
  check: true,
  status: 'playing',
  winner: null,
};
/** 1. e4 f6: the diagonal to the black king is open (2. Qh5+). */
const AFTER_E4_F6: ComputerMoveDto = {
  fen: 'rnbqkbnr/ppppp1pp/5p2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  playerMove: played('e2e4', 'e4'),
  computerMove: played('f7f6', 'f6'),
  turn: 'white',
  legalMoves: ['d1h5', 'd2d4', 'g1f3'],
  check: false,
  status: 'playing',
  winner: null,
};
/** 2. Qh5+ g6: the computer blocks. */
const AFTER_QH5_G6: ComputerMoveDto = {
  fen: 'rnbqkbnr/ppppp2p/5pp1/7Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3',
  playerMove: played('d1h5', 'Qh5+'),
  computerMove: played('g7g6', 'g6'),
  turn: 'white',
  legalMoves: ['h5g6', 'h5h7', 'd2d4'],
  check: false,
  status: 'playing',
  winner: null,
};
/** 1. f3 e5: on the way to the fool's mate. */
const AFTER_F3_E5: ComputerMoveDto = {
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
  playerMove: played('f2f3', 'f3'),
  computerMove: played('e7e5', 'e5'),
  turn: 'white',
  legalMoves: ['g2g4', 'e2e4', 'g1h3'],
  check: false,
  status: 'playing',
  winner: null,
};
/** 2. g4 Qh4#: the computer mates. */
const FOOLS_MATE: ComputerMoveDto = {
  fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
  playerMove: played('g2g4', 'g4'),
  computerMove: played('d8h4', 'Qh4#'),
  turn: 'white',
  legalMoves: [],
  check: true,
  status: 'checkmate',
  winner: 'black',
};

/** A reply of the server: your move, the computer's, and the position after both. */
const reply = (fen: string, yours: [string, string], computers: [string, string], legalMoves: string[]): ComputerMoveDto => ({
  fen,
  playerMove: played(...yours),
  computerMove: played(...computers),
  turn: 'white',
  legalMoves,
  check: false,
  status: 'playing',
  winner: null,
});
/**
 * Your knight goes out and comes back by another road (g1-f3-h4-f3-h4-f3) while the computer's
 * knights come and go: the position after your Nf3 (Black to move) comes up three times, each
 * time answered differently, and no position with White to move comes up a third time.
 */
const KNIGHT_ROAD = [
  reply('r1bqkbnr/pppppppp/2n5/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 2', ['g1f3', 'Nf3'], ['b8c6', 'Nc6'], ['f3h4', 'f3g1', 'e2e4']),
  reply('rnbqkbnr/pppppppp/8/8/7N/8/PPPPPPPP/RNBQKB1R w KQkq - 4 3', ['f3h4', 'Nh4'], ['c6b8', 'Nb8'], ['h4f3', 'h4g6', 'e2e4']),
  reply('rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 6 4', ['h4f3', 'Nf3'], ['g8f6', 'Nf6'], ['f3h4', 'f3g1', 'e2e4']),
  reply('rnbqkbnr/pppppppp/8/8/7N/8/PPPPPPPP/RNBQKB1R w KQkq - 8 5', ['f3h4', 'Nh4'], ['f6g8', 'Ng8'], ['h4f3', 'h4g6', 'e2e4']),
  reply('r1bqkbnr/pppppppp/2n5/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 10 6', ['h4f3', 'Nf3'], ['b8c6', 'Nc6'], ['f3h4', 'f3g1', 'e2e4']),
];

const renderGame = () => renderWithProviders(<PlayComputerView />, { route: '/play', path: '/play' });
const notifications = () => screen.getByRole('log', { name: 'Game notifications' });
const moveRows = () => within(screen.getByRole('list', { name: 'Moves' })).getAllByRole('listitem').map((row) => row.textContent);

async function startGame(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'Start game' }));
  await screen.findByText('Your move.');
}
/** Click-to-move: the piece, then its square. */
async function clickMove(user: UserEvent, from: string, to: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${from}, white `) }));
  await user.click(screen.getByRole('button', { name: `${to}, move here` }));
}
/** 1. f3 e5 2. g4 Qh4#. */
async function walkIntoFoolsMate(user: UserEvent) {
  await startGame(user);
  await clickMove(user, 'f2', 'f3');
  await screen.findByText('The computer played e5. Your move.');
  await clickMove(user, 'g2', 'g4');
  return screen.findByRole('dialog', { name: 'You Lose' });
}

describe('play-computer view', { timeout: GAME_TIMEOUT }, () => {
  it('plays a move against the computer in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START, AFTER_E4_E5);
    const user = userEvent.setup();
    renderGame();

    await startGame(user);
    expect(screen.getByText(/No moves yet/)).toBeInTheDocument();

    // pick up the e2 pawn: e3 and e4 light up
    await user.click(screen.getByRole('button', { name: 'e2, white pawn' }));
    expect(screen.getByRole('button', { name: 'e2, white pawn' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'e4, move here' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e3, move here' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'e4, move here' }));

    expect(await screen.findByText('The computer played e5. Your move.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e4, white pawn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e5, black pawn' })).toBeInTheDocument();
    expect(moveRows()).toEqual(['1.e4e5']);
    const body = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as { move: string };
    expect(body.move).toBe('e2e4');
  });

  it('plays a move by dragging the piece to its square', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START, AFTER_E4_E5);
    const user = userEvent.setup();
    renderGame();
    await startGame(user);

    dragPiece(screen.getByRole('button', { name: 'e2, white pawn' }), screen.getByRole('button', { name: 'e4' }));

    expect(await screen.findByText('The computer played e5. Your move.')).toBeInTheDocument();
    expect(moveRows()).toEqual(['1.e4e5']);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toMatchObject({ move: 'e2e4' });
  });

  it('shows your move at once, takes it back if the server cannot answer, and tries it again', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    let answer: (response: Response) => void = () => undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(GAME_START))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { answer = resolve; }))
      .mockResolvedValueOnce(json(AFTER_E4_E5));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderGame();
    await startGame(user);

    await clickMove(user, 'e2', 'e4');

    // Before the server answers: the pawn is on e4, listed, and the computer is to move.
    expect(screen.getByRole('button', { name: 'e4, white pawn' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Moves' })).getByText('e4')).toHaveAttribute('data-pending', 'true');
    expect(screen.getByText('The computer is thinking…')).toBeInTheDocument();
    expect(screen.getByText('To move').closest('li')).toHaveTextContent('Computer');

    answer(json({ detail: 'The computer can’t play right now. Please try again' }, 503));

    expect(await screen.findByText('The computer can’t play right now. Please try again')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e2, white pawn' })).toBeInTheDocument(); // back home
    expect(screen.getByText(/No moves yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('The computer played e5. Your move.')).toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(fetchMock.mock.calls[1]?.[1]?.body);
  });

  it('ignores squares without a legal move', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START);
    const user = userEvent.setup();
    renderGame();

    await startGame(user);
    await user.click(screen.getByRole('button', { name: 'e8, black king' }));
    await user.click(screen.getByRole('button', { name: 'e5' }));

    expect(screen.queryByRole('button', { name: /move here/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the start of the game
  });

  it('says why a move is refused, and the piece stays where it was', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START);
    const user = userEvent.setup();
    renderGame();
    await startGame(user);

    await user.click(screen.getByRole('button', { name: 'g1, white knight' }));
    await user.click(screen.getByRole('button', { name: 'g3' }));
    expect(within(notifications()).getByText(/^A knight moves in an L/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'g1, white knight' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'a1, white rook' }));
    expect(within(notifications()).getByText('That rook can’t move right now.')).toBeInTheDocument();

    dragPiece(screen.getByRole('button', { name: 'e2, white pawn' }), screen.getByRole('button', { name: 'e5' }));
    expect(within(notifications()).getByText('A pawn moves straight ahead and takes diagonally.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e2, white pawn' })).toBeInTheDocument();

    // Another of your pieces switches the selection; the same one again puts it down.
    await user.click(screen.getByRole('button', { name: 'b1, white knight' }));
    await user.click(screen.getByRole('button', { name: 'g1, white knight' }));
    expect(screen.getByRole('button', { name: 'g1, white knight' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'g1, white knight' }));
    expect(screen.getByRole('button', { name: 'g1, white knight' })).toHaveAttribute('aria-pressed', 'false');
    // Dropped back where it came from, a piece makes no move.
    dragPiece(screen.getByRole('button', { name: 'e2, white pawn' }), screen.getByRole('button', { name: 'e2, white pawn' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('warns of check, marks your king and says why a move does not get it out', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockGameResponses(GAME_START, AFTER_E4_E5, BISHOP_CHECK);
    const user = userEvent.setup();
    renderGame();
    await startGame(user);
    await clickMove(user, 'e2', 'e4');
    await screen.findByText('The computer played e5. Your move.');
    await clickMove(user, 'd2', 'd4');

    expect(await within(notifications()).findByText('Check! Your king is in check.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e1, white king, in check' })).toHaveAttribute('data-check', 'true');
    expect(moveRows()).toEqual(['1.e4e5', '2.d4Bb4+']);

    await user.click(screen.getByRole('button', { name: 'c2, white pawn' }));
    await user.click(screen.getByRole('button', { name: 'c4' }));
    expect(within(notifications()).getByText('Your king is in check, and that move doesn’t get it out.')).toBeInTheDocument();
  });

  it('marks the computer’s king in check while it thinks about your checking move', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    let answer: (response: Response) => void = () => undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(GAME_START))
      .mockResolvedValueOnce(json(AFTER_E4_F6))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { answer = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderGame();
    await startGame(user);
    await clickMove(user, 'e2', 'e4');
    await screen.findByText('The computer played f6. Your move.');

    await clickMove(user, 'd1', 'h5');

    expect(await within(notifications()).findByText('Check! The computer’s king is in check.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e8, black king, in check' })).toBeInTheDocument();
    expect(moveRows()).toEqual(['1.e4f6', '2.Qh5+']);

    answer(json(AFTER_QH5_G6));
    expect(await screen.findByText('The computer played g6. Your move.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e8, black king' })).not.toHaveAttribute('data-check');
  });

  it('brings the game-over set down at checkmate, Review Game first; Play Again starts a new game', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START, AFTER_F3_E5, FOOLS_MATE, GAME_START);
    const user = userEvent.setup();
    renderGame();

    const dialog = await walkIntoFoolsMate(user);
    expect(dialog).toHaveAccessibleDescription('by checkmate');
    await waitFor(() => expect(screen.getByRole('button', { name: /^Review Game/ })).toHaveFocus());
    expect(screen.getByRole('button', { name: 'e1, white king, in check' })).toBeInTheDocument();
    expect(moveRows()).toEqual(['1.f3e5', '2.g4Qh4#']);

    await user.click(screen.getByRole('button', { name: /^Play Again/ }));

    expect(await screen.findByText('Your move.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'e2, white pawn' })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string)).toMatchObject({ move: null });
  });

  it('puts the game-over set away with Escape, leaving Review game in the panel; Main menu leaves', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockGameResponses(GAME_START, AFTER_F3_E5, FOOLS_MATE);
    const user = userEvent.setup();
    const first = renderGame();

    await walkIntoFoolsMate(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Checkmate — the computer wins.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review game' })).toBeInTheDocument();
    first.unmount();

    mockGameResponses(GAME_START, AFTER_F3_E5, FOOLS_MATE);
    renderGame();
    await walkIntoFoolsMate(user);
    await user.click(screen.getByRole('button', { name: /^Main menu/ }));
    await waitFor(() => expect(screen.queryByRole('group', { name: /Board for your game/ })).not.toBeInTheDocument());
  });

  it('keeps the finished game and reviews it: every move, its flags, the turning point, then Play again', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START, AFTER_F3_E5, FOOLS_MATE, FOOLS_MATE_ANALYSIS, GAME_START);
    const user = userEvent.setup();
    renderWithProviders(<PlayComputerView />, { route: '/play', path: '/play/*' });

    await walkIntoFoolsMate(user);
    expect(loadFinishedGame()).toMatchObject({
      level: 'intermediate',
      moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'],
      history: ['f3', 'e5', 'g4', 'Qh4#'],
      result: { outcome: 'loss', title: 'You Lose', reason: 'by checkmate' },
    });

    await user.click(screen.getByRole('button', { name: /^Review Game/ }));

    const panel = await screen.findByRole('complementary', { name: 'Game review' });
    expect(within(panel).getByText('You Lose')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string)).toEqual({ moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'] });
    // It opens at the final position, with the engine's verdict on the TV.
    const tv = await screen.findByRole('complementary', { name: 'Evaluation' });
    expect(within(tv).getByText('0-1')).toBeInTheDocument();
    expect(within(tv).getByText('Checkmate: the computer won')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Board: the position after move 2… Qh4#' })).toBeInTheDocument();
    const turningPoint = within(panel).getByRole('button', { name: /Move 2 g4 allowed a forced mate in 1; best was Nc3/ });

    // The turning point: the blunder, flagged on its square, the better move drawn.
    await user.click(turningPoint);
    expect(screen.getByRole('img', { name: 'Board: the position after move 2 g4' })).toBeInTheDocument();
    expect(within(panel).getByText(/^Best was/)).toHaveTextContent('Best was Nc3 (the arrow on the board)');
    expect(document.querySelector('.game-board__marker')).toHaveAttribute('data-mark', 'blunder');
    expect(document.querySelector('.game-board__arrow')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'g4, Blunder' })).toHaveAttribute('aria-current', 'step');

    // Step back with the keyboard and the buttons.
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('img', { name: 'Board: the position after move 1… e5' })).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'First position' }));
    expect(screen.getByRole('img', { name: 'Board: the starting position of the game reviewed' })).toBeInTheDocument();
    expect(within(panel).getByText('The starting position. Step forward with → or the buttons.')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Play again' }));
    expect(await screen.findByText('Your move.')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[4]?.[1]?.body as string)).toMatchObject({ move: null, level: 'intermediate' });
  });

  it('reviews the last game kept in the browser after a reload, without asking the engine again', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    saveFinishedGame({ ...FOOLS_MATE_GAME, analysis: FOOLS_MATE_ANALYSIS });
    const fetchMock = mockGameResponses();
    const user = userEvent.setup();
    renderWithProviders(<PlayComputerView />, { route: '/play/review', path: '/play/*' });

    const panel = await screen.findByRole('complementary', { name: 'Game review' });
    expect(within(panel).getByText('You Lose')).toBeInTheDocument();
    expect(await screen.findByRole('complementary', { name: 'Evaluation' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(within(panel).getByRole('button', { name: 'Main menu' }));
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Game review' })).not.toBeInTheDocument());
  });

  it('says when there is no game to review yet, and offers one', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PlayComputerView />, { route: '/play/review', path: '/play/*' });

    const panel = await screen.findByRole('complementary', { name: 'Game review' });
    expect(within(panel).getByText(/No finished game to review yet/)).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Evaluation' })).not.toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Play a game' }));
    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument();
  });

  it('calls a draw when the same position comes up a third time', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START, KNIGHTS_OUT, KNIGHTS_BACK, KNIGHTS_OUT, KNIGHTS_BACK);
    const user = userEvent.setup();
    renderGame();

    await startGame(user);
    await clickMove(user, 'g1', 'f3');
    await clickMove(user, 'f3', 'g1');
    await clickMove(user, 'g1', 'f3');
    await clickMove(user, 'f3', 'g1'); // the starting position, for the third time

    expect(
      await screen.findByText('Draw by threefold repetition — the same position came up three times.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: 'Draw' })).toHaveAccessibleDescription('by threefold repetition');
    await user.keyboard('{Escape}');
    // The game is over: no more moves are taken, and the statistics set says so.
    await user.click(screen.getByRole('button', { name: 'g1, white knight' }));
    expect(screen.queryByRole('button', { name: /move here/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const stats = screen.getByRole('complementary', { name: 'Game stats' });
    expect(within(stats).getByText('CH 2 · FINAL')).toBeInTheDocument();
    expect(within(stats).getByText('Half-moves', { selector: 'dt' }).nextElementSibling).toHaveTextContent('8');
  });

  it('calls a draw when your move brings a position back a third time, before the computer replies', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockGameResponses(GAME_START, ...KNIGHT_ROAD);
    const user = userEvent.setup();
    renderGame();
    await startGame(user);

    for (const [from, to, answer] of [['g1', 'f3', 'Nc6'], ['f3', 'h4', 'Nb8'], ['h4', 'f3', 'Nf6'], ['f3', 'h4', 'Ng8']] as const) {
      await clickMove(user, from, to);
      await screen.findByText(`The computer played ${answer}. Your move.`);
    }
    await clickMove(user, 'h4', 'f3'); // the position after it, for the third time

    expect(await screen.findByRole('dialog', { name: 'Draw' })).toHaveAccessibleDescription('by threefold repetition');
    // Drawn on your move: the computer's reply (the server played Nc6) is never shown.
    expect(moveRows()).toEqual(['1.Nf3Nc6', '2.Nh4Nb8', '3.Nf3Nf6', '4.Nh4Ng8', '5.Nf3']);
    expect(screen.getByRole('button', { name: 'f3, white knight' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'b8, black knight' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'c6' })).toBeInTheDocument();
    expect(screen.getByText('Draw by threefold repetition — the same position came up three times.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('explains that playing needs the backend in mock mode', async () => {
    const user = userEvent.setup();
    renderGame();

    await user.click(await screen.findByRole('button', { name: 'Start game' }));

    await waitFor(() => expect(screen.getByText(/Playing needs the backend/)).toBeInTheDocument());
    expect(screen.getByRole('img', { name: /Board for your game/ })).toBeInTheDocument();
  });
});
