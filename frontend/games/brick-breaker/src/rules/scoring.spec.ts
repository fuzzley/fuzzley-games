import {
  KEEPER,
  brickAt,
  fieldFrom,
  stepTimes,
  throwBall,
} from "../testing/field_picture";
import { hitBrick } from "./bricks";
import type { Field } from "./field";
import { clearingPoints, multiplier } from "./scoring";
import { stepsIn } from "./stepper";
import { CLEAN_POINTS, CLEAR_POINTS } from "./tuning";

/** Hits the bricks of the first row once each, in the columns given, in turn. */
function hitTop(field: Field, ...columns: number[]): void {
  for (const column of columns) {
    hitBrick(field, brickAt(field, column, 0), 0, 0);
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
  it("adds more for a level cleared without losing a life", () => {
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

  it("counts every hit a brick takes at once, as from a fire ball", () => {
    const field = fieldFrom(["4", ...KEEPER]);

    hitBrick(field, brickAt(field, 0, 0), 0, 0, "breaks");

    expect(field.score).toBe(200);
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

  it("keeps apart what the streak added", () => {
    const field = fieldFrom(["oooooo", ...KEEPER]);

    hitTop(field, 0, 1, 2, 3, 4, 5);

    expect(field.streakPoints).toBe(2 * 50);
  });

  it("counts the bricks a blast breaks in the streak", () => {
    const field = fieldFrom(["ooo", "o*o", "ooo", ...KEEPER]);
    hitBrick(field, brickAt(field, 1, 1), 0, 0);

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

  it("goes on as a ball is lost while another plays on", () => {
    const field = fieldFrom(KEEPER);
    throwBall(field, 5, 29.5, 180);
    throwBall(field, 13, 15, 0, 1);
    field.streak = 7;

    stepTimes(field, 10);

    expect({ streak: field.streak, livesLost: field.livesLost }).toEqual({
      streak: 7,
      livesLost: 0,
    });
  });
});
