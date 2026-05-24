import { PlayingCardVisual } from "./playing_card_visual";
import { Visual } from "./visual";

export class StockPileVisual extends Visual<PlayingCardVisual[]> {
  constructor(playingCardVisuals: PlayingCardVisual[]) {
    super(playingCardVisuals);
  }

  layoutPile() {
    for (const cardVisual of this.value) {
        cardVisual.position = {x: 0, y: 0};
    }
  }
}
