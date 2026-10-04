import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  cardIs,
  cellStagingLimit,
  hasRank,
  singleCardCell,
  suitFoundation,
  isSameSuitRun,
} from "@/engine/tableau/rules";
import { ColumnRules, runColumn } from "@/engine/tableau/zone";

/** The parts a pile can play in an Eight Off game. */
export const EightOffRole = {
  /** A single-card holding cell, of which there are eight. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in a single suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts an Eight Off pile can play. */
export type EightOffRole = (typeof EightOffRole)[keyof typeof EightOffRole];

/**
 * How many cards may be moved at once: `free cells + 1`, as
 * {@link cellStagingLimit} explains.
 */
export const supermoveLimit = cellStagingLimit(EightOffRole.CELL);

/**
 * An Eight Off column: only a King may start an empty one, anything after
 * builds down in the same suit, and no more may move at once than the cells can
 * actually shuffle around.
 */
export const EIGHT_OFF_COLUMN: ColumnRules = runColumn({
  adjacent: isSameSuitRun,
  whenEmpty: cardIs(hasRank(Rank.KING)),
  maxStack: supermoveLimit,
});

/** A free cell: one card, any card. */
export const EIGHT_OFF_CELL_RULE: PlacementRule = singleCardCell;

/** An Eight Off foundation: the standard Ace-up-by-suit pile. */
export const EIGHT_OFF_FOUNDATION_RULE: PlacementRule = suitFoundation;
