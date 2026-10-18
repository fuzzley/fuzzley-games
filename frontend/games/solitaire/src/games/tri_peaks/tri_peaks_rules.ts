import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  all,
  anyCard,
  byEmptiness,
  singleCardOnly,
} from "@/engine/tableau/rules/placement";
import { buildsOn } from "@/engine/tableau/rules/builds";
import { isAdjacentRank } from "@/engine/tableau/rules/adjacency";

/** The parts a pile can play in a TriPeaks game. */
export const TriPeaksRole = {
  /** The face-down cards turned onto the waste when play is stuck. */
  STOCK: "stock",
  /** The single pile every card is played onto. */
  WASTE: "waste",
  /** One place in the three peaks. */
  PEAK: "peak",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a TriPeaks pile can play. */
export type TriPeaksRole = (typeof TriPeaksRole)[keyof typeof TriPeaksRole];

/**
 * The waste: one card, a rank above or below its top card in any suit, with
 * King and Ace adjacent as PySol and most versions have them.
 *
 * Empty only in a short deck that ran out before reaching it, when any card
 * may start it.
 */
export const TRI_PEAKS_WASTE_RULE: PlacementRule = all(
  singleCardOnly,
  byEmptiness(anyCard, buildsOn(isAdjacentRank(true))),
);
