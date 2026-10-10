import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
} from "@/engine/tableau/rules/placement";
import { descendingAnySuit } from "@/engine/tableau/rules/builds";

/** The parts a pile can play in a Flower Garden game. */
export const FlowerGardenRole = {
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A bed: a column built down regardless of suit. */
  BED: "bed",
  /** One card of the bouquet, every one of which is free to play. */
  BOUQUET: "bouquet",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Flower Garden pile can play. */
export type FlowerGardenRole =
  (typeof FlowerGardenRole)[keyof typeof FlowerGardenRole];

/** A bed: any card fills an empty one, and it builds down in any suit. */
export const BED_RULE: PlacementRule = byEmptiness(anyCard, descendingAnySuit);
