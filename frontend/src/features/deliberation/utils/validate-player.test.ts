import { describe, expect, it } from 'vitest';
import { checkPlayer } from '@/features/deliberation/utils/validate-player';

describe('checkPlayer', () => {
  it('asks for a username when the slot is empty', () => {
    expect(checkPlayer('', 0, null)).toEqual({ ok: false, error: 'Enter a Chess.com username or member profile URL.' });
    expect(checkPlayer('   ', 1, null).ok).toBe(false);
  });

  it('accepts a username or a member link, in lower case', () => {
    expect(checkPlayer('Hikaru', 0, null)).toEqual({ ok: true, username: 'hikaru' });
    expect(checkPlayer('https://www.chess.com/member/MagnusCarlsen', 1, null)).toEqual({ ok: true, username: 'magnuscarlsen' });
  });

  it('refuses names the search would refuse', () => {
    expect(checkPlayer('ab', 0, null)).toMatchObject({ ok: false, error: expect.stringMatching(/3–25 characters/) });
    expect(checkPlayer('https://example.com/member/hikaru', 0, null)).toMatchObject({ ok: false, error: expect.stringMatching(/chess\.com/i) });
  });

  it('refuses the same player in both slots, however it is written', () => {
    expect(checkPlayer('HIKARU', 1, 'hikaru')).toEqual({ ok: false, error: "Player 2 can't be the same as Player 1." });
    expect(checkPlayer('https://chess.com/member/hikaru', 0, 'hikaru')).toEqual({ ok: false, error: "Player 1 can't be the same as Player 2." });
    expect(checkPlayer('nakamura', 1, 'hikaru')).toEqual({ ok: true, username: 'nakamura' });
  });
});
