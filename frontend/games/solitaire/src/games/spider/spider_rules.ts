import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  descendingAnySuit,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Spider game. */
export const SpiderRole = {
  /** The face-down pile that deals a row at a time. */
  STOCK: "stock",
  /** Where a completed King-to-Ace run goes. */
  FOUNDATION: "foundation",
  /** A board column built down by rank, any suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Spider pile can play. */
export type SpiderRole = (typeof SpiderRole)[keyof typeof SpiderRole];

/**
 * A Spider column: any card starts an empty one, and anything after builds down
 * by rank regardless of suit.
 *
 * Suit matters only for lifting a run, which the zone's grab rule checks.
 */
export const SPIDER_TABLEAU_RULE: PlacementRule = byEmptiness(
  anyCard,
  descendingAnySuit,
);
