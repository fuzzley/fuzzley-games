import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  all,
  anyCard,
  buildsOn,
  byEmptiness,
  isAdjacentRank,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in Black Hole or All in a Row. */
export const BlackHoleRole = {
  /** The single pile every card is played onto. */
  FOUNDATION: "foundation",
  /** A fan or column whose top card may be played. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Black Hole pile can play. */
export type BlackHoleRole = (typeof BlackHoleRole)[keyof typeof BlackHoleRole];

/**
 * Which of the pair is being played.
 *
 * Numbered for symmetry with the other games' variants, though each is an
 * entry of its own: their grids differ.
 */
export const BlackHoleVariant = {
  /** Black Hole: seventeen fans of three around a hole holding the Ace. */
  BLACK_HOLE: 0,
  /** All in a Row: thirteen columns of four, and the foundation starts empty. */
  ALL_IN_A_ROW: 1,
} as const;

/** Names one of the pair. */
export type BlackHoleVariant =
  (typeof BlackHoleVariant)[keyof typeof BlackHoleVariant];

/**
 * The foundation: any card starts it, then a card one rank above or below
 * the top card in any suit, with Ace and King adjacent.
 *
 * Black Hole's is never empty, since the deal starts it with the Ace of
 * Spades; All in a Row's starts empty.
 */
export const BLACK_HOLE_FOUNDATION_RULE: PlacementRule = all(
  singleCardOnly,
  byEmptiness(anyCard, buildsOn(isAdjacentRank(true))),
);
