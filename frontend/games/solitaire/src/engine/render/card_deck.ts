/**
 * Names the drawing of the 52 cards the table is dealt from.
 *
 * A fanned column shows just the top of each card, which hides the artwork's
 * own pip, so `indexed` adds one to aces and courts and `all-corner-pips` adds
 * one to every card. `mobile` is drawn for a phone instead: no artwork, and a
 * rank and suit as large as the strip a fan leaves showing.
 */
export type CardDeckId = "classic" | "indexed" | "all-corner-pips" | "mobile";

/**
 * Says which cards a deck marks with a corner pip, so the settings drawer can
 * preview the difference.
 */
export type CardPipCoverage = "none" | "courts" | "all";

/**
 * Says how large a deck draws the rank in its corner, so the settings drawer
 * can preview the difference.
 */
export type CardIndexSize = "regular" | "large";

/** Describes one deck, as the settings drawer offers it. */
export interface CardDeckSpec {
  /** What the choice is stored and looked up as. */
  readonly id: CardDeckId;
  /** What the player sees it called. */
  readonly name: string;
  /** One line on what choosing it gets them. */
  readonly description: string;
  /** Which cards carry a corner pip. */
  readonly pipCoverage: CardPipCoverage;
  /** How large the rank in the corner is. */
  readonly indexSize: CardIndexSize;
}

/**
 * The decks on offer, in the order they are shown.
 *
 * Ids match the directories `yarn build:atlas` writes under
 * `assets/sprites/atlas/`, and the `DECKS` list in `tools/build-card-atlas.mjs`
 * that produces them.
 */
export const CARD_DECKS: readonly CardDeckSpec[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Card artwork unchanged.",
    pipCoverage: "none",
    indexSize: "regular",
  },
  {
    id: "indexed",
    name: "Corner Pips",
    description: "Marks every ace, king, queen, and jack with suit pips.",
    pipCoverage: "courts",
    indexSize: "regular",
  },
  {
    id: "all-corner-pips",
    name: "All Corner Pips",
    description: "Marks every card with suit pips.",
    pipCoverage: "all",
    indexSize: "regular",
  },
  {
    id: "mobile",
    name: "Large Index",
    description: "Big rank and suit, no artwork. Made for phones.",
    pipCoverage: "all",
    indexSize: "large",
  },
];

/**
 * The deck a player gets before they have chosen one.
 *
 * It has pips because a new player is the one most likely to mistake a covered
 * ace or court for its same-coloured twin.
 */
export const DEFAULT_CARD_DECK: CardDeckId = "indexed";

/**
 * The deck a player gets before they have chosen one, on a screen narrow
 * enough that the board compacts, where an artwork deck's index is too small
 * to read down a fanned column.
 */
export const DEFAULT_COMPACT_CARD_DECK: CardDeckId = "mobile";

/** Returns whether a value names a deck this build offers. */
export function isCardDeckId(value: unknown): value is CardDeckId {
  return CARD_DECKS.some((deck) => deck.id === value);
}
