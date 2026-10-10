import { ReadonlyCardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Lets a rule read the whole board, for rules that depend on more than the pile
 * a card is landing on.
 */
export interface BoardQuery {
  /** Returns the pile with the given id, or undefined. */
  pile(pileId: string): ReadonlyCardPile<PlayingCard> | undefined;

  /** Returns every pile playing a part, in declaration order. */
  pilesByRole(role: PileRole): readonly ReadonlyCardPile<PlayingCard>[];

  /** Returns how many piles playing the given part are empty. */
  emptyCount(role: PileRole): number;
}
