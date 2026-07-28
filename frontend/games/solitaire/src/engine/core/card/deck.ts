import { ALL_RANKS, ALL_SUITS, DeckCardId, Rank, Suit } from "./playing_card";

/**
 * Describes which cards a game plays with.
 *
 * Games differ in all three axes and not only in the obvious one: Klondike
 * takes one standard deck, two-deck Spider takes two, and one-suit Spider takes
 * eight copies of a single suit. Saying so as data means a game declares its
 * deck rather than writing a loop to build one.
 */
export interface DeckSpec {
  /** The suits in play. */
  readonly suits: readonly Suit[];
  /** The ranks in play, in the order they should be generated. */
  readonly ranks: readonly Rank[];
  /** How many copies of that suit-and-rank set to deal. */
  readonly copies: number;
}

/** One standard 52-card deck: every suit, every rank, once. */
export const STANDARD_52_CARD_DECK: DeckSpec = {
  suits: ALL_SUITS,
  ranks: ALL_RANKS,
  copies: 1,
};

/**
 * Expands a deck specification into its card identities, deck-major then
 * suit-major.
 *
 * Derived rather than listed, so the cards in play can never drift out of sync
 * with the specification that describes them.
 *
 * @param spec The deck to expand. Defaults to one standard 52-card deck.
 * @returns Every card identity in the deck, in a stable order.
 */
export function deckCardIds(
  spec: DeckSpec = STANDARD_52_CARD_DECK,
): readonly DeckCardId[] {
  const ids: DeckCardId[] = [];
  for (let deckIndex = 0; deckIndex < spec.copies; deckIndex++) {
    for (const suit of spec.suits) {
      for (const rank of spec.ranks) {
        ids.push({ suit, rank, deckIndex });
      }
    }
  }
  return ids;
}

/**
 * A complete list of all 52 standard playing card identities, suit-major.
 *
 * The default deck for a game that does not say otherwise.
 */
export const ALL_PLAYING_CARD_IDS: readonly DeckCardId[] = deckCardIds();
