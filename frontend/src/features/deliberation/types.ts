/** A player found by the player search (GET /api/v1/players/?search=): enough to seat and show them. */
export type FoundPlayer = { username: string; url: string; avatar: string | null; title: string | null };

/** Looks a player up by a username already checked on this device; rejects with a message to show. */
export type FindPlayer = (username: string) => Promise<FoundPlayer>;
