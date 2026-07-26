import { CardPile, PileType } from "../card/card_pile";
import {
  PlayingCard,
  rankAbove,
  rankBelow,
  Suit,
  Rank,
} from "../card/playing_card";

/**
 * Encapsulates the standard Klondike rules for whether a card may be placed on
 * a pile.
 *
 * Keeping the rules in one pure, dependency-free place lets {@link SolitaireGame}
 * stay focused on orchestrating moves, makes each rule trivially unit-testable,
 * and makes an alternate ruleset a matter of swapping the policy (the same
 * pattern used by {@link ScoringPolicy}).
 */
export class MoveRules {
  /**
   * Whether `card` (carrying `movingStackSize` cards including itself) may be
   * legally placed on top of `targetPile`.
   *
   * @param card The card being moved (the bottom of the moving stack).
   * @param targetPile The destination pile.
   * @param movingStackSize The number of cards moving together, including `card`.
   * @returns True if the placement is legal under Klondike rules.
   */
  public canPlace(
    card: PlayingCard,
    targetPile: CardPile<PlayingCard>,
    movingStackSize: number,
  ): boolean {
    switch (targetPile.type) {
      case PileType.TABLEAU:
        return this.canPlaceOnTableau(card, targetPile);
      case PileType.FOUNDATION:
        return this.canPlaceOnFoundation(card, targetPile, movingStackSize);
      default:
        // Stock and waste are never valid move destinations.
        return false;
    }
  }

  /** Whether `card` may be placed on the tableau `pile`. */
  private canPlaceOnTableau(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
  ): boolean {
    const topCard = pile.topCard;
    if (!topCard) {
      // Only Kings can be placed on an empty tableau.
      return card.rank === Rank.KING;
    }
    // Must build down in descending rank and alternating color.
    const isAlternatingColor = this.isRed(card) !== this.isRed(topCard);
    const isDescendingRank = card.rank === rankBelow(topCard.rank);
    return isAlternatingColor && isDescendingRank;
  }

  /** Whether `card` may be placed on the foundation `pile`. */
  private canPlaceOnFoundation(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
    movingStackSize: number,
  ): boolean {
    // Only one card at a time may be moved to a foundation.
    if (movingStackSize > 1) {
      return false;
    }
    const topCard = pile.topCard;
    if (!topCard) {
      // A foundation must start with an Ace.
      return card.rank === Rank.ACE;
    }
    // Must build up in ascending rank of the same suit.
    const isSameSuit = card.suit === topCard.suit;
    const isAscendingRank = card.rank === rankAbove(topCard.rank);
    return isSameSuit && isAscendingRank;
  }

  /** Whether the card is a red suit (hearts or diamonds). */
  private isRed(card: PlayingCard): boolean {
    return card.suit === Suit.HEART || card.suit === Suit.DIAMOND;
  }
}
