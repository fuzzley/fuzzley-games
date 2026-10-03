/** Names the piles on every board with stable ids. */

/** Returns the stable id of the foundation pile at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** Returns the stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Returns the stable id of the holding cell at the given index. */
export function cellPileId(index: number): string {
  return `cell-${index}`;
}

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the single waste pile. */
export const WASTE_PILE_ID = "waste";

/** The stable id of the single pile beaten or paired cards are put away on. */
export const DISCARD_PILE_ID = "discard";

/** The stable id of the single pile that holds a card drawn but not yet placed. */
export const HAND_PILE_ID = "hand";
