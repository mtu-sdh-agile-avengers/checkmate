/**
 * What the game page shows from a game's PGN: its tag pairs (players, opening, how the game
 * ended) and its moves in SAN. Display only: the moves are not checked against the rules, and
 * comments, variations and annotations are left out (Chess.com puts a clock time in a comment
 * after every move, e.g. `1. e4 {[%clk 0:00:59.6]} 1... c6`).
 */
export type PgnGame = {
  tags: Record<string, string>;
  moves: string[]; // every half-move in SAN, in order
  firstMove: { number: number; black: boolean }; // a game set up with Black to move starts "1..."
};

/** One numbered move: White's half-move and Black's reply (null where there is none). */
export type FullMove = { number: number; white: string | null; black: string | null };

const TAG = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/;
const RESULT = /^(?:1-0|0-1|1\/2-1\/2|\*)$/;
const MOVE_NUMBER = /^(\d+)(\.+)$/;

export function readPgn(pgn: string): PgnGame {
  const tags: Record<string, string> = {};
  const movetext: string[] = [];
  for (const line of pgn.split(/\r?\n/)) {
    const tag = TAG.exec(line);
    if (tag) {
      const [, name = '', value = ''] = tag;
      tags[name] = value.replace(/\\(["\\])/g, '$1');
    } else {
      movetext.push(line.replace(/;.*$/, '')); // a ";" comment runs to the end of its line
    }
  }

  let text = movetext.join(' ').replace(/\{[^}]*\}/g, ' ');
  // Variations can nest: take out the innermost ones until none are left.
  for (let before = ''; before !== text; ) {
    before = text;
    text = text.replace(/\([^()]*\)/g, ' ');
  }
  // NAGs ($1) go; move numbers are split from their moves ("1.e4" -> "1. e4").
  text = text.replace(/\$\d+/g, ' ').replace(/(\d+)(\.+)/g, ' $1$2 ');

  const moves: string[] = [];
  let firstMove = { number: 1, black: false };
  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    const number = MOVE_NUMBER.exec(token);
    if (number) {
      if (moves.length === 0) firstMove = { number: Number(number[1]), black: (number[2] ?? '').length > 1 };
      continue;
    }
    if (RESULT.test(token)) break;
    moves.push(token.replace(/[!?]+$/, ''));
  }
  return { tags, moves, firstMove };
}

/** The moves as numbered pairs, the way a score sheet lists them. */
export function toFullMoves({ moves, firstMove }: PgnGame): FullMove[] {
  const rows: FullMove[] = [];
  let index = 0;
  let number = firstMove.number;
  if (firstMove.black && moves.length > 0) {
    rows.push({ number, white: null, black: moves[0] ?? null });
    index = 1;
    number += 1;
  }
  for (; index < moves.length; index += 2, number += 1) {
    rows.push({ number, white: moves[index] ?? null, black: moves[index + 1] ?? null });
  }
  return rows;
}

/**
 * The opening, from Chess.com's ECO and ECOUrl tags, e.g. "B16 · Caro Kann Defense Bronstein
 * Larsen Variation" (the name is read from the link, which has no punctuation). Null when the
 * PGN names no opening.
 */
export function readOpening(tags: Record<string, string>): string | null {
  const eco = tags.ECO && tags.ECO !== '?' ? tags.ECO : null;
  const slug = tags.ECOUrl?.split('/openings/')[1];
  let name: string | null = null;
  if (slug) {
    try {
      name = decodeURIComponent(slug).replace(/-/g, ' ').replace(/\s+/g, ' ').trim() || null;
    } catch {
      name = null;
    }
  }
  if (!eco && !name) return null;
  return [eco, name].filter(Boolean).join(' · ');
}
