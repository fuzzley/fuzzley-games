import { runFrom } from "../testing/run_picture";
import { BOARD_SIZE } from "./arena";
import {
  type ReportedRun,
  readReportedRun,
  reportRun,
  summarizeRun,
} from "./reported_run";
import { type Run, createRun, step, turn } from "./run";

/** Returns a run under way on the game's board, some steps in. */
function underWay(): Run {
  let run = turn(createRun({ id: 1, seed: 5, speed: "fast" }), "up");
  for (let i = 0; i < 3; i++) run = step(run);
  return turn(run, "right");
}

/** Returns a run that ran up into the top wall. */
function crashed(): Run {
  let run = turn(createRun({ id: 1, seed: 5, speed: "normal" }), "up");
  while (run.outcome === "playing") run = step(run);
  return run;
}

/**
 * Returns a run won on the full board: the snake fills it, from its head at
 * the top left, back and forth down the rows.
 */
function won(): Run {
  const last = BOARD_SIZE - 1;
  const rows = Array.from({ length: BOARD_SIZE }, (_, y) => {
    if (y === 0) return `@${"<".repeat(last)}`;
    return y % 2 === 1 ? `${">".repeat(last)}^` : `^${"<".repeat(last)}`;
  });
  return {
    ...runFrom(rows, { outcome: "won", steps: 2000 }),
    last: "won",
  };
}

/**
 * Returns a won run whose snake fills the board but for its tail, which lies
 * in the far corner, apart from the rest: back and forth along the rows to
 * the last two, then up and down their columns, back to the left.
 */
function wonTailApart(): Run {
  const end = BOARD_SIZE - 1;
  const rows = Array.from({ length: end - 1 }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, i) => ({
      x: y % 2 === 0 ? i : end - i,
      y,
    })),
  );
  const columns = Array.from({ length: end }, (_, i) => {
    const x = end - 1 - i;
    const top = { x, y: end - 1 };
    const bottom = { x, y: end };
    return i % 2 === 0 ? [top, bottom] : [bottom, top];
  });
  const snake = [
    ...rows.flat(),
    { x: end, y: end - 1 },
    ...columns.flat(),
    { x: end, y: end },
  ];
  return { ...won(), snake };
}

/** Returns a run as a report carries it, with some of it changed. */
function reportedWith(run: Run, change: Record<string, unknown>): unknown {
  return { ...reportRun(run), ...change };
}

describe("reportRun", () => {
  it("carries a run under way as storage keeps it, with its outcome and last step", () => {
    expect(reportRun(underWay())).toEqual({
      snake: [
        [4, 5],
        [4, 6],
        [4, 7],
      ],
      heading: "up",
      turns: ["right"],
      apple: [12, 8],
      seed: 5,
      eaten: 0,
      speed: "fast",
      steps: 3,
      outcome: "playing",
      crash: null,
      last: "moved",
    });
  });

  it("carries an ended run's crash", () => {
    expect(reportRun(crashed())).toMatchObject({
      outcome: "over",
      crash: "wall",
      last: "crashed",
    });
  });

  it("carries a won run, with no apple", () => {
    expect(reportRun(won()).apple).toBeNull();
  });
});

describe("readReportedRun", () => {
  it.each<[string, () => Run]>([
    [
      "a run waiting for its first direction",
      () => createRun({ id: 1, seed: 3, speed: "slow" }),
    ],
    ["a run under way", underWay],
    ["a run paused", () => ({ ...underWay(), outcome: "paused" })],
    ["a run that crashed", crashed],
    ["a run that ran into itself", () => ({ ...crashed(), crash: "self" })],
    ["a run won", won],
  ])("reads back %s as it was reported, under a new id", (_, made) => {
    const run = made();

    expect(readReportedRun(reportRun(run), 9)).toEqual({ ...run, id: 9 });
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["an outcome that isn't one", { outcome: "lost" }, "run.outcome"],
    [
      "a crash that isn't one",
      { outcome: "over", crash: "tree", last: "crashed" },
      "run.crash",
    ],
    [
      "an ended run with no crash",
      { outcome: "over", crash: null },
      "run.crash",
    ],
    ["a crash in a run under way", { crash: "wall" }, "run.crash"],
    ["a last step that isn't one", { last: "hopped" }, "run.last"],
    [
      "a run waiting with a step taken",
      { outcome: "ready", last: "moved" },
      "run.last",
    ],
    [
      "a run ended by a move",
      { outcome: "over", crash: "wall", last: "moved" },
      "run.last",
    ],
    ["a run won by no step", { outcome: "won", last: null }, "run.last"],
    ["a run storage wouldn't take up", { heading: "down" }, "run"],
    ["a run with no apple that isn't won", { apple: null }, "run"],
  ])("refuses %s, naming it", (_, change, part) => {
    expect(() => readReportedRun(reportedWith(underWay(), change), 1)).toThrow(
      `The game state's ${part} doesn't fit this build.`,
    );
  });

  it("refuses a run that isn't a record", () => {
    expect(() => readReportedRun([], 1)).toThrow(
      "The game state's run doesn't fit this build.",
    );
  });

  it.each<[string, (reported: ReportedRun) => Record<string, unknown>]>([
    ["with an apple left", (reported) => ({ apple: reported.snake.at(-1) })],
    ["with a snake that isn't a list", () => ({ snake: "long" })],
    ["with apples that aren't a count", () => ({ eaten: "many" })],
    [
      "short of the whole board",
      (reported) => ({
        snake: reported.snake.slice(0, -1),
        eaten: reported.eaten - 1,
      }),
    ],
    [
      "with apples that don't match its length",
      (reported) => ({ eaten: reported.eaten - 1 }),
    ],
  ])("refuses a won run %s", (_, change) => {
    const run = won();

    expect(() =>
      readReportedRun(reportedWith(run, change(reportRun(run))), 1),
    ).toThrow("The game state's run doesn't fit this build.");
  });

  it("refuses a won run whose tail lies apart from the rest", () => {
    expect(() => readReportedRun(reportRun(wonTailApart()), 1)).toThrow(
      "The game state's run doesn't fit this build.",
    );
  });
});

describe("summarizeRun", () => {
  it.each<[string, () => Run, string]>([
    [
      "waiting for its first direction",
      () => createRun({ id: 1, seed: 3, speed: "slow" }),
      "Score 0 · 0 steps · not started",
    ],
    [
      "a step in",
      () => step(turn(createRun({ id: 1, seed: 3, speed: "slow" }), "up")),
      "Score 0 · 1 step · in play",
    ],
    ["under way", underWay, "Score 0 · 3 steps · in play"],
    [
      "paused",
      () => ({ ...underWay(), outcome: "paused" }),
      "Score 0 · 3 steps · paused",
    ],
    [
      "that ran into the wall",
      crashed,
      "Score 0 · 9 steps · ran into the wall",
    ],
    [
      "that ran into itself",
      () => ({ ...crashed(), crash: "self" }),
      "Score 0 · 9 steps · ran into itself",
    ],
    ["won", won, "Score 286 · 2000 steps · filled the board"],
  ])("sums up a run %s", (_, made, summary) => {
    expect(summarizeRun(made())).toBe(summary);
  });
});
