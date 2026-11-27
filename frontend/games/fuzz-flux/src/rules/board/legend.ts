// The letters a level's pictures are drawn in: its board's, a letter a
// square, and its dust's, a digit a square. A level's specials are listed
// apart from its picture, each at its square.

import type { BrickLayers, DustLayers } from "../catalog/elements";
import type { KindId } from "../catalog/kinds";

/** Describes what a letter of a level's board puts on its square. */
export type Placed =
  /** No square at all. */
  | { readonly what: "gap" }
  | {
      readonly what: "fuzzball";
      /** Its kind, or null for one of any kind, which the deal chooses. */
      readonly kind: KindId | null;
      readonly caged: boolean;
      readonly burred: boolean;
    }
  | { readonly what: "brick"; readonly layers: BrickLayers }
  | { readonly what: "sleepyhead" };

/**
 * Every letter of a level's board, each with what it puts on its square: a
 * kind's letter for a fuzzball of that kind, its capital for one caged;
 * `.`, `?` and `*` for a fuzzball of any kind, plain, caged and burred; a
 * digit for a brick of that many layers; `z` for a sleepyhead; and `_` for a
 * gap.
 */
export const LEGEND = {
  ".": { what: "fuzzball", kind: null, caged: false, burred: false },
  "?": { what: "fuzzball", kind: null, caged: true, burred: false },
  "*": { what: "fuzzball", kind: null, caged: false, burred: true },
  b: { what: "fuzzball", kind: "blue", caged: false, burred: false },
  r: { what: "fuzzball", kind: "red", caged: false, burred: false },
  a: { what: "fuzzball", kind: "amber", caged: false, burred: false },
  g: { what: "fuzzball", kind: "green", caged: false, burred: false },
  v: { what: "fuzzball", kind: "violet", caged: false, burred: false },
  p: { what: "fuzzball", kind: "pink", caged: false, burred: false },
  B: { what: "fuzzball", kind: "blue", caged: true, burred: false },
  R: { what: "fuzzball", kind: "red", caged: true, burred: false },
  A: { what: "fuzzball", kind: "amber", caged: true, burred: false },
  G: { what: "fuzzball", kind: "green", caged: true, burred: false },
  V: { what: "fuzzball", kind: "violet", caged: true, burred: false },
  P: { what: "fuzzball", kind: "pink", caged: true, burred: false },
  "1": { what: "brick", layers: 1 },
  "2": { what: "brick", layers: 2 },
  "3": { what: "brick", layers: 3 },
  "4": { what: "brick", layers: 4 },
  z: { what: "sleepyhead" },
  _: { what: "gap" },
} as const satisfies Readonly<Record<string, Placed>>;

/** A letter of a level's board, such as "B". */
export type LegendLetter = keyof typeof LEGEND;

/** Every digit of a level's dust, each with the layers it lays on its square. */
export const DUST_LEGEND = {
  "0": 0,
  "1": 1,
  "2": 2,
} as const satisfies Readonly<Record<string, DustLayers>>;
