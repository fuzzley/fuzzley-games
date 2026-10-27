import { EASY, EASY_SOLUTION } from "../testing/grid_picture";
import { bit } from "./digits";
import {
  type Single,
  type Step,
  TECHNIQUES,
  type Technique,
  agrees,
  hardest,
  nextPlacement,
  shownBy,
  solveByLogic,
} from "./logic";
import { parseDigits } from "./puzzle";

/** Puzzles that need a technique: logic solves each, and not without it. */
const NEEDS = {
  "naked-single":
    ".5..2...4..7.14..994...7.........63.76.4.5.21.29.........2...936..85.1..2...4..5.",
  pointing:
    "14.......5....2.3...3.7...639..4.6..624.3.175..1.5..437...8.4...5.1....7.......61",
  claiming:
    "3..8...5.948.....6....46.8.4..6....8..54.23..6....5..4.3.21....2.....871.1...8..3",
  "naked-pair":
    "..8.6.....6.4....54.5.93....89...7.4.7.....6.1.4...92....12.4.62....9.5.....8.1..",
  "hidden-pair":
    "9.....82....19.4.3...7.......58.....37.....82.....16.......3...6.2.54....13.....5",
  "naked-triple":
    ".....6.32135..2.9.......8.......41...4.2.9.7...15.......3.......9.7..24372.3.....",
  "hidden-triple":
    "....7..2.6....2......3.1.4..6...598...32.76...756...1..1.8.4......7....5.9..6....",
  "x-wing":
    ".....7..3..2.965.....54..1..28...1...6.9.8.7...5...83..9..64.....385.7..4..7.....",
  swordfish:
    "32.....17.8.7.54.2.....3.......4..29...8.7...45..9.......4.....5.12.9.8.29.....75",
  "xy-wing":
    "..4.5..963...24.51..5...2..8.....5..65.....47..3.....9..7...4..42.51...313..7.6..",
} as const satisfies Partial<Record<Technique, string>>;

/** A puzzle with one solution that the techniques here can't finish. */
const BEYOND_LOGIC =
  "8......9..1..4.....437...8....4..3.6...3.2...4.1..5....7...483.....8..21982.....4";

/** The pointing puzzle above, its singles filled in, so a hint must rule out. */
const POINTING_STUCK =
  "14.......56..12.34.83.7..163957416..624.3.17587125694371..8.4...5.1..3.7.3...7.61";

/** The XY-Wing puzzle above, its singles filled in. */
const XY_WING_STUCK =
  "2.4.5..963.6924.519.5...2.4891.4.5.26521.9.477432.51.9567392418428516973139478625";

/** A board whose easiest eliminations lead nowhere near the next square. */
const ROUNDABOUT =
  "....76.2.6....2.....93.1.46.6..35987.832.7654.756.8.1..1.8.4......7.9..5.9..63.7.";

const EASY_DIGITS = board(EASY.join(""));

/** Returns the board 81 characters draw. */
function board(text: string): number[] {
  return parseDigits(text) ?? [];
}

/** Returns whether a technique is a single. */
function isSingle(technique: Technique): technique is Single {
  return technique === "hidden-single" || technique === "naked-single";
}

describe("TECHNIQUES", () => {
  it("lists the techniques easiest first", () => {
    expect(TECHNIQUES).toEqual([
      "hidden-single",
      "naked-single",
      "pointing",
      "claiming",
      "naked-pair",
      "hidden-pair",
      "naked-triple",
      "hidden-triple",
      "x-wing",
      "swordfish",
      "xy-wing",
    ]);
  });
});

