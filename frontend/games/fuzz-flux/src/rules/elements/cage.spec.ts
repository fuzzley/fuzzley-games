import { boardFrom, gameFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { wispTarget } from "../blasts/wisp";
import type { Fuzzball } from "../catalog/pieces";
import { play } from "../move/play";
import { WISP_CAGE_WORTH, WISP_RANKS } from "../tuning";
import type { SquareState } from "./element_rule";
import { CAGE_RULE } from "./cage";
import { ELEMENT_RULES, WIND_RULE } from "./element_rules";

/** A plain blue fuzzball, out of any cage. */
const BLUE: Fuzzball = {
  what: "fuzzball",
  id: 1,
  kind: "blue",
  special: null,
  caged: false,
  burred: false,
};

/** A caged blue fuzzball, on a layer of dust. */
const CAGED: SquareState = { piece: { ...BLUE, caged: true }, dust: 1 };

/** Squares that hold no caged fuzzball, each named: a plain one, a brick and nothing. */
const UNCAGED: readonly (readonly [string, SquareState])[] = [
  ["a plain fuzzball", { piece: BLUE, dust: 1 }],
  ["a brick", { piece: { what: "brick", id: 2, layers: 2 }, dust: 0 }],
  ["nothing", { piece: null, dust: 2 }],
];

/** A board with a caged blue and a caged red along its top row, between plain fuzzballs, and a brick below. */
const CAGES = boardFrom({ pieces: ["bBrR", "rb1a"] });

/** Returns what a wisp makes of a square of `CAGES` by the cage's rule. */
function worthOn(square: number, goalOpen: boolean): number | null {
  return CAGE_RULE.wisp?.worth(CAGES, square, goalOpen) ?? null;
}

describe("CAGE_RULE", () => {
  it("keeps a caged fuzzball from being swapped and from falling", () => {
    expect([
      CAGE_RULE.holdsSwap?.(CAGED),
      CAGE_RULE.holdsFall?.(CAGED),
    ]).toEqual([true, true]);
  });

  it.each(UNCAGED)("holds nothing on a square that holds %s", (_, square) => {
    expect([
      CAGE_RULE.holdsSwap?.(square),
      CAGE_RULE.holdsFall?.(square),
    ]).toEqual([false, false]);
  });

  it("lets a caged fuzzball out as a bunch takes it in, which counts, with no hit of its own", () => {
    expect(CAGE_RULE.inBunch?.(CAGED)).toEqual({
      square: { piece: BLUE, dust: 1 },
      hit: null,
      counts: true,
    });
  });

  it("opens the cage a blast strikes and leaves its fuzzball, which counts as the cage opened", () => {
    expect(CAGE_RULE.blasted?.(CAGED)).toEqual({
      square: { piece: BLUE, dust: 1 },
      hit: "uncaged",
      counts: true,
    });
  });

  it.each(UNCAGED)(
    "does nothing as a bunch or a blast reaches a square that holds %s",
    (_, square) => {
      expect([
        CAGE_RULE.inBunch?.(square),
        CAGE_RULE.blasted?.(square),
      ]).toEqual([null, null]);
    },
  );

  it("keeps a caged fuzzball from taking the fur a frizzball gives, and readies any other square as it is", () => {
    expect([
      CAGE_RULE.givenFur?.(CAGED),
      ...UNCAGED.map(([, square]) => CAGE_RULE.givenFur?.(square)),
    ]).toEqual([null, ...UNCAGED.map(([, square]) => square)]);
  });

  it("makes a caged fuzzball worth more to a wisp while a goal asks for cages, and first of the elements", () => {
    expect([CAGE_RULE.wisp?.rank, worthOn(1, true), worthOn(3, false)]).toEqual(
      [WISP_RANKS.cage, WISP_CAGE_WORTH.asked, WISP_CAGE_WORTH.unasked],
    );
  });

  it("has a wisp seek a caged fuzzball before the dustiest square while a goal asks for cages", () => {
    const game = gameFrom(
      { pieces: ["Rg", "gb"], dust: ["02", "00"] },
      { goals: [{ what: "cage" }, { what: "dust" }] },
    );

    expect(wispTarget(game, 2, () => false, ELEMENT_RULES)).toBe(0);
  });

  it("makes no square worth anything to a wisp but one holding a caged fuzzball", () => {
    expect([worthOn(0, true), worthOn(6, true), worthOn(2, false)]).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("asks a goal of every cage a board is dealt", () => {
    expect([CAGE_RULE.goal?.id, CAGE_RULE.goal?.countOn(CAGES)]).toEqual([
      "cage",
      2,
    ]);
  });

  it.each([
    ["a blast opens", MOVE_FIXTURES.cageOpened],
    ["a bunch frees", MOVE_FIXTURES.cageBunched],
  ])(
    "plays the move the sketch played in which %s a cage, as the game's own",
    (_, { picture, options, record }) => {
      const played = play(
        gameFrom(picture, options),
        record.swap.from,
        record.swap.to,
        ELEMENT_RULES,
        WIND_RULE,
      );

      expect(played.record).toEqual(record);
    },
  );
});
