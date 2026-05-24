import { CardPile } from "../../card/card_pile";
import { Point } from "../../common/point";

export class VisualCardPile {
  private position: Point = { x: 0, y: 0 };

  constructor(readonly cardPile: CardPile) {}

  setPosition(position: Point) {
    this.position = position;
  }
}
