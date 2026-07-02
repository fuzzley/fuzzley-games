import { CardPile } from "../../../model/card/card_pile";
import { PlayingCard } from "../../../model/card/playing_card";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

/**
 * Visual representation of a Foundation card pile.
 *
 * Manages the positioning of stacked cards in a foundation pile (which are stacked directly on top of each other).
 */
export class FoundationPileVisual extends Visual<CardPile<PlayingCard>> {
  /**
   * Constructs a foundation pile visual.
   *
   * @param cardPile The logical CardPile model instance.
   * @param playingCardVisuals The array of card visuals in this pile.
   */
  constructor(
    cardPile: CardPile<PlayingCard> = new CardPile<PlayingCard>(),
    public readonly playingCardVisuals: PlayingCardVisual[] = [],
  ) {
    super(cardPile);
  }

  /**
   * Positions all card visuals directly on top of the pile base (0, 0).
   */
  layoutPile() {
    for (const cardVisual of this.playingCardVisuals) {
      cardVisual.position = { x: 0, y: 0 };
    }
  }
}
