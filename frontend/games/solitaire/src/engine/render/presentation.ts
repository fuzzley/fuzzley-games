/**
 * Subscribes to a value the board follows, returning a function that stops
 * following it.
 *
 * A plain callback rather than an observable because the render tier may not
 * name a reactive library: whatever publishes the value adapts to this.
 */
export type Subscribe<T> = (listener: (value: T) => void) => () => void;

/**
 * The player's choices about how the table looks.
 *
 * Deliberately not part of any game. Which card back and which felt colour a
 * player prefers is the same preference whether they are playing Klondike,
 * FreeCell or Spider, so it is supplied to a board rather than owned by one.
 */
export interface TablePresentation {
  /** The artwork key for the back of a card. */
  cardBackKey(): string;

  /** Follows the table colour. */
  readonly onBackgroundColor: Subscribe<string>;
}

/** The board colour used before a player has chosen one. */
export const DEFAULT_BACKGROUND_COLOR = "#0f4d0e";
