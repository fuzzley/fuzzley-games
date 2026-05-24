import { CardPile } from "../../card/card_pile";
import { PlayingCardVisual } from "../card/playing_card_visual";
import { Visual } from "../visual";

export class FoundationPileVisual extends Visual<CardPile> {
  constructor(
    cardPile: CardPile = new CardPile(),
    public readonly playingCardVisuals: PlayingCardVisual[] = [],
  ) {
    super(cardPile);
  }

  layoutPile() {
    for (const cardVisual of this.playingCardVisuals) {
      cardVisual.position = { x: 0, y: 0 };
    }
  }
}
