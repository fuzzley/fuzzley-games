// Dust: a layer or two on a square, a layer coming off each time a wave
// reaches the square under its piece, as a bunch takes the fuzzball there
// in or a blast gathers it, or as a blast strikes the square bare. A wisp
// seeks a dusty square out while the dust's goal is open, and the goal
// counts every layer the board is dealt.

import { itemAt } from "@fz/core/records";
import type { DustLayers } from "../catalog/elements";
import { WISP_DUST_WORTH, WISP_RANKS } from "../tuning";
import type { ElementRule } from "./element_rule";

/** The layers a square's dust has left once a layer comes off, by the layers it had. */
const LAYER_OFF = { 1: 0, 2: 1 } as const satisfies Readonly<
  Record<Exclude<DustLayers, 0>, DustLayers>
>;

/** Dust's part in a move. */
export const DUST_RULE: ElementRule = {
  struckUnder: ({ piece, dust }) =>
    dust === 0
      ? null
      : {
          square: { piece, dust: LAYER_OFF[dust] },
          hit: "dusted",
          counts: true,
        },
  wisp: {
    rank: WISP_RANKS.dust,
    // Not a square bare, nor one under a sleepyhead, which a wisp only ruffles.
    worth: ({ pieces, dust }, square, goalOpen) => {
      const layers = itemAt(dust, square);
      const piece = itemAt(pieces, square);
      return goalOpen &&
        layers > 0 &&
        piece !== null &&
        piece.what !== "sleepyhead"
        ? WISP_DUST_WORTH + layers
        : null;
    },
  },
  goal: {
    id: "dust",
    countOn: ({ dust }) =>
      dust.reduce<number>((sum, layers) => sum + layers, 0),
  },
};
