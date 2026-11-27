import { boardFrom, gameFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { DustLayers } from "../catalog/elements";
import type { Piece } from "../catalog/pieces";
import { play } from "../move/play";
import { WISP_DUST_WORTH } from "../tuning";
import { DUST_RULE } from "./dust";
import { ELEMENT_RULES, WIND_RULE } from "./element_rules";

/** A plain blue fuzzball. */
const BLUE: Piece = {
  what: "fuzzball",
  id: 1,
  kind: "blue",
  special: null,
  caged: false,
  burred: false,
};

/**
 * A board with dust under a fuzzball, 2 layers, a sleepyhead and nothing,
 * a layer each, along its top row, and a layer under the last of its
 * bottom row.
 */
const DUSTY = boardFrom({ pieces: ["bz ", "rbr"], dust: ["211", "001"] });

/** Returns what a wisp makes of a square of `DUSTY` by dust's rule. */
function worthOn(square: number, goalOpen = true): number | null {
  return DUST_RULE.wisp?.worth(DUSTY, square, goalOpen) ?? null;
}

describe("DUST_RULE", () => {
  it.each([
    [2, 1],
    [1, 0],
  ] as const)(
    "takes a layer off %s, leaving %s, where a wave reaches the square, and counts it",
    (dust: DustLayers, left: DustLayers) => {
      expect(DUST_RULE.struckUnder?.({ piece: BLUE, dust })).toEqual({
        square: { piece: BLUE, dust: left },
        hit: "dusted",
        counts: true,
      });
    },
  );

  it("does nothing where a wave reaches a square with no dust", () => {
    expect(DUST_RULE.struckUnder?.({ piece: null, dust: 0 })).toBeNull();
  });

  it("makes a dusty square under a fuzzball worth more to a wisp the more layers it has, while the goal is open", () => {
    expect([worthOn(0), worthOn(5), worthOn(4)]).toEqual([
      WISP_DUST_WORTH + 2,
      WISP_DUST_WORTH + 1,
      null,
    ]);
  });

  it("makes no square worth anything to a wisp once the goal is met", () => {
    expect(worthOn(0, false)).toBeNull();
  });

  it("makes no dusty square worth anything to a wisp under a sleepyhead, or bare", () => {
    expect([worthOn(1), worthOn(2)]).toEqual([null, null]);
  });

  it("asks a goal of every layer a board is dealt", () => {
    expect([DUST_RULE.goal?.id, DUST_RULE.goal?.countOn(DUSTY)]).toEqual([
      "dust",
      5,
    ]);
  });

  it("plays the move the sketch played that sweeps dust, as the game's own", () => {
    const { picture, options, record } = MOVE_FIXTURES.dustSwept;

    const played = play(
      gameFrom(picture, options),
      record.swap.from,
      record.swap.to,
      ELEMENT_RULES,
      WIND_RULE,
    );

    expect(played.record).toEqual(record);
  });
});
