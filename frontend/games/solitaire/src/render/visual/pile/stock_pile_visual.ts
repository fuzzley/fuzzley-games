import { CardPile } from "../../../model/card/card_pile";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

/**
 * Visual representation of a Stock card pile.
 * 
 * Manages the positioning of stacked cards in the face-down stock draw pile (which are stacked directly on top of each other).
 */
export class StockPileVisual extends Visual<CardPile> {
  /**
   * Constructs a stock pile visual.
   *
   * @param cardPile The logical CardPile model instance.
   * @param playingCardVisuals The array of card visuals in this pile.
   */
  constructor(
    cardPile: CardPile = new CardPile(),
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
