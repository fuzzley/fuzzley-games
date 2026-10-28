import { runFrom } from "../testing/run_picture";
import { BOARD_SIZE } from "./arena";
import { type Run, createRun, step, turn } from "./run";
import { type SavedRun, restoreRun, saveRun } from "./saved_run";

/** Returns a run under way on the full board, some steps in. */
function underWay(): Run {
  let run = turn(createRun({ id: 1, seed: 5, speed: "fast" }), "up");
  for (let i = 0; i < 3; i++) run = step(run);
  return turn(run, "right");
}

/** Returns a run under way as storage keeps it, with some of it changed. */
function savedWith(change: Record<string, unknown>): unknown {
  return { ...saveRun(underWay()), ...change };
}

describe("saveRun", () => {
  it("keeps a run under way", () => {
    expect(saveRun(underWay())).toEqual({
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
    });
  });

  it.each(["ready", "over", "won"] as const)("keeps no %s run", (outcome) => {
    expect(saveRun({ ...underWay(), outcome })).toBeNull();
  });

  it("keeps no run without an apple", () => {
    expect(saveRun({ ...underWay(), apple: null })).toBeNull();
  });
});

describe("restoreRun", () => {
  it("takes a kept run up again, paused, under a new id, with no last step to show", () => {
    const run = underWay();

    expect(restoreRun(saveRun(run), 9)).toEqual({
      ...run,
      id: 9,
      outcome: "paused",
      last: null,
    });
  });

  it("takes up a run as long as its apples say", () => {
    const run = runFrom(
      [
        "................@",
        "................^",
        "................^",
        "................^",
        ...Array.from({ length: BOARD_SIZE - 5 }, () => ".".repeat(BOARD_SIZE)),
        "*................",
      ],
      { heading: "up", outcome: "paused" },
    );

    expect(restoreRun(saveRun(run), 2)?.eaten).toBe(1);
  });

  it.each<[string, Record<string, unknown>]>([
    ["nothing kept", {}],
    [
      "a snake off the board",
      {
        snake: [
          [4, 5],
          [4, 6],
          [4, 17],
        ],
      },
    ],
    [
      "a snake in pieces",
      {
        snake: [
          [4, 5],
          [4, 6],
          [4, 8],
        ],
      },
    ],
    [
      "a snake crossing itself",
      {
        snake: [
          [4, 5],
          [4, 6],
          [4, 5],
        ],
      },
    ],
    ["a square that isn't one", { snake: [[4, 5], [4, 6], [4]] }],
    [
      "a square of words",
      {
        snake: [
          [4, 5],
          [4, 6],
          ["4", 7],
        ],
      },
    ],
    ["a snake that isn't a list", { snake: "long" }],
    ["a head heading back into it", { heading: "down" }],
    ["a heading that isn't one", { heading: "north" }],
    ["a turn back", { turns: ["left", "right"] }],
    ["a turn the way it heads", { turns: ["up"] }],
    ["too many turns", { turns: ["left", "up", "right"] }],
    ["turns that aren't", { turns: ["sideways"] }],
    ["turns that aren't a list", { turns: "left" }],
    ["an apple under the snake", { apple: [4, 6] }],
    ["an apple off the board", { apple: [20, 6] }],
    ["a speed that isn't one", { speed: "ludicrous" }],
    ["a seed that isn't whole", { seed: 1.5 }],
    ["apples that don't match its length", { eaten: 4 }],
    ["apples below none", { eaten: -1 }],
    ["steps below none", { steps: -1 }],
  ])("drops %s", (_, change) => {
    const kept = Object.keys(change).length === 0 ? null : savedWith(change);

    expect(restoreRun(kept, 1)).toBeNull();
  });

  it("drops a snake eaten to nothing", () => {
    expect(restoreRun(savedWith({ snake: [], eaten: -3 }), 1)).toBeNull();
  });

  it("is typed as what storage keeps", () => {
    const kept: SavedRun | null = saveRun(underWay());

    expect(kept?.snake.length).toBe(3);
  });
});