describe("solveByLogic", () => {
  it("solves an easy puzzle with singles alone", () => {
    expect(solveByLogic(EASY_DIGITS, isSingle).solved).toBe(true);
  });

  it("fills each blank square once, as the solution has it", () => {
    const { steps } = solveByLogic(EASY_DIGITS);
    const solution = board(EASY_SOLUTION.join(""));

    expect(steps).toHaveLength(
      EASY_DIGITS.filter((digit) => digit === 0).length,
    );
    expect(
      steps.every(
        (step) => step.kind === "place" && solution[step.index] === step.digit,
      ),
    ).toBe(true);
  });

  it.each(Object.entries(NEEDS))("solves a puzzle that needs %s", (_, text) => {
    expect(solveByLogic(board(text)).solved).toBe(true);
  });

  it.each(Object.entries(NEEDS))(
    "can't solve it with %s withheld",
    (technique, text) => {
      const { solved } = solveByLogic(
        board(text),
        (each) => each !== technique,
      );

      expect(solved).toBe(false);
    },
  );

  it("gives up on a puzzle past its techniques", () => {
    expect(solveByLogic(board(BEYOND_LOGIC)).solved).toBe(false);
  });

  it("finds nothing to do on an empty board", () => {
    expect(solveByLogic(new Array<number>(81).fill(0)).steps).toEqual([]);
  });
});

describe("agrees", () => {
  const solution = board(EASY_SOLUTION.join(""));

  /** Returns a step that rules digits out of row 1, column 1. */
  function ruleOut(digits: number): Step {
    return {
      kind: "eliminate",
      technique: "pointing",
      digits: [],
      cells: [],
      units: [],
      removed: [
        { index: 1, digits: bit(1) },
        { index: 0, digits },
      ],
    };
  }

  /** Returns a step that fills row 1, column 1. */
  function fill(digit: number): Step {
    const technique = "naked-single";
    return { kind: "place", technique, index: 0, digit, unit: null };
  }

  it.each<[string, Step, boolean]>([
    ["places the solution's digit", fill(6), true],
    ["places another digit", fill(9), false],
    ["rules out none of the solution's digits", ruleOut(bit(1) | bit(9)), true],
    ["rules out the solution's digit", ruleOut(bit(6)), false],
  ])("checks a step that %s", (_, step, expected) => {
    expect(agrees(step, solution)).toBe(expected);
  });
});

describe("hardest", () => {
  it("names the hardest technique among the steps", () => {
    const { steps } = solveByLogic(board(NEEDS.swordfish));

    expect(hardest(steps)).toBe("swordfish");
  });

  it("names none for no steps", () => {
    expect(hardest([])).toBeNull();
  });
});

describe("nextPlacement", () => {
  it("finds a single, needing nothing ruled out, where there is one", () => {
    const chain = nextPlacement(EASY_DIGITS);
    const solution = board(EASY_SOLUTION.join(""));

    expect(chain?.eliminations).toEqual([]);
    expect(chain?.placement.digit).toBe(solution[chain?.placement.index ?? 0]);
  });

  it("rules out what the next square needs first", () => {
    const chain = nextPlacement(board(POINTING_STUCK));

    expect(chain?.eliminations.map((step) => step.technique)).toEqual([
      "pointing",
    ]);
    expect(chain?.placement).toMatchObject({
      technique: "naked-single",
      digit: 6,
      index: 4,
    });
  });

  it("takes as many eliminations as the square needs", () => {
    const chain = nextPlacement(board(XY_WING_STUCK));

    expect(chain?.eliminations.map((step) => step.technique)).toEqual([
      "pointing",
      "xy-wing",
    ]);
    expect(chain?.placement).toMatchObject({ digit: 8, index: 42 });
  });

  it("leaves out the eliminations the square doesn't need", () => {
    const chain = nextPlacement(board(ROUNDABOUT));

    expect(chain?.eliminations.map((step) => step.technique)).toEqual([
      "hidden-triple",
      "pointing",
    ]);
    expect(chain?.placement).toMatchObject({ digit: 2, index: 67 });
  });

  it("finds nothing on an empty board", () => {
    expect(nextPlacement(new Array<number>(81).fill(0))).toBeNull();
  });
});

describe("shownBy", () => {
  it("shows the unit where a hidden single has one place left", () => {
    const chain = nextPlacement(EASY_DIGITS)!;

    expect(chain.placement.technique).toBe("hidden-single");
    expect(shownBy(chain)).toEqual(chain.placement.unit?.cells);
  });

  it("shows each elimination's pattern, and no more for a naked single", () => {
    const chain = nextPlacement(board(POINTING_STUCK))!;

    expect(shownBy(chain)).toEqual(chain.eliminations[0]?.cells);
  });
});
