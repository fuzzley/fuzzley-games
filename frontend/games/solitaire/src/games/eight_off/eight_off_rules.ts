import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  byEmptiness,
  cardIs,
  cellStagingLimit,
  descendingSameSuit,
  hasRank,
  maxStackSize,
  singleCardCell,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in an Eight Off game. */
export const EightOffRole = {
  /** A single-card holding cell. There are eight, which is the whole name. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in a single suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts an Eight Off pile can play. */
export type EightOffRole = (typeof EightOffRole)[keyof typeof EightOffRole];

/**
 * How many cards may be moved at once: `free cells + 1`, with no doubling for
 * empty columns.
 *
 * Exact rather than a conservative approximation, because an Eight Off column
 * takes only a King — see {@link cellStagingLimit} for why that reduces the
 * arithmetic, and why there is no empty-destination special case to write.
 *
 * Eight cells make this the gentlest of the family: nine cards can move on an
 * untouched board, where Seahaven's four cells allow five.
 */
export const supermoveLimit = cellStagingLimit(EightOffRole.CELL);

/**
 * An Eight Off column: only a King may start an empty one, anything after
 * builds down in the same suit, and no more may move at once than the cells can
 * actually shuffle around.
 *
 * The Kings-only empty column is what makes the game hard — an emptied column
 * is worth nothing until a King is free to take it — and, as
 * {@link supermoveLimit} explains, it is also what flattens the supermove
 * arithmetic.
 */
export const EIGHT_OFF_TABLEAU_RULE: PlacementRule = all(
  byEmptiness(cardIs(hasRank(Rank.KING)), descendingSameSuit),
  maxStackSize(supermoveLimit),
);

/** A free cell: one card, any card. */
export const EIGHT_OFF_CELL_RULE: PlacementRule = singleCardCell;

/** An Eight Off foundation: the standard Ace-up-by-suit pile. */
export const EIGHT_OFF_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination. Like FreeCell, every Eight Off pile is one:
 * there is no stock and no waste.
 */
export function eightOffPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case EightOffRole.TABLEAU:
      return EIGHT_OFF_TABLEAU_RULE;
    case EightOffRole.CELL:
      return EIGHT_OFF_CELL_RULE;
    case EightOffRole.FOUNDATION:
      return EIGHT_OFF_FOUNDATION_RULE;
    default:
      return null;
  }
}
