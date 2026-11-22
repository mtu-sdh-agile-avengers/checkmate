import { parseChessUsername } from '@/utils/username';

export type SlotIndex = 0 | 1;

export type PlayerCheck = { ok: true; username: string } | { ok: false; error: string };

/**
 * Checks what was typed into a Deliberation player slot, on this device only (no lookup):
 * - empty → asks for a username;
 * - a username or a chess.com/member/<name> link, by the same rules as the search
 *   (3–25 letters, numbers, _ or -), compared in lower case;
 * - the same player as the other slot (`other`, already normalised) → refused.
 */
export function checkPlayer(input: string, slot: SlotIndex, other: string | null): PlayerCheck {
  let username: string;
  try {
    username = parseChessUsername(input);
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'Check the username.' };
  }
  if (other !== null && other === username) {
    return { ok: false, error: `Player ${slot + 1} can't be the same as Player ${slot === 0 ? 2 : 1}.` };
  }
  return { ok: true, username };
}
