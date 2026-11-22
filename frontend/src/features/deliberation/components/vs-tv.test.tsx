import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VsTv } from '@/features/deliberation/components/vs-tv';
import type { FoundPlayer } from '@/features/deliberation/types';

const found = (username: string, title: string | null = null): FoundPlayer => ({
  username,
  url: `https://www.chess.com/member/${username}`,
  avatar: null,
  title,
});

/** A player search that knows hikaru (GM) and anyone else except "ghost". */
const fakeSearch = () =>
  vi.fn(async (username: string) => {
    if (username === 'ghost') throw new Error('No Chess.com player found for "ghost"');
    return found(username, username === 'hikaru' ? 'GM' : null);
  });

function setup(findPlayer = fakeSearch()) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const onSeatsChange = vi.fn();
  render(<VsTv findPlayer={findPlayer} introDone onConfirm={onConfirm} onCancel={onCancel} onSeatsChange={onSeatsChange} />);
  const field = (n: 1 | 2) => screen.getByRole('textbox', { name: new RegExp(`Player ${n}`) });
  const slot = (n: 1 | 2) => screen.getByRole('region', { name: new RegExp(`Player ${n}`) });
  return { user: userEvent.setup(), findPlayer, onConfirm, onCancel, onSeatsChange, field, slot };
}

describe('VS screen', () => {
  it('puts focus in Player 1 and keeps Confirm off until both players are entered', async () => {
    const { user, field } = setup();
    await waitFor(() => expect(field(1)).toHaveFocus());
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Enter both players to continue.');
    await user.type(field(1), 'hikaru');
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for Player 2.');
    await user.type(field(2), 'magnuscarlsen');
    expect(confirm).toBeEnabled();
  });

  it('looks a player up on Enter, shows who was found and moves on to the next slot', async () => {
    const { user, field, slot, onConfirm, onSeatsChange, findPlayer } = setup();
    await user.type(field(1), 'Hikaru{Enter}');
    expect(await within(slot(1)).findByText('hikaru')).toBeInTheDocument();
    expect(findPlayer).toHaveBeenCalledWith('hikaru');
    expect(within(slot(1)).getByText('GM')).toBeInTheDocument();
    expect(within(slot(1)).getByText('Found on Chess.com.')).toBeInTheDocument();
    await waitFor(() => expect(field(2)).toHaveFocus());
    expect(onSeatsChange).toHaveBeenLastCalledWith([found('hikaru', 'GM'), null]);

    await user.type(field(2), 'https://www.chess.com/member/MagnusCarlsen{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByRole('status')).toHaveTextContent('Locked in.');
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith([found('hikaru', 'GM'), found('magnuscarlsen')]));
  });

  it('shows the lookup in progress and the search message when a player does not exist', async () => {
    let answer: (player: FoundPlayer) => void = () => {};
    const slowSearch = vi.fn(
      (username: string) =>
        new Promise<FoundPlayer>((resolve, reject) => {
          if (username === 'ghost') reject(new Error('No Chess.com player found for "ghost"'));
          else answer = resolve;
        }),
    );
    const { user, field, slot } = setup(slowSearch);
    await user.type(field(1), 'hikaru{Enter}');
    expect(within(slot(1)).getByRole('button', { name: 'Checking…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Looking up Player 1 on Chess.com…');
    answer(found('hikaru'));
    expect(await within(slot(1)).findByText('hikaru')).toBeInTheDocument();

    await user.type(field(2), 'ghost{Enter}');
    expect(await within(slot(2)).findByRole('alert')).toHaveTextContent('No Chess.com player found for "ghost"');
    expect(field(2)).toHaveAttribute('aria-invalid', 'true');
  });

  it('confirms with both names typed, looking both up first', async () => {
    const { user, field, findPlayer, onConfirm } = setup();
    await user.type(field(1), 'hikaru');
    await user.type(field(2), 'nakamura');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith([found('hikaru', 'GM'), found('nakamura')]));
    expect(findPlayer).toHaveBeenCalledTimes(2);
  });

  it('refuses the same player twice and an empty or invalid slot without looking anyone up', async () => {
    const { user, field, slot, onConfirm, findPlayer } = setup();
    await user.click(within(slot(1)).getByRole('button', { name: 'Lock in' }));
    expect(within(slot(1)).getByRole('alert')).toHaveTextContent('Enter a Chess.com username');
    expect(field(1)).toHaveAttribute('aria-invalid', 'true');

    await user.type(field(1), 'hikaru');
    await user.type(field(2), 'HIKARU');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(within(slot(2)).getByRole('alert')).toHaveTextContent("Player 2 can't be the same as Player 1.");
    await waitFor(() => expect(field(2)).toHaveFocus());
    expect(onConfirm).not.toHaveBeenCalled();

    await user.clear(field(2));
    await user.type(field(2), 'x');
    await user.tab();
    expect(within(slot(2)).getByRole('alert')).toHaveTextContent(/3–25 characters/);
    expect(findPlayer).not.toHaveBeenCalledWith('x');
  });

  it('lets a found player be changed', async () => {
    const { user, field, slot } = setup();
    await user.type(field(1), 'hikaru{Enter}');
    await user.click(await within(slot(1)).findByRole('button', { name: 'Change Player 1' }));
    expect(field(1)).toHaveFocus();
    expect(field(1)).toHaveValue('hikaru');
  });

  it('goes back with Escape or Cancel', async () => {
    const { user, field, onCancel } = setup();
    await user.click(field(1));
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
