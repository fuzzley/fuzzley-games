import { boardFrom, gameFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { BrickLayers } from "../catalog/elements";
import type { Brick, Piece } from "../catalog/pieces";
import { play } from "../move/play";
import { WISP_BRICK_WORTH, WISP_BRICK_WORTH_MET } from "../tuning";
import { BRICK_RULE } from "./brick";
import type { ElementRule, SquareState } from "./element_rule";
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

/** Returns a brick of some layers, on thick dust. */
function brickOf(layers: BrickLayers): SquareState {
  return { piece: { what: "brick", id: 7, layers }, dust: 2 };
}

/** A board with a brick of 1, 4 and 2 layers along its top row, and fuzzballs under them. */
const BRICKS = boardFrom({ pieces: ["142", "brg"] });

/** Returns what a wisp makes of a square of `BRICKS` by a brick's rule. */
function worthOn(square: number, goalOpen = true): number | null {
  return BRICK_RULE.wisp?.worth(BRICKS, square, goalOpen) ?? null;
}

/** The moments a brick is hit in, each with its hook. */
const HITS = [
  ["a bunch beside it", "besideBunch"],
  ["a blast", "blasted"],
] as const satisfies readonly (readonly [string, keyof ElementRule])[];

describe("BRICK_RULE", () => {
  describe.each(HITS)("hit by %s", (_, moment) => {
    it.each([
      [4, 3],
      [3, 2],
      [2, 1],
    ] as const)(
      "knocks a layer off a brick of %s, leaving %s, which counts for nothing",
      (layers, left) => {
        const knocked = BRICK_RULE[moment]?.(brickOf(layers));

        expect(knocked).toEqual({
          square: {
            piece: { what: "brick", id: 7, layers: left } satisfies Brick,
            dust: 2,
          },
          hit: "knocked",
          counts: false,
        });
      },
    );

    it("breaks a brick of 1 layer, leaving its square empty but for its dust, and counts it", () => {
      expect(BRICK_RULE[moment]?.(brickOf(1))).toEqual({
        square: { piece: null, dust: 2 },
        hit: "broken",
        counts: true,
      });
    });

    it("leaves a square with no brick to the other rules", () => {
      expect([
        BRICK_RULE[moment]?.({ piece: BLUE, dust: 1 }),
        BRICK_RULE[moment]?.({ piece: null, dust: 1 }),
      ]).toEqual([null, null]);
    });
  });

  it("keeps a brick from being swapped and from falling, and nothing else", () => {
    const squares = [brickOf(2), { piece: BLUE, dust: 0 } as const];

    expect({
      swapped: squares.map((square) => BRICK_RULE.holdsSwap?.(square)),
      falls: squares.map((square) => BRICK_RULE.holdsFall?.(square)),
    }).toEqual({ swapped: [true, false], falls: [true, false] });
  });

  it("makes a thinner brick worth more to a wisp while the goal is open", () => {
    expect([worthOn(0), worthOn(2), worthOn(1)]).toEqual([
      WISP_BRICK_WORTH - 1,
      WISP_BRICK_WORTH - 2,
      WISP_BRICK_WORTH - 4,
    ]);
  });

  it("makes every brick worth the same to a wisp once no goal asks for bricks", () => {
    expect([worthOn(0, false), worthOn(1, false)]).toEqual([
      WISP_BRICK_WORTH_MET,
      WISP_BRICK_WORTH_MET,
    ]);
  });

  it("makes no square without a brick worth anything to a wisp", () => {
    expect(worthOn(3)).toBeNull();
  });

  it("asks a goal of every brick a board is dealt, whatever its layers", () => {
    expect([BRICK_RULE.goal?.id, BRICK_RULE.goal?.countOn(BRICKS)]).toEqual([
      "brick",
      3,
    ]);
  });

  it.each(["rollAndRefill", "brickBroken"] as const)(
    "plays the sketch's move %s, a brick hit by a bunch beside it, as the game's own",
    (fixture) => {
      const { picture, options, record } = MOVE_FIXTURES[fixture];

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

  it("knocks 2 layers off a brick hit twice in a wave, by a bunch beside it and the dasher it sets off", () => {
    const game = gameFrom({
      pieces: ["bbg", "r3b", "avp"],
      marks: [".|.", "...", "..."],
    });

    const { record } = play(game, 2, 5, ELEMENT_RULES, WIND_RULE);

    expect(
      record.waves[0]?.hits.flatMap((hit) =>
        hit.what === "knocked" ? [[hit.square, hit.layersLeft]] : [],
      ),
    ).toEqual([
      [4, 2],
      [4, 1],
    ]);
  });
});
