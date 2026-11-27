import { boardFrom, gameFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { DustLayers } from "../catalog/elements";
import type { Piece } from "../catalog/pieces";
import { wispTarget } from "../blasts/wisp";
import { play } from "../move/play";
import { WISP_SLEEPYHEAD_WORTH } from "../tuning";
import { ELEMENT_RULES, WIND_RULE } from "./element_rules";
import { SLEEPYHEAD_RULE } from "./sleepyhead";

/** A sleepyhead. */
const SLEEPYHEAD: Piece = { what: "sleepyhead", id: 1 };

/** A plain blue fuzzball. */
const BLUE: Piece = {
  what: "fuzzball",
  id: 2,
  kind: "blue",
  special: null,
  caged: false,
  burred: false,
};

/**
 * A board with a sleepyhead over a fuzzball in its first column; one over
 * a square that holds nothing and a gap, then a fuzzball, in its second;
 * one over another, then a brick, in its third; and fuzzballs with no
 * sleepyhead over them in its last.
 */
const HELD_UP = boardFrom(["zzzr", "b zg", "r_1b", "gbga"]);

/** Returns what a wisp makes of a square of `HELD_UP` by the sleepyhead's rule. */
function worthOn(square: number, goalOpen = true): number | null {
  return SLEEPYHEAD_RULE.wisp?.worth(HELD_UP, square, goalOpen) ?? null;
}

/** Returns what the board coming to rest does to a square by the sleepyhead's rule. */
function settledOn(piece: Piece, dust: DustLayers, bed: boolean) {
  return SLEEPYHEAD_RULE.settled?.({ piece, dust }, bed) ?? null;
}

/** Plays a move a fixture recorded on its board by the game's own rules, and returns its record. */
function playedAsRecorded(
  name: "sleepyheadBedded" | "sleepyheadRuffled",
): unknown {
  const { picture, options, record } = MOVE_FIXTURES[name];
  return play(
    gameFrom(picture, options),
    record.swap.from,
    record.swap.to,
    ELEMENT_RULES,
    WIND_RULE,
  ).record;
}

describe("SLEEPYHEAD_RULE", () => {
  it("keeps a sleepyhead from being swapped, and no other piece", () => {
    expect([
      SLEEPYHEAD_RULE.holdsSwap?.({ piece: SLEEPYHEAD, dust: 0 }),
      SLEEPYHEAD_RULE.holdsSwap?.({ piece: BLUE, dust: 0 }),
      SLEEPYHEAD_RULE.holdsSwap?.({ piece: null, dust: 0 }),
    ]).toEqual([true, false, false]);
  });

  it("lets a sleepyhead fall, as a fuzzball does", () => {
    expect(
      SLEEPYHEAD_RULE.holdsFall?.({ piece: SLEEPYHEAD, dust: 0 }) ?? false,
    ).toBe(false);
  });

  it("ruffles a sleepyhead a blast strikes, taking the strike and changing and counting nothing", () => {
    const square = { piece: SLEEPYHEAD, dust: 1 } as const;

    expect(SLEEPYHEAD_RULE.blasted?.(square)).toEqual({
      square,
      hit: "ruffled",
      counts: false,
    });
  });

  it("passes a blast's strike on to any piece but a sleepyhead", () => {
    expect(SLEEPYHEAD_RULE.blasted?.({ piece: BLUE, dust: 0 })).toBeNull();
  });

  it("puts a sleepyhead at rest on a bed to bed, leaving the dust under it, and counts it", () => {
    expect(settledOn(SLEEPYHEAD, 2, true)).toEqual({
      square: { piece: null, dust: 2 },
      hit: "bedded",
      counts: true,
    });
  });

  it("leaves a sleepyhead at rest off a bed, and a fuzzball on one", () => {
    expect([settledOn(SLEEPYHEAD, 0, false), settledOn(BLUE, 0, true)]).toEqual(
      [null, null],
    );
  });

  it("makes whatever holds a sleepyhead up worth striking to a wisp while the goal is open: a fuzzball, one past a square holding nothing and a gap, a sleepyhead and a brick", () => {
    expect([worthOn(4), worthOn(13), worthOn(6), worthOn(10)]).toEqual([
      WISP_SLEEPYHEAD_WORTH,
      WISP_SLEEPYHEAD_WORTH,
      WISP_SLEEPYHEAD_WORTH,
      WISP_SLEEPYHEAD_WORTH,
    ]);
  });

  it("makes nothing else worth anything to a wisp: a sleepyhead with nothing over it, a square holding nothing, or a fuzzball with no sleepyhead over it", () => {
    expect([
      worthOn(0),
      worthOn(5),
      worthOn(3),
      worthOn(7),
      worthOn(8),
    ]).toEqual([null, null, null, null, null]);
  });

  it("makes no square worth anything to a wisp once the goal is met", () => {
    expect(worthOn(4, false)).toBeNull();
  });

  it("makes a dusty square that holds a sleepyhead up worth to a wisp what holding it up is, not what its dust is, the sleepyhead coming before the dust", () => {
    const game = gameFrom(
      { pieces: ["zgr", "bgr"], dust: ["000", "120"] },
      { goals: [{ what: "dust" }, { what: "sleepyhead" }] },
    );

    expect(wispTarget(game, 5, () => false, ELEMENT_RULES)).toBe(3);
  });

  it("asks a goal of every sleepyhead a board is dealt", () => {
    expect([
      SLEEPYHEAD_RULE.goal?.id,
      SLEEPYHEAD_RULE.goal?.countOn(HELD_UP),
    ]).toEqual(["sleepyhead", 4]);
  });

  it("plays the move the sketch played that brings a sleepyhead down to its bed, as the game's own", () => {
    expect(playedAsRecorded("sleepyheadBedded")).toEqual(
      MOVE_FIXTURES.sleepyheadBedded.record,
    );
  });

  it("plays the move the sketch played whose dasher ruffles a sleepyhead, as the game's own", () => {
    expect(playedAsRecorded("sleepyheadRuffled")).toEqual(
      MOVE_FIXTURES.sleepyheadRuffled.record,
    );
  });
});
