/** Squares the piece on `from` can move to, from the player's legal moves in UCI. */
export function targetsFrom(legalMoves: readonly string[], from: string): string[] {
  const targets = legalMoves
    .filter((move) => move.startsWith(from))
    .map((move) => move.slice(2, 4));
  return [...new Set(targets)];
}

/**
 * The legal move from `from` to `to` in UCI, or null if there is none. A pawn reaching the
 * last rank becomes a queen (the usual choice).
 */
export function moveBetween(
  legalMoves: readonly string[],
  from: string,
  to: string,
): string | null {
  const matching = legalMoves.filter((move) => move.slice(0, 4) === `${from}${to}`);
  return matching.find((move) => move.length === 4 || move.endsWith('q')) ?? matching[0] ?? null;
}
