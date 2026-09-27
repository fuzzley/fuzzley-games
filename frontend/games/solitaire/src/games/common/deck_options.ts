import { DeckCardId } from "@/engine/core/card/playing_card";

/**
 * Chooses the cards a game deals and how it shuffles them, which a test sets
 * for a short deck or a fixed shuffle.
 */
export interface DeckOptions {
  /**
   * The cards to deal, the game's own deck by default. A partial set is a
   * short deck, which every game is expected to survive.
   */
  readonly cardIds?: readonly DeckCardId[];
  /** Returns a number in [0, 1) for shuffling; `Math.random` by default. */
  readonly random?: () => number;
}
