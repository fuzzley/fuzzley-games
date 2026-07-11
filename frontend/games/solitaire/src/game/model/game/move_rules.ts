import { CardPile, PileType } from "../card/card_pile";
import { PlayingCard, Suit, Type } from "../card/playing_card";

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
    const topCard = this.topCard(pile);
    if (!topCard) {
      // Only Kings can be placed on an empty tableau.
      return card.type === Type.KING;
    }
    // Must build down in descending rank and alternating color.
    const isAlternatingColor = this.isRed(card) !== this.isRed(topCard);
    const isDescendingRank = Number(card.type) === Number(topCard.type) - 1;
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
    const topCard = this.topCard(pile);
    if (!topCard) {
      // A foundation must start with an Ace.
      return card.type === Type.ACE;
    }
    // Must build up in ascending rank of the same suit.
    const isSameSuit = card.suit === topCard.suit;
    const isAscendingRank = Number(card.type) === Number(topCard.type) + 1;
    return isSameSuit && isAscendingRank;
  }

  /** The top (last) card of a pile, or null when the pile is empty. */
  private topCard(pile: CardPile<PlayingCard>): PlayingCard | null {
    const cards = pile.getCards();
    return cards.length > 0 ? cards[cards.length - 1] : null;
  }

  /** Whether the card is a red suit (hearts or diamonds). */
  private isRed(card: PlayingCard): boolean {
    return card.suit === Suit.HEART || card.suit === Suit.DIAMOND;
  }
}
