import { CardPile } from "../../card/card_pile";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

export class TableauPileVisual extends Visual<CardPile> {
  constructor(
    cardPile: CardPile = new CardPile(),
    public readonly playingCardVisuals: PlayingCardVisual[] = [],
  ) {
    super(cardPile);
  }

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
