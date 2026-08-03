/**
 * Which drawing of the 52 cards the table is dealt from.
 *
 * The artwork ships in two cuts of the same drawing. `classic` is the deck as
 * its author drew it; `indexed` adds a suit pip in the blank margin at the top
 * right of every ace and court, because a fanned column covers all but the top
 * 45 of a card's 307 design units and the deck's own corner pip sits below that
 * line — which leaves a covered King red, and nothing more.
 *
 * A deck is a property of the artwork rather than of any game, so it lives here
 * beside the rest of the render tier's vocabulary and is offered to a board
 * through {@link TablePresentation}, the same way a card back and a felt colour
 * are. Free of Phaser, so the Angular settings drawer can name a deck without
 * reaching into the canvas adapter; what a deck means to the loader is in
 * `phaser/card_deck_atlas.ts`.
 */
export type CardDeckId = "classic" | "indexed";

/** One deck, as the settings drawer offers it. */
export interface CardDeckSpec {
  /** What the choice is stored and looked up as. */
  readonly id: CardDeckId;
  /** What the player sees it called. */
  readonly name: string;
  /** One line on what choosing it gets them. */
  readonly description: string;
  /**
   * Whether this deck marks an ace or court with a pip in its top right
   * corner. What the difference between the decks actually is, so the settings
   * drawer can draw a preview of it rather than testing an id.
   */
  readonly hasCornerPips: boolean;
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
    description: "The artwork as it was drawn.",
    hasCornerPips: false,
  },
  {
    id: "indexed",
    name: "Corner Pips",
    description: "Adds a suit pip that stays visible when a card is covered.",
    hasCornerPips: true,
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
