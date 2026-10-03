import { PileRole } from "@/engine/core/card/card_pile";
import { rankBelowWrapping } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  baseRankFoundation,
  baseRankOf,
  byEmptiness,
  descendingSameSuitWrapping,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Penguin game. */
export const PenguinRole = {
  /** A suit pile built up from the beak's rank. */
  FOUNDATION: "foundation",
  /** One of the seven cells of the flipper, each holding one card. */
  CELL: "cell",
  /** A column built down in suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Penguin pile can play. */
export type PenguinRole = (typeof PenguinRole)[keyof typeof PenguinRole];

/** A foundation: the beak's rank starts it, then up in suit with wrap. */
export const PENGUIN_FOUNDATION_RULE: PlacementRule = baseRankFoundation(
  PenguinRole.FOUNDATION,
);

/**
 * A space: takes only a card of the rank below the beak, or a run headed by
 * one, since that is the rank every finished column ends on.
 */
const PENGUIN_SPACE_RULE: PlacementRule = (context) => {
  const base = baseRankOf(context.board, PenguinRole.FOUNDATION);
  return base === undefined || context.card.rank === rankBelowWrapping(base);
};

/** A column: builds down in suit, an Ace taking a King. */
export const PENGUIN_TABLEAU_RULE: PlacementRule = byEmptiness(
  PENGUIN_SPACE_RULE,
  descendingSameSuitWrapping,
);
