import { ALL_RANKS, ALL_SUITS, DeckCardId, Rank, Suit } from "./playing_card";

/** Describes which cards a game plays with. */
export interface DeckSpec {
  /** The suits in play. */
  readonly suits: readonly Suit[];
  /** The ranks in play, in the order they should be generated. */
  readonly ranks: readonly Rank[];
  /**
   * How many copies of that suit-and-rank set to deal, such as eight of one
   * suit for one-suit Spider.
   */
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

/** Every card identity in one standard 52-card deck, suit-major. */
export const ALL_PLAYING_CARD_IDS: readonly DeckCardId[] = deckCardIds();
