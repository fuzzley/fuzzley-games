import { EASY, EASY_SOLUTION } from "../testing/grid_picture";
import { CELLS } from "./cells";
import { LEVEL_INFO } from "./difficulty";
import { generate, grade } from "./generate";
import { parseDigits } from "./puzzle";
import { countSolutions } from "./solver";

/** A puzzle with one solution that logic here can't finish. */
const BEYOND_LOGIC =
  "8......9..1..4.....437...8....4..3.6...3.2...4.1..5....7...483.....8..21982.....4";

/** Returns the board 81 characters draw. */
function board(text: string): number[] {
  return parseDigits(text) ?? [];
}

describe("grade", () => {
  it("grades a puzzle by the hardest technique it needs", () => {
    expect(grade(board(EASY.join("")))).toBe("easy");
  });

  it("grades nothing that logic can't solve", () => {
    expect(grade(board(BEYOND_LOGIC))).toBeNull();
  });

  it("grades nothing with nothing to fill", () => {
    expect(grade(board(EASY_SOLUTION.join("")))).toBeNull();
  });
});

describe("generate", () => {
  it("makes a puzzle at the level asked, with one solution", () => {
    const givens = generate("easy", 1) ?? [];

    expect(grade(givens)).toBe("easy");
    expect(countSolutions(givens, 2)).toBe(1);
  });

  it("makes the same puzzle from the same seed", () => {
    expect(generate("easy", 2)).toEqual(generate("easy", 2));
  });

  it("keeps the level's fewest givens", () => {
    const givens = generate("easy", 1) ?? [];

    expect(givens.filter((digit) => digit !== 0).length).toBeGreaterThanOrEqual(
      LEVEL_INFO.easy.fewest,
    );
  });

  it("keeps the givens mirrored through the center", () => {
    const givens = generate("expert", 9) ?? [];

    expect(
      givens.every(
        (digit, i) => (digit === 0) === (givens[CELLS - 1 - i] === 0),
      ),
    ).toBe(true);
  });

  it("takes givens away as far as the level allows", () => {
    const givens = generate("expert", 9) ?? [];

    expect(grade(givens)).toBe("expert");
  });

  it("makes nothing when the seed's grid comes out easier than asked", () => {
    expect(generate("hard", 1)).toBeNull();
  });
});
