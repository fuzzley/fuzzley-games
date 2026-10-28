import { runFrom } from "../testing/run_picture";
import type { Run } from "../rules/run";
import type { BoardMetrics } from "./board_metrics";
import { SnakeShapes, snakeShapes } from "./snake_shapes";

/** A board of 5 squares of 10 device pixels, from the canvas's corner. */
const METRICS: BoardMetrics = {
  size: 5,
  square: 10,
  x: 0,
  y: 0,
  side: 50,
  wall: 2,
  css: { x: 0, y: 0, width: 50, height: 50 },
};

/** Returns the points the body runs through, as `[x, y]` pairs. */
function pointsOf(run: Run, progress = 0): [number, number][] {
  const shapes = snakeShapes(
    { run, progress, newBest: false },
    METRICS,
    new SnakeShapes(25),
  );
  return Array.from({ length: shapes.count }, (_, i) => [
    shapes.xs[i] ?? NaN,
    shapes.ys[i] ?? NaN,
  ]);
}

const STRAIGHT = [".....", ".>>@.", ".....", ".....", "....*"];

describe("snakeShapes", () => {
  it("runs a straight snake as one line, head to tail", () => {
    expect(pointsOf(runFrom(STRAIGHT))).toEqual([
      [35, 15],
      [15, 15],
    ]);
  });

  it("runs a bent snake through its bend", () => {
    const run = runFrom([".....", ".>v..", "..@..", ".....", "....*"]);

    expect(pointsOf(run)).toEqual([
      [25, 25],
      [25, 15],
      [15, 15],
    ]);
  });

  it("glides the head toward its next square, and the tail after it", () => {
    expect(pointsOf(runFrom(STRAIGHT), 0.5)).toEqual([
      [40, 15],
      [20, 15],
    ]);
  });

  it("glides the head into the turn queued", () => {
    const run = runFrom(STRAIGHT, { turns: ["down"] });

    expect(pointsOf(run, 0.5)).toEqual([
      [35, 20],
      [35, 15],
      [20, 15],
    ]);
  });

  it("keeps the tail still on a step the snake grows", () => {
    const run = runFrom([".....", ".>>@*", ".....", ".....", "....."]);

    expect(pointsOf(run, 0.5)).toEqual([
      [40, 15],
      [15, 15],
    ]);
  });

  it("keeps a head about to run into the wall on its square", () => {
    const run = runFrom([".....", "..>>@", ".....", ".....", "....*"]);

    expect(pointsOf(run, 0.5)).toEqual([
      [45, 15],
      [25, 15],
    ]);
  });

  it("glides nothing on a run that isn't under way", () => {
    const run = runFrom(STRAIGHT, { outcome: "paused" });

    expect(pointsOf(run, 0.5)).toEqual([
      [35, 15],
      [15, 15],
    ]);
  });

  it("draws no point twice where a short snake glides a whole square", () => {
    const run = runFrom([".....", "..>@.", ".....", ".....", "....*"]);

    expect(pointsOf(run, 1)).toEqual([
      [45, 15],
      [35, 15],
    ]);
  });

  it("draws a snake of one square as its head", () => {
    const run = runFrom([".....", "...@.", ".....", ".....", "....*"]);

    expect(pointsOf(run)).toEqual([[35, 15]]);
  });

  it("draws nothing of a snake with no squares", () => {
    const run = { ...runFrom(STRAIGHT), snake: [] };

    expect(pointsOf(run)).toEqual([]);
  });

  it("sizes the body, the head and its eyes to the square", () => {
    const shapes = snakeShapes(
      { run: runFrom(STRAIGHT), progress: 0, newBest: false },
      METRICS,
      new SnakeShapes(25),
    );

    expect({
      width: shapes.width,
      head: Math.round(shapes.head.radius * 10) / 10,
      eyes: shapes.eyes,
    }).toEqual({
      width: 6,
      head: 3.6,
      eyes: { x1: 36.4, y1: 13.2, x2: 36.4, y2: 16.8, radius: 1 },
    });
  });

  it("looks the way the head glides", () => {
    const shapes = snakeShapes(
      {
        run: runFrom(STRAIGHT, { turns: ["down"] }),
        progress: 0.5,
        newBest: false,
      },
      METRICS,
      new SnakeShapes(25),
    );

    // Heading down, the snake's left is the board's right.
    expect([shapes.eyes.x1 > shapes.eyes.x2, shapes.eyes.y1]).toEqual([
      true,
      shapes.eyes.y2,
    ]);
  });

  it("writes each frame over the last", () => {
    const shapes = new SnakeShapes(25);
    const bent = runFrom([".....", ".>v..", "..@..", ".....", "....*"]);
    snakeShapes({ run: bent, progress: 0, newBest: false }, METRICS, shapes);

    snakeShapes(
      { run: runFrom(STRAIGHT), progress: 0, newBest: false },
      METRICS,
      shapes,
    );

    expect(shapes.count).toBe(2);
  });
});
