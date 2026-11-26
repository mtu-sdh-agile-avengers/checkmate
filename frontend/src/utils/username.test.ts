import { describe, expect, it } from 'vitest';
import { parseChessUsername } from './username';

describe('parseChessUsername', () => {
  it('accepts a username or a member link', () => {
    expect(parseChessUsername('  Hikaru ')).toBe('hikaru');
    expect(parseChessUsername('https://www.chess.com/member/MagnusCarlsen')).toBe('magnuscarlsen');
  });

  it.each([
    ['', 'Enter a Chess.com username'],
    ['https://[broken', 'The profile URL is invalid.'],
    ['https://lichess.org/@/hikaru', 'Please use a Chess.com member URL.'],
    ['https://www.chess.com/games/hikaru/archive', 'Use a URL like chess.com/member/username.'],
    ['ab', 'Usernames must be 3–25 characters'],
  ])('rejects %j', (input, message) => {
    expect(() => parseChessUsername(input)).toThrow(message);
  });
});
