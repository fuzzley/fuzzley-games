/**
 * Names a deck drawn from the card artwork, for a screen large enough to show
 * it.
 *
 * A fanned column shows just the top of each card, which hides the artwork's
 * own pip, so `indexed` adds one to aces and courts and `all-corner-pips` adds
 * one to every card.
 */
export type DesktopCardDeckId = "classic" | "indexed" | "all-corner-pips";

/**
 * Names the drawing of the 52 cards the table is dealt from: a desktop deck,
 * or `mobile`, drawn for a phone with no artwork and a rank and suit as large
 * as the strip a fan leaves showing.
 */
export type CardDeckId = DesktopCardDeckId | "mobile";

/**
 * Says which cards a deck marks with a corner pip, so the settings drawer can
 * preview the difference.
 */
export type CardPipCoverage = "none" | "courts" | "all";

/** Describes one deck, as the player sees it named. */
export interface CardDeckSpec {
  /** What the deck is looked up as. */
  readonly id: CardDeckId;
  /** What the player sees it called. */
  readonly name: string;
}

/** Describes one desktop deck, as the settings drawer offers it. */
export interface DesktopCardDeckSpec extends CardDeckSpec {
  readonly id: DesktopCardDeckId;
  /** One line on what choosing it gets them. */
  readonly description: string;
  /** Which cards carry a corner pip. */
  readonly pipCoverage: CardPipCoverage;
}

/** The desktop decks on offer, in the order they are shown. */
export const DESKTOP_CARD_DECKS: readonly DesktopCardDeckSpec[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Card artwork unchanged.",
    pipCoverage: "none",
  },
  {
    id: "indexed",
    name: "Corner Pips",
    description: "Marks every ace, king, queen, and jack with suit pips.",
    pipCoverage: "courts",
  },
  {
    id: "all-corner-pips",
    name: "All Corner Pips",
    description: "Marks every card with suit pips.",
    pipCoverage: "all",
  },
];

/** The deck drawn for a phone. */
export const MOBILE_CARD_DECK: CardDeckSpec = { id: "mobile", name: "Mobile" };

/**
 * Every deck the board can draw.
 *
 * Ids match the directories `yarn build:atlas` writes under
 * `assets/sprites/atlas/`, and the `DECKS` list in `tools/build-card-atlas.mjs`
 * that produces them.
 */
export const CARD_DECKS: readonly CardDeckSpec[] = [
  ...DESKTOP_CARD_DECKS,
  MOBILE_CARD_DECK,
];

/**
 * The desktop deck a player gets before they have chosen one.
 *
 * It has pips because a new player is the one most likely to mistake a covered
 * ace or court for its same-coloured twin.
 */
export const DEFAULT_DESKTOP_CARD_DECK: DesktopCardDeckId = "indexed";

/** Returns whether a value names a desktop deck this build offers. */
export function isDesktopCardDeckId(
  value: unknown,
): value is DesktopCardDeckId {
  return DESKTOP_CARD_DECKS.some((deck) => deck.id === value);
}
