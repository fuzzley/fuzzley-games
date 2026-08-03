/**
 * Which drawing of the 52 cards the table is dealt from.
 *
 * The artwork ships in three cuts of the same drawing. `classic` is the deck as
 * its author drew it; `indexed` adds a suit pip in the blank margin at the top
 * right of every ace and court, because a fanned column covers all but the top
 * 45 of a card's 307 design units and the deck's own corner pip sits below that
 * line — which leaves a covered King red, and nothing more. `all-corner-pips`
 * marks the spot cards the same way, which they do not strictly need — their
 * body pips reach into the strip — but which some players would rather read
 * than count.
 *
 * A deck is a property of the artwork rather than of any game, so it lives here
 * beside the rest of the render tier's vocabulary and is offered to a board
 * through {@link TablePresentation}, the same way a card back and a felt colour
 * are. Free of Phaser, so the Angular settings drawer can name a deck without
 * reaching into the canvas adapter; what a deck means to the loader is in
 * `phaser/card_deck_atlas.ts`.
 */
export type CardDeckId = "classic" | "indexed" | "all-corner-pips";

/**
 * Which cards a deck marks with a pip in the top right corner.
 *
 * The whole of what the decks differ by, so the settings drawer can draw a
 * preview of the difference rather than testing an id. A scale rather than a
 * flag because there are three decks and a flag can only tell two apart: it
 * left `indexed` and `all-corner-pips` claiming the same picture.
 */
export type CardPipCoverage = "none" | "courts" | "all";

/** One deck, as the settings drawer offers it. */
export interface CardDeckSpec {
  /** What the choice is stored and looked up as. */
  readonly id: CardDeckId;
  /** What the player sees it called. */
  readonly name: string;
  /** One line on what choosing it gets them. */
  readonly description: string;
  /** Which cards carry a corner pip. */
  readonly pipCoverage: CardPipCoverage;
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

/**
 * The deck a player gets before they have chosen one.
 *
 * The pips exist because a covered ace or court could not be told from its
 * same-coloured twin, and a new player is exactly who that costs. Anyone who
 * would rather have the artwork untouched can say so.
 */
export const DEFAULT_CARD_DECK: CardDeckId = "indexed";

/**
 * Whether a value names a deck.
 *
 * Guards what comes back out of local storage, which may have been written by
 * an older build that offered a deck this one does not.
 */
export function isCardDeckId(value: unknown): value is CardDeckId {
  return CARD_DECKS.some((deck) => deck.id === value);
}
