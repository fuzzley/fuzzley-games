import { CardPile } from "../pile/card_pile";
import { Point } from "../../common/point";

/** Determines the layout of a collection of piles. */
export interface PileLayoutManager {
  /** Returns a mapping from CardPile to Point, to indicate where to position each given pile. */
  layoutPiles(piles: CardPile[]): Map<CardPile, Point>;
}
