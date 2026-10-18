import { GameOptionValues } from "../provider/game_catalog";

/** Rates how hard a game is to win, from easiest to hardest. */
export const Difficulty = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
} as const;

/** Names one step of the {@link Difficulty} scale. */
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

/** What each step of the difficulty scale is called. */
export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  [Difficulty.EASY]: "Easy",
  [Difficulty.MEDIUM]: "Medium",
  [Difficulty.HARD]: "Hard",
};

/** Describes a difficulty that one of a game's rules decides. */
export interface DifficultyByRule {
  /** The rule, by its option id in the catalog. */
  readonly optionId: string;
  /** The difficulty each of the rule's choices plays at. */
  readonly byChoice: Readonly<Record<number, Difficulty>>;
}

/** Rates a game's difficulty, either outright or through one of its rules. */
export type DifficultyRating = Difficulty | DifficultyByRule;

/** Describes a family of games that the browser lists together. */
export interface GameFamilyProfile {
  /** Stable id, which a game's profile names its family by. */
  readonly id: string;
  /** The heading the family is listed under. */
  readonly name: string;
  /** A sentence saying what the family's games have in common. */
  readonly description: string;
}

/**
 * Describes a variant that is known by a name of its own, which the browser
 * lists as a game rather than leaving inside its parent's settings.
 */
export interface NamedVariantProfile {
  /** What the variant is called. */
  readonly name: string;
  /** The rules that make the parent game this variant. */
  readonly values: GameOptionValues;
  /** One line saying how it differs from its parent. */
  readonly tagline: string;
  readonly difficulty: DifficultyRating;
  /** Other names the variant is known by. */
  readonly aliases?: readonly string[];
}

/** Describes a game as the browser presents it. */
export interface GameProfile {
  /** The id of the family the game is listed under. */
  readonly family: string;
  /** One line saying what the game is like. */
  readonly tagline: string;
  readonly difficulty: DifficultyRating;
  /** How many 52-card decks it is dealt from. */
  readonly decks: 1 | 2;
  /** Whether every card is in view from the deal, with no stock to draw. */
  readonly allCardsVisible: boolean;
  /** Other names the game is known by. */
  readonly aliases?: readonly string[];
  /**
   * Variants with names of their own, each played by the same catalog entry
   * with some rules fixed. They share the game's decks and visibility.
   */
  readonly variants?: readonly NamedVariantProfile[];
}

/**
 * Holds the profile of every game, and the families they are listed under, as
 * a consumer receives them.
 *
 * Loose in its keys so a spec can profile only the games it offers.
 */
export interface GameProfileRegistry {
  /** The families, in the order the browser lists them. */
  readonly families: readonly GameFamilyProfile[];
  /** Maps a game id to its profile. */
  readonly games: Readonly<Record<string, GameProfile>>;
}

/** Returns the easiest and hardest a rating can play at. */
export function difficultyRange(
  rating: DifficultyRating,
): readonly [min: Difficulty, max: Difficulty] {
  if (typeof rating === "number") return [rating, rating];
  const levels = Object.values(rating.byChoice);
  return [
    levels.reduce((a, b) => (b < a ? b : a)),
    levels.reduce((a, b) => (b > a ? b : a)),
  ];
}

/**
 * Returns the difficulty a rating plays at under the given rules, or its
 * easiest when the rules leave the deciding one unset.
 */
export function difficultyFor(
  rating: DifficultyRating,
  values: GameOptionValues,
): Difficulty {
  if (typeof rating === "number") return rating;
  const chosen = values[rating.optionId];
  return (
    (chosen === undefined ? undefined : rating.byChoice[chosen]) ??
    difficultyRange(rating)[0]
  );
}
