/**
 * Names the artwork on the back of the cards: a plain back, first drawn for
 * the mobile deck, or the card artwork's own.
 *
 * Every deck draws every back, so a back can be chosen apart from the deck.
 * Ids match the back frames `yarn build:atlas` writes into every deck, listed
 * in `BACK_FRAME_NAMES` in `tools/card-atlas/raster.mjs`. The plain backs keep
 * the ids each deck once gave its own pair, so a colour a player stored then
 * still loads.
 */
export type CardBackStyle =
  | "card-back-blue"
  | "card-back-red"
  | "card-back-classic-blue"
  | "card-back-classic-red";

/** Describes one card back, as the player sees it named. */
export interface CardBackSpec {
  /** What the back is looked up as. */
  readonly style: CardBackStyle;
  /** What the player sees it called. */
  readonly name: string;
}

/** The card backs on offer, in the order they are shown. */
export const CARD_BACKS: readonly CardBackSpec[] = [
  { style: "card-back-blue", name: "Lattice Blue" },
  { style: "card-back-red", name: "Lattice Red" },
  { style: "card-back-classic-blue", name: "Classic Blue" },
  { style: "card-back-classic-red", name: "Royal Red" },
];

/** The card back a player gets before they have chosen one. */
export const DEFAULT_CARD_BACK: CardBackStyle = "card-back-blue";

/** Returns whether a value names a card back this build offers. */
export function isCardBackStyle(value: unknown): value is CardBackStyle {
  return CARD_BACKS.some((back) => back.style === value);
}
