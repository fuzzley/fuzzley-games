import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { NO_PART } from "../../testing/partial_rules";
import type { SetOff } from "../blasts/striking";
import type { ElementId } from "../catalog/elements";
import type { ElementRule } from "../elements/element_rule";
import { ELEMENT_RULES } from "../elements/element_rules";
import type { Blast, MoveRecord } from "./record";
import { type Swapped, playSwap } from "./swapped";

/** Every move played by hand, by its name. */
const FIXTURES = Object.entries(MOVE_FIXTURES);

/** A goal of gathering 9 blues, and one of 9 greens. */
const GATHERING: GameOptions = {
  goals: [
    { what: "gather", kind: "blue", count: 9 },
    { what: "gather", kind: "green", count: 9 },
  ],
};

/** Returns what a swap does on a game drawn as a picture. */
function swapOn(
  picture: BoardPicture | readonly string[],
  from: number,
  to: number,
  options: GameOptions = {},
  rules: Readonly<Record<ElementId, ElementRule>> = ELEMENT_RULES,
): Swapped | null {
  return playSwap(gameFrom(picture, options), from, to, rules);
}

/** Describes what a move's swap did: whether it was refused, the bunches it stood up, by their squares, and what it set off. */
interface Opening {
  readonly refused: boolean;
  readonly bunches: readonly (readonly number[])[];
  readonly setOff: readonly SetOff[];
}

/** Returns what a swap did, as it plays its first wave. */
function openingOf(swapped: Swapped | null): Opening {
  return {
    refused: swapped === null,
    bunches: swapped?.bunches.map(({ squares }) => squares) ?? [],
    setOff: swapped?.setOff ?? [],
  };
}

/** Returns what the sketch's swap did, as its record writes it down: the bunches of its first wave, and each blast nothing else set off. */
function openingIn({ swap, waves: [wave] }: MoveRecord): Opening {
  return {
    refused: swap.refused,
    bunches: wave?.bunches.map(({ squares }) => squares) ?? [],
    setOff:
      wave?.blasts.flatMap((blast) =>
        blast.setOffBy === null ? setOffOf(blast) : [],
      ) ?? [],
  };
}

/** Returns what the sketch set off, without what set it off. */
function setOffOf({ what, square, piece, kind }: Blast): readonly SetOff[] {
  if (what === "two-frizzballs") {
    return [{ what, square, piece, kind: null }];
  }
  return kind === null ? [] : [{ what, square, piece, kind }];
}

/** Returns what each square of a swap's board holds, by its piece's id. */
function idsOn(swapped: Swapped | null): readonly (number | null)[] {
  return swapped?.game.board.pieces.map((piece) => piece?.id ?? null) ?? [];
}

