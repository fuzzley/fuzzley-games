import { EASY } from "../testing/grid_picture";
import { CELLS } from "./cells";
import { digitsText, parseDigits, puzzleFrom } from "./puzzle";
import { createRandom } from "@fz/core/random";
import {
  IDENTITY,
  type Transform,
  randomTransform,
  transform,
} from "./transform";

const GIVENS = parseDigits(EASY.join("")) ?? [];

describe("transform", () => {
  it("changes nothing under the identity", () => {
    expect(transform(GIVENS, IDENTITY)).toEqual(GIVENS);
  });

  it("relabels the digits, leaving blanks blank", () => {
    const swapOneAndTwo: Transform = {
      ...IDENTITY,
      digits: [2, 1, 3, 4, 5, 6, 7, 8, 9],
    };

    expect(digitsText(transform(GIVENS, swapOneAndTwo)).slice(0, 18)).toBe(
      "...5..1..187.4.9..",
    );
  });

  it("turns the board over its diagonal", () => {
    const turned = transform(GIVENS, { ...IDENTITY, transpose: true });

    expect([turned[1], turned[9]]).toEqual([GIVENS[9], GIVENS[1]]);
  });

  it("takes each row from the row it names", () => {
    const rows = [1, 0, 2, 3, 4, 5, 6, 7, 8];

    const swapped = transform(GIVENS, { ...IDENTITY, rows });

    expect(swapped.slice(0, 9)).toEqual(GIVENS.slice(9, 18));
  });

  it("keeps a puzzle's one solution, under its own transform", () => {
    const random = createRandom(5);
    const turn = randomTransform(random);
    const puzzle = puzzleFrom(GIVENS, "easy");

    const turned = puzzleFrom(transform(GIVENS, turn), "easy");

    expect(turned?.solution).toEqual(transform(puzzle?.solution ?? [], turn));
  });
});

describe("randomTransform", () => {
  it("relabels every digit once", () => {
    const turn = randomTransform(createRandom(3));

    expect([...turn.digits].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("keeps each band of rows and stack of columns together", () => {
    const turn = randomTransform(createRandom(3));
    const bands = (lines: readonly number[]): number[][] =>
      [0, 3, 6].map((start) =>
        lines.slice(start, start + 3).map((line) => Math.floor(line / 3)),
      );

    expect(
      [...bands(turn.rows), ...bands(turn.cols)].every((band) =>
        band.every((each) => each === band[0]),
      ),
    ).toBe(true);
  });

  it("chooses the same transform for the same seed", () => {
    expect(randomTransform(createRandom(8))).toEqual(
      randomTransform(createRandom(8)),
    );
  });

  it("turns some boards over and leaves others", () => {
    const turns = Array.from(
      { length: 20 },
      (_, seed) => randomTransform(createRandom(seed)).transpose,
    );

    expect(new Set(turns).size).toBe(2);
  });

  it("transforms every square", () => {
    expect(transform(GIVENS, randomTransform(createRandom(1)))).toHaveLength(
      CELLS,
    );
  });
});
