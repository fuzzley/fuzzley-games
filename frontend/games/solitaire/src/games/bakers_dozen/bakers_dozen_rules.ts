import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  byEmptiness,
  never,
} from "@/engine/tableau/rules/placement";
import {
  descendingAnySuit,
  suitFoundation,
} from "@/engine/tableau/rules/builds";

/** The parts a pile can play in a Baker's Dozen game. */
export const BakersDozenRole = {
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down by rank, any suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Baker's Dozen pile can play. */
export type BakersDozenRole =
  (typeof BakersDozenRole)[keyof typeof BakersDozenRole];

/**
 * A Baker's Dozen column: builds down by rank in any suit, and an empty one
 * takes nothing at all.
 *
 * `never` for the empty case rather than a null `accept`, which would stop the
 * column being a drop target even while it holds cards.
 */
export const BAKERS_DOZEN_TABLEAU_RULE: PlacementRule = byEmptiness(
  never,
  descendingAnySuit,
);

/** A Baker's Dozen foundation: the standard Ace-up-by-suit pile. */
export const BAKERS_DOZEN_FOUNDATION_RULE: PlacementRule = suitFoundation;
