export type DifficultyId = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type DifficultyLevel = {
  id: DifficultyId;
  name: string;
  description: string;
  /** 1–4, drawn as a meter beside the name. */
  strength: 1 | 2 | 3 | 4;
};

/** The computer's playing strengths, weakest first. The descriptions are what the game engine
 *  is meant to play like at each level; it does not exist yet. */
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [
  { id: 'beginner', name: 'Beginner', strength: 1, description: 'Misses tactics and leaves pieces hanging. Good for learning.' },
  { id: 'intermediate', name: 'Intermediate', strength: 2, description: 'Plays sound moves but misses deeper threats.' },
  { id: 'advanced', name: 'Advanced', strength: 3, description: 'Punishes loose pieces and rarely blunders.' },
  { id: 'expert', name: 'Expert', strength: 4, description: 'Calculates deep lines. Expect a long, hard game.' },
];

/** Selected when the screen opens, and labelled "Default" in the list. */
export const DEFAULT_DIFFICULTY: DifficultyId = 'intermediate';

export function difficultyName(id: DifficultyId): string {
  return DIFFICULTY_LEVELS.find((level) => level.id === id)?.name ?? id;
}
