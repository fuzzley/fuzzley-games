/** Says how big a field is and how many mines it hides. */
export interface FieldSize {
  readonly rows: number;
  readonly cols: number;
  readonly mines: number;
}

/** The classic fields, by their id. */
export const PRESETS = {
  easy: { name: "Easy", size: { rows: 9, cols: 9, mines: 10 } },
  medium: { name: "Medium", size: { rows: 16, cols: 16, mines: 40 } },
  hard: { name: "Hard", size: { rows: 16, cols: 30, mines: 99 } },
} as const satisfies Readonly<
  Record<string, { readonly name: string; readonly size: FieldSize }>
>;

/** A classic field's id, such as "medium". */
export type PresetId = keyof typeof PRESETS;

/** A difficulty: one of the classic fields, or the player's own. */
export type DifficultyId = PresetId | "custom";

/** The difficulties in the order the settings offer them. */
export const DIFFICULTY_IDS: readonly DifficultyId[] = [
  "easy",
  "medium",
  "hard",
  "custom",
];

/** The fewest and most rows or columns a custom field can have. */
export const CUSTOM_SIDE = { min: 5, max: 30 } as const;

/** The custom field a player starts from: the 2016 game's. */
export const DEFAULT_CUSTOM: FieldSize = { rows: 20, cols: 20, mines: 100 };

/** The fewest and most lives a game can have. */
export const LIVES = { min: 1, max: 5, default: 3 } as const;

/**
 * Returns the most mines a field of this many rows and columns can hide: all
 * but nine squares, so the first square and its neighbors are always clear.
 */
export function maxMines(rows: number, cols: number): number {
  return rows * cols - 9;
}

/** Returns whether a custom field is one the game can deal. */
export function isValidSize(size: FieldSize): boolean {
  const side = (n: number) =>
    Number.isInteger(n) && n >= CUSTOM_SIDE.min && n <= CUSTOM_SIDE.max;
  return (
    side(size.rows) &&
    side(size.cols) &&
    Number.isInteger(size.mines) &&
    size.mines >= 1 &&
    size.mines <= maxMines(size.rows, size.cols)
  );
}

/** Returns whether a number of lives is one a game can have. */
export function isValidLives(lives: number): boolean {
  return Number.isInteger(lives) && lives >= LIVES.min && lives <= LIVES.max;
}

/** Returns whether a value names a difficulty. */
export function isDifficultyId(value: unknown): value is DifficultyId {
  return DIFFICULTY_IDS.some((id) => id === value);
}

/** Returns the field a difficulty deals, given the player's custom one. */
export function sizeOf(difficulty: DifficultyId, custom: FieldSize): FieldSize {
  return difficulty === "custom" ? custom : PRESETS[difficulty].size;
}

/** Returns a difficulty's name, such as "Medium". */
export function difficultyName(difficulty: DifficultyId): string {
  return difficulty === "custom" ? "Custom" : PRESETS[difficulty].name;
}
