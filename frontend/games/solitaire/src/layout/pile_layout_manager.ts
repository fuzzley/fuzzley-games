import { Pile } from '../card/pile';
import { Point } from '../common/point';

/** Determines the layout of a collection of piles. */
export interface CardLayoutManager {
  /** Returns a mapping from Pile to Point, to indicate where to position each given pile. */
  layoutPiles(piles: Pile[]): Map<Pile, Point>;
}
