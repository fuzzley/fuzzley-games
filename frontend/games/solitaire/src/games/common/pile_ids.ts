/**
 * The stable pile ids every board names its piles with.
 *
 * Both the game model and the render layout derive pile ids through these, so
 * the two can never drift apart. Written once rather than per game: thirteen
 * games declared byte-identical copies of `foundationPileId` and
 * `tableauPileId`, which is thirteen chances for one board to start calling its
 * columns something else.
 */

/** The stable id of the foundation pile at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** The stable id of the holding cell at the given index. */
export function cellPileId(index: number): string {
  return `cell-${index}`;
}

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the single waste pile. */
export const WASTE_PILE_ID = "waste";
