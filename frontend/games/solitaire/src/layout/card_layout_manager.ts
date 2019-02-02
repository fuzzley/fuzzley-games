import { Card } from '../card/card';
import { Point } from '../common/point';

/** Determines the layout of a collection of cards. */
export interface CardLayoutManager {
  /** Returns a mapping from Card to Point, to indicate where to position each given card. */
  layoutCards(cards: Card[]): Map<Card, Point>;
}
