/** Accept a Chess.com username or https://chess.com/member/<username> URL. */
export function parseChessUsername(input: string): string {
  const value = input.trim();
  if (!value) throw new Error('Enter a Chess.com username or member profile URL.');

  let username = value;
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('The profile URL is invalid.');
    }
    if (!['chess.com', 'www.chess.com'].includes(url.hostname.toLowerCase())) {
      throw new Error('Please use a Chess.com member URL.');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'member') {
      throw new Error('Use a URL like chess.com/member/username.');
    }
    username = parts[1] ?? '';
  }
  if (!/^[a-zA-Z0-9_-]{3,25}$/.test(username)) {
    throw new Error('Usernames must be 3–25 characters: letters, numbers, _ or -.');
  }
  return username.toLowerCase();
}
