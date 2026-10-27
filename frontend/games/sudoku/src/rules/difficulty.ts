import type { Technique } from "./logic";

/** The levels, easiest first, each allowing the techniques of those before it. */
export const LEVELS = ["easy", "medium", "hard", "expert"] as const;

/** Names a level. */
export type Level = (typeof LEVELS)[number];

/**
 * Each level's name, what it asks of the player, and the fewest givens its
 * puzzles keep, so an easy one is quick to start.
 */
export const LEVEL_INFO = {
  easy: { name: "Easy", asks: "Singles only", fewest: 36 },
  medium: { name: "Medium", asks: "Pairs and pointing", fewest: 30 },
  hard: { name: "Hard", asks: "Triples and X-Wings", fewest: 0 },
  expert: { name: "Expert", asks: "Swordfish and XY-Wings", fewest: 0 },
} as const satisfies Readonly<
  Record<
    Level,
    { readonly name: string; readonly asks: string; readonly fewest: number }
  >
>;

/** The easiest level that allows each technique. */
const TECHNIQUE_LEVELS: Readonly<Record<Technique, Level>> = {
  "hidden-single": "easy",
  "naked-single": "easy",
  pointing: "medium",
  claiming: "medium",
  "naked-pair": "medium",
  "hidden-pair": "medium",
  "naked-triple": "hard",
  "hidden-triple": "hard",
  "x-wing": "hard",
  swordfish: "expert",
  "xy-wing": "expert",
};

/** Returns the easiest level that allows a technique. */
export function levelOf(technique: Technique): Level {
  return TECHNIQUE_LEVELS[technique];
}

/** Returns whether a level allows a technique. */
export function allows(level: Level, technique: Technique): boolean {
  return LEVELS.indexOf(levelOf(technique)) <= LEVELS.indexOf(level);
}

/** Returns whether a value names a level. */
export function isLevel(value: unknown): value is Level {
  return LEVELS.some((level) => level === value);
}