describe("playSwap", () => {
  it.each(FIXTURES)(
    "refuses or sets off what the sketch did, in %s",
    (_, { picture, options, record }) => {
      const game = gameFrom(picture, options);

      const swapped = playSwap(
        game,
        record.swap.from,
        record.swap.to,
        ELEMENT_RULES,
      );

      expect(openingOf(swapped)).toEqual(openingIn(record));
    },
  );

  describe("refuses", () => {
    it.each([
      ["squares that aren't neighbors", ["rbr", "gbb"], ["o.o", "..."], 0, 2],
      ["the squares at two rows' ends", ["rbr", "gbb"], ["..o", "..."], 2, 3],
      ["a square that holds nothing", ["r b", "gbb"], ["o..", "..."], 0, 1],
      ["a piece an element's rule holds", ["rBr", "gbb"], ["o..", "..."], 0, 1],
      [
        "a swap that makes no bunch and moves no special",
        ["rbr", "gbg"],
        ["...", "..."],
        0,
        3,
      ],
      ["a tap of a plain fuzzball", ["rbr", "gbb"], ["...", "..."], 1, 1],
    ] as const)("%s", (_, pieces, marks, from, to) => {
      expect(swapOn({ pieces, marks }, from, to)).toBeNull();
    });

    it("the frizzball swapped with a piece that is no fuzzball, where no rule holds it", () => {
      expect(swapOn(["f1"], 0, 1, {}, NO_PART)).toBeNull();
    });
  });

  it("sets a special tapped off where it stands, taking it off and counting its kind", () => {
    const swapped = swapOn(
      { pieces: ["bgb", "rrg"], marks: [".w.", "..."] },
      1,
      1,
      GATHERING,
    );

    expect({
      ids: idsOn(swapped),
      goalsLeft: swapped?.game.goalsLeft,
      bunches: swapped?.bunches,
      setOff: swapped?.setOff,
    }).toEqual({
      ids: [1, null, 3, 4, 5, 6],
      goalsLeft: [9, 8],
      bunches: [],
      setOff: [{ what: "wisp", square: 1, piece: 2, kind: "green" }],
    });
  });

  it("sets the frizzball tapped off with the kind the board holds most of, counting nothing", () => {
    const swapped = swapOn(["fgb", "rgg"], 0, 0, GATHERING);

    expect({
      goalsLeft: swapped?.game.goalsLeft,
      setOff: swapped?.setOff,
    }).toEqual({
      goalsLeft: [9, 9],
      setOff: [{ what: "frizzball", square: 0, piece: 1, kind: "green" }],
    });
  });

  it("sets two specials swapped together off as their pair where the one picked up was swapped to, taking both off and counting each", () => {
    const swapped = swapOn(
      { pieces: ["bgr", "rbg"], marks: ["-o.", "..."] },
      0,
      1,
      GATHERING,
    );

    expect({
      ids: idsOn(swapped),
      goalsLeft: swapped?.game.goalsLeft,
      setOff: swapped?.setOff,
    }).toEqual({
      ids: [null, null, 3, 4, 5, 6],
      goalsLeft: [8, 8],
      setOff: [
        { what: "dasher-and-puffer", square: 1, piece: 1, kind: "blue" },
      ],
    });
  });

  it("sets the frizzball swapped with a special off as their pair, with the special's kind", () => {
    const swapped = swapOn(
      { pieces: ["fgr", "rbg"], marks: [".|.", "..."] },
      0,
      1,
      GATHERING,
    );

    expect({
      goalsLeft: swapped?.game.goalsLeft,
      setOff: swapped?.setOff,
    }).toEqual({
      goalsLeft: [9, 8],
      setOff: [
        { what: "frizzball-and-dasher", square: 1, piece: 1, kind: "green" },
      ],
    });
  });

  it("sets the frizzball swapped with a fuzzball off where it lands, with that one's kind, and finds no bunch", () => {
    const swapped = swapOn(["bfbb", "rgrg"], 0, 1, GATHERING);

    expect({
      ids: idsOn(swapped),
      goalsLeft: swapped?.game.goalsLeft,
      bunches: swapped?.bunches,
      setOff: swapped?.setOff,
    }).toEqual({
      ids: [null, 1, 3, 4, 5, 6, 7, 8],
      goalsLeft: [9, 9],
      bunches: [],
      setOff: [{ what: "frizzball", square: 0, piece: 2, kind: "blue" }],
    });
  });

  it("trades two pieces, finding the bunches the swap stood up and setting off a special that lands in none where it lands", () => {
    const swapped = swapOn(
      { pieces: ["grgb", "rbrg"], marks: ["....", ".|.."] },
      1,
      5,
      GATHERING,
    );

    expect({
      ids: idsOn(swapped),
      goalsLeft: swapped?.game.goalsLeft,
      bunches: swapped?.bunches.map(({ squares }) => squares),
      setOff: swapped?.setOff,
    }).toEqual({
      ids: [1, null, 3, 4, 5, 2, 7, 8],
      goalsLeft: [8, 9],
      bunches: [[4, 5, 6]],
      setOff: [{ what: "dasher-down", square: 1, piece: 6, kind: "blue" }],
    });
  });

  it("leaves a special that lands in a bunch to the bunch, setting nothing off", () => {
    const swapped = swapOn(
      { pieces: ["bgbb", "rrgr"], marks: ["o...", "...."] },
      0,
      1,
      GATHERING,
    );

    expect({
      ids: idsOn(swapped),
      goalsLeft: swapped?.game.goalsLeft,
      bunches: swapped?.bunches.map(({ squares }) => squares),
      setOff: swapped?.setOff,
    }).toEqual({
      ids: [2, 1, 3, 4, 5, 6, 7, 8],
      goalsLeft: [9, 9],
      bunches: [[1, 2, 3]],
      setOff: [],
    });
  });

  it.each([
    ["a tap", { pieces: ["bgb", "rrg"], marks: [".w.", "..."] }, 1, 1],
    ["a pair", { pieces: ["bgr", "rbg"], marks: ["-o.", "..."] }, 0, 1],
    ["the frizzball's swap", { pieces: ["bfbb", "rgrg"] }, 0, 1],
    ["a trade", { pieces: ["grgb", "rbrg"], marks: ["....", ".|.."] }, 1, 5],
  ] as const)(
    "leaves the game it is handed as it was, for %s",
    (_, picture, from, to) => {
      const game = gameFrom(picture, GATHERING);
      const before = structuredClone(game);

      playSwap(game, from, to, ELEMENT_RULES);

      expect(game).toEqual(before);
    },
  );
});
