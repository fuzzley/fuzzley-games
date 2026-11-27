import {
  type BoardPicture,
  boardFrom,
  gameFrom,
} from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { Game } from "../board/board";
import type { Fuzzball } from "../catalog/pieces";
import { play } from "../move/play";
import { WISP_BURR_WORTH, WISP_RANKS } from "../tuning";
import { BURR_RULE } from "./burr";
import type { Spread } from "./element_rule";
import { ELEMENT_RULES, WIND_RULE } from "./element_rules";

/** A plain blue fuzzball. */
const BLUE: Fuzzball = {
  what: "fuzzball",
  id: 1,
  kind: "blue",
  special: null,
  caged: false,
  burred: false,
};

/** The blue fuzzball wearing a burr. */
const BURRED: Fuzzball = { ...BLUE, burred: true };

/**
 * A board whose two burrs, in the middle and below it, can spread nowhere:
 * beside them a frizzball, a caged fuzzball, a puffer, a brick and a gap.
 */
const HEMMED_IN: BoardPicture = {
  pieces: ["afa", "Rbg", "1b_"],
  marks: ["...", ".*o", ".*."],
};

/** `HEMMED_IN` with a plain fuzzball in its gap, beside the lower burr. */
const ONE_WAY: BoardPicture = {
  pieces: ["afa", "Rbg", "1bv"],
  marks: ["...", ".*o", ".*."],
};

/** A row whose burr in the middle can spread right or left. */
const TWO_WAYS: BoardPicture = { pieces: ["rbg"], marks: [".*."] };

/** Returns where a burr spreads as a move on a game ends, so many of the burr's changes in it counted. */
function spreadOn(game: Game, counted = 0): Spread | null {
  return BURR_RULE.moveEnded?.({ game, counted }) ?? null;
}

/** Returns where a burr on a board spreads as a move ends, on a deal's seed and with so many moves played. */
function spreadWith(
  picture: BoardPicture,
  seed: number,
  movesPlayed = 1,
): Spread | null {
  return spreadOn({ ...gameFrom(picture, { seed }), movesPlayed });
}

/** Returns what a wisp makes of a square of `HEMMED_IN`. */
function worthOn(square: number, goalOpen: boolean): number | null {
  return BURR_RULE.wisp?.worth(boardFrom(HEMMED_IN), square, goalOpen) ?? null;
}

describe("BURR_RULE", () => {
  it("keeps a burred fuzzball from being swapped, and no other piece", () => {
    expect(
      [BURRED, BLUE, null].map((piece) =>
        BURR_RULE.holdsSwap?.({ piece, dust: 0 }),
      ),
    ).toEqual([true, false, false]);
  });

  it("brushes the burr off a fuzzball a bunch takes in, with no hit of its own, and counts it", () => {
    expect(BURR_RULE.inBunch?.({ piece: BURRED, dust: 1 })).toEqual({
      square: { piece: BLUE, dust: 1 },
      hit: null,
      counts: true,
    });
  });

  it.each([
    ["a bunch beside it", BURR_RULE.besideBunch],
    ["a blast", BURR_RULE.blasted],
  ])("brushes the burr off a fuzzball %s strikes, and counts it", (_, hook) => {
    expect(hook?.({ piece: BURRED, dust: 2 })).toEqual({
      square: { piece: BLUE, dust: 2 },
      hit: "unburred",
      counts: true,
    });
  });

  it.each([
    ["a bunch takes in", BURR_RULE.inBunch],
    ["a bunch is beside", BURR_RULE.besideBunch],
    ["a blast strikes", BURR_RULE.blasted],
  ])("does nothing to a fuzzball with no burr %s", (_, hook) => {
    expect(hook?.({ piece: BLUE, dust: 0 })).toBeNull();
  });

  it("lets a burr fall off a fuzzball a frizzball gives its fur, and leaves a fuzzball with none as it is", () => {
    expect([
      BURR_RULE.givenFur?.({ piece: BURRED, dust: 1 }),
      BURR_RULE.givenFur?.({ piece: BLUE, dust: 1 }),
    ]).toEqual([
      { piece: BLUE, dust: 1 },
      { piece: BLUE, dust: 1 },
    ]);
  });

  it("spreads no burr after a move that brushed one off", () => {
    expect(spreadOn(gameFrom(ONE_WAY), 1)).toBeNull();
  });

  it("spreads no burr where none has a plain fuzzball beside it", () => {
    expect(spreadOn(gameFrom(HEMMED_IN))).toBeNull();
  });

  it.each([1, 2, 3])(
    "spreads a burr to the one plain fuzzball beside one, on seed %i",
    (seed) => {
      expect(spreadWith(ONE_WAY, seed)).toEqual({ from: 7, to: 8 });
    },
  );

  it("draws which way a burr spreads from the deal's seed, each way on some seed", () => {
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      spreadWith(TWO_WAYS, seed),
    );

    expect(new Set(drawn.map((spread) => spread?.to))).toEqual(new Set([0, 2]));
  });

  it("draws which way a burr spreads from the moves played, each way after some move", () => {
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8].map((moves) =>
      spreadWith(TWO_WAYS, 1, moves),
    );

    expect(new Set(drawn.map((spread) => spread?.to))).toEqual(new Set([0, 2]));
  });

  it("makes a burred fuzzball worth the same to a wisp whatever the goals, ranked as the sketch ranks it", () => {
    expect([worthOn(4, true), worthOn(4, false), BURR_RULE.wisp?.rank]).toEqual(
      [WISP_BURR_WORTH, WISP_BURR_WORTH, WISP_RANKS.burr],
    );
  });

  it("makes any other square worth nothing to a wisp", () => {
    expect([worthOn(0, true), worthOn(5, true), worthOn(8, true)]).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("asks no goal of a board", () => {
    expect(BURR_RULE.goal).toBeUndefined();
  });

  it.each(["burrBrushedOff", "burrSpreads"] as const)(
    "plays the move the sketch played, %s, as the game's own",
    (name) => {
      const { picture, options, record } = MOVE_FIXTURES[name];

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
