import { CardPile } from "../../../model/card/card_pile";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

/**
 * Visual representation of a Tableau card pile.
 *
 * Manages the layout spacing of cards fanned downwards in a tableau column.
 */
export class TableauPileVisual extends Visual<CardPile> {
  /**
   * Constructs a tableau pile visual.
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
   * Fans cards vertically downwards, using 15px increments for face-down cards and 35px for face-up cards.
   */
  layoutPile() {
    let currentY = 0;
    for (const cardVisual of this.playingCardVisuals) {
      cardVisual.position = { x: 0, y: currentY };
      // Fan face-down cards by 15px, and face-up cards by 35px
      const offset = cardVisual.playingCard.faceUp ? 35 : 15;
      currentY += offset;
    }
  }
}
