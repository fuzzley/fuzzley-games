import { fieldFrom, stepTimes, throwBall } from "../testing/field_picture";
import { hitBrick } from "./bricks";
import type { Field } from "./field";
import { cellIndex } from "./grid";
import { clearingPoints, multiplier } from "./scoring";
import { stepsIn } from "./stepper";
import { CLEAN_POINTS, CLEAR_POINTS } from "./tuning";

/** A brick far down the field, which keeps a level from clearing. */
const KEEPER = ["", "", "", "", "", "", "", "", "", "o"];

/** Hits the bricks of the first row, in the columns given, in turn. */
function hitTop(field: Field, ...columns: number[]): void {
  for (const column of columns) {
    const brick = field.bricks[cellIndex(column, 0)];
    if (brick) hitBrick(field, brick, 0, 0);
  }
}

describe("multiplier", () => {
  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [19, 3],
    [20, 4],
    [50, 4],
  ])("scores a streak of %i %i times", (streak, times) => {
    expect(multiplier(streak)).toBe(times);
  });
});

describe("clearingPoints", () => {
  it("adds more for a level cleared without losing a ball", () => {
    expect([clearingPoints(0), clearingPoints(1)]).toEqual([
      CLEAR_POINTS + CLEAN_POINTS,
      CLEAR_POINTS,
    ]);
  });
});

describe("a level's score", () => {
  it.each([
    ["a plain brick", "o", 1, 50],
    ["a tough brick, at each hit", "3", 2, 100],
    ["steel, nothing", "#", 3, 0],
    ["a blast brick", "*", 1, 100],
    ["a gift brick", "?", 1, 100],
  ])("counts %s", (_, brick, hits, score) => {
    const field = fieldFrom([brick, ...KEEPER]);

    for (let i = 0; i < hits; i++) hitTop(field, 0);

    expect(field.score).toBe(score);
  });

  it("counts a regrowing brick each time it breaks", () => {
    const field = fieldFrom(["+", ...KEEPER]);
    hitTop(field, 0);
    stepTimes(field, stepsIn(10_000));

    hitTop(field, 0);

    expect(field.score).toBe(40);
  });

  it("counts double from the fifth brick broken in a streak", () => {
    const field = fieldFrom(["oooooo", ...KEEPER]);

    hitTop(field, 0, 1, 2, 3, 4, 5);

    expect(field.score).toBe(4 * 50 + 2 * 100);
  });

  it("counts the bricks a blast breaks in the streak", () => {
    const field = fieldFrom(["ooo", "o*o", "ooo", ...KEEPER]);
    const blast = field.bricks[cellIndex(1, 1)];
    if (blast) hitBrick(field, blast, 0, 0);

    stepTimes(field, stepsIn(100));

    expect(field.streak).toBe(9);
  });
});

describe("a streak", () => {
  it("starts again as the paddle meets a ball", () => {
    const field = fieldFrom(KEEPER);
    throwBall(field, 13, 26, 180);
    field.streak = 7;

    stepTimes(field, 10);

    expect(field.streak).toBe(0);
  });

  it("starts again as the last ball is lost, which costs a life", () => {
    const field = fieldFrom(KEEPER);
    throwBall(field, 5, 29.5, 180);
    field.streak = 7;

    stepTimes(field, 10);

    expect({ streak: field.streak, livesLost: field.livesLost }).toEqual({
      streak: 0,
      livesLost: 1,
    });
  });
});
