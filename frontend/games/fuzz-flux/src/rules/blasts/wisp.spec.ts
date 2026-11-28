import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { NO_PART } from "../../testing/partial_rules";
import type { ElementId } from "../catalog/elements";
import type { ElementRule } from "../elements/element_rule";
import { ELEMENT_RULES } from "../elements/element_rules";
import { wispTarget } from "./wisp";

/** A board 3 squares a side with no bunch, a wisp's square in its middle. */
const THREE = ["rgr", "g g", "rgr"];

/**
 * Returns where a wisp going off on a square of a board drawn as a picture
 * flies, by the rules given, passing over the squares given.
 */
function flight(
  picture: BoardPicture | readonly string[],
  from: number,
  options: GameOptions = {},
  rules: Readonly<Record<ElementId, ElementRule>> = NO_PART,
  passedOver: readonly number[] = [],
): number | null {
  return wispTarget(
    gameFrom(picture, options),
    from,
    (square) => passedOver.includes(square),
    rules,
  );
}

describe("wispTarget", () => {
  it("flies to a fuzzball of a kind a goal still gathers before any other", () => {
    const target = flight(["b a", "grp", "rab"], 1, {
      goals: [{ what: "gather", kind: "amber", count: 5 }],
    });

    expect(target).toBe(7);
  });

  it("wants no kind whose goal is met", () => {
    const target = flight(["rgga", "gaar"], 0, {
      goals: [{ what: "gather", kind: "amber", count: 5 }],
      goalsLeft: [0],
    });

    expect(target).toBe(7);
  });

  it("takes the farthest of squares worth as much", () => {
    expect(flight(["rgrg", "grgr"], 0)).toBe(7);
  });

  it.each([
    ["the corner its draw puts first", 4, 6],
    ["the first by index of those its draw ties", 3, 2],
  ])("takes, of squares as far and worth as much, %s", (_, seed, corner) => {
    expect(flight(THREE, 4, { seed })).toBe(corner);
  });

  it("draws by the moves played", () => {
    const game = { ...gameFrom(THREE, { seed: 4 }), movesPlayed: 1 };

    expect(wispTarget(game, 4, () => false, NO_PART)).toBe(8);
  });

  describe("by each element's rule", () => {
    it("flies to what an element makes worth the most, before a fuzzball a goal gathers", () => {
      const target = flight(
        ["?r", "gr"],
        3,
        {
          goals: [{ what: "cage" }, { what: "gather", kind: "red", count: 5 }],
        },
        ELEMENT_RULES,
      );

      expect(target).toBe(0);
    });

    it("weighs an element's square less where its goal is met", () => {
      const target = flight(
        ["?r", "gr"],
        3,
        {
          goals: [{ what: "cage" }, { what: "gather", kind: "red", count: 5 }],
          goalsLeft: [0, 5],
        },
        ELEMENT_RULES,
      );

      expect(target).toBe(1);
    });

    it("weighs a square by the first element by rank that weighs it", () => {
      const target = flight(
        { pieces: ["?.g", "rgr"], dust: ["210", "000"] },
        5,
        {
          kinds: ["blue", "amber", "red", "green"],
          goals: [{ what: "dust" }],
        },
        ELEMENT_RULES,
      );

      expect(target).toBe(1);
    });

    it("weighs a square by elements of one rank in the elements' order", () => {
      const tied: Readonly<Record<ElementId, ElementRule>> = {
        ...NO_PART,
        dust: {
          wisp: { rank: 0, worth: (_, square) => (square === 1 ? 5 : 1) },
        },
        brick: { wisp: { rank: 0, worth: () => 3 } },
      };

      expect(flight(["rg", "gr"], 3, {}, tied)).toBe(1);
    });
  });

  it.each([
    ["its own square", ["r"], [], null],
    ["a gap", ["rg_"], [], 1],
    ["a square passed over", ["rgg"], [2], 1],
  ] as const)("never flies to %s", (_, picture, passedOver, target) => {
    const everyWorth: Readonly<Record<ElementId, ElementRule>> = {
      ...NO_PART,
      dust: { wisp: { rank: 0, worth: () => 1 } },
    };

    expect(flight(picture, 0, {}, everyWorth, passedOver)).toBe(target);
  });

  it("never flies to a square worth nothing", () => {
    expect(flight(["rz1 "], 0, { kinds: ["red", "green"] })).toBeNull();
  });
});
