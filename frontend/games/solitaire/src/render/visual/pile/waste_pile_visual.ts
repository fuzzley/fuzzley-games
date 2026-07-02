import { CardPile } from "../../../model/card/card_pile";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

/**
 * Visual representation of a Waste card pile.
 *
 * Manages the positioning of drawn cards in the face-up waste pile (which are stacked directly on top of each other).
 */
export class WastePileVisual extends Visual<CardPile> {
  /**
   * Constructs a waste pile visual.
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
