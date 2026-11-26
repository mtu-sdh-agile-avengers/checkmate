import type { PlayerComparison } from '@/types/chess';

/** A player found by the player search (GET /api/v1/players/?search=): enough to seat and show them. */
export type FoundPlayer = { username: string; url: string; avatar: string | null; title: string | null };

/** Looks a player up by a username already checked on this device; rejects with a message to show. */
export type FindPlayer = (username: string) => Promise<FoundPlayer>;

/**
 * Where the comparison of the two confirmed players stands. The app runs it (with the
 * player comparison feature) and hands its state to Deliberation, which only stages it.
 */
export type ComparisonState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; comparison: PlayerComparison }
  | { status: 'error'; message: string; retry: () => void };
