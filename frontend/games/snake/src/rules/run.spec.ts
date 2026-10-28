import { pictureOf, runFrom } from "../testing/run_picture";
import { BOARD_SIZE } from "./arena";
import {
  type Run,
  START_LENGTH,
  createRun,
  hasEnded,
  pause,
  resume,
  step,
  turn,
} from "./run";

/** Returns a run after a number of steps. */
function steps(run: Run, count: number): Run {
  let current = run;
  for (let i = 0; i < count; i++) current = step(current);
  return current;
}

describe("createRun", () => {
  const run = createRun({ id: 7, seed: 3, speed: "fast" });

  it("lays the snake left of the middle, heading right toward an apple", () => {
    const middle = Math.floor(BOARD_SIZE / 2);

    expect({
      size: run.size,
      snake: run.snake,
      heading: run.heading,
      apple: run.apple,
    }).toEqual({
      size: BOARD_SIZE,
      snake: [
        { x: middle - 4, y: middle },
        { x: middle - 5, y: middle },
        { x: middle - 6, y: middle },
      ],
      heading: "right",
      apple: { x: middle + 4, y: middle },
    });
  });

  it("waits for the first direction, with nothing eaten", () => {
    expect({
      id: run.id,
      outcome: run.outcome,
      eaten: run.eaten,
      steps: run.steps,
      last: run.last,
      length: run.snake.length,
    }).toEqual({
      id: 7,
      outcome: "ready",
      eaten: 0,
      steps: 0,
      last: null,
      length: START_LENGTH,
    });
  });

  it("doesn't move until a direction is pressed", () => {
    expect(step(run)).toBe(run);
  });
});

describe("turn", () => {
  const playing = runFrom([".....", ".>>@.", ".....", ".....", "....*"]);

  it("starts a run waiting for its first direction", () => {
    const ready = { ...playing, outcome: "ready" as const };

    expect(turn(ready, "right")).toMatchObject({
      outcome: "playing",
      turns: [],
    });
  });

  it("starts a run with a turn", () => {
    const ready = { ...playing, outcome: "ready" as const };

    expect(turn(ready, "up")).toMatchObject({
      outcome: "playing",
      turns: ["up"],
    });
  });

  it("doesn't start a run back the way it heads", () => {
    const ready = { ...playing, outcome: "ready" as const };

    expect(turn(ready, "left")).toBe(ready);
  });

  it("queues a turn", () => {
    expect(turn(playing, "down").turns).toEqual(["down"]);
  });

  it("queues two turns, so up then left both happen", () => {
    expect(turn(turn(playing, "up"), "left").turns).toEqual(["up", "left"]);
  });

  it("queues no more than two", () => {
    const full = turn(turn(playing, "up"), "left");

    expect(turn(full, "down")).toBe(full);
  });

  it("drops a turn back the way the snake will be heading", () => {
    const up = turn(playing, "up");

    expect(turn(up, "down")).toBe(up);
  });

  it("drops a turn the way the snake will already be heading", () => {
    expect(turn(playing, "right")).toBe(playing);
  });

  it("goes on with a paused run", () => {
    const paused = pause(playing);

    expect(turn(paused, "right")).toMatchObject({
      outcome: "playing",
      turns: [],
    });
  });

  it("changes nothing once the run has ended", () => {
    const over = { ...playing, outcome: "over" as const };

    expect(turn(over, "up")).toBe(over);
  });
});

describe("step", () => {
  it("moves the snake a square the way it heads", () => {
    const run = runFrom([".....", ".>>@.", ".....", ".....", "....*"]);

    expect(pictureOf(step(run))).toEqual([
      ".....",
      "..>>@",
      ".....",
      ".....",
      "....*",
    ]);
  });

  it("takes the first turn queued, and keeps the rest", () => {
    const run = runFrom([".....", ".>>@.", ".....", ".....", "....*"], {
      turns: ["down", "right"],
    });

    const after = step(run);

    expect({
      picture: pictureOf(after),
      heading: after.heading,
      turns: after.turns,
    }).toEqual({
      picture: [".....", "..>v.", "...@.", ".....", "....*"],
      heading: "down",
      turns: ["right"],
    });
  });

  it("counts the step and says it moved", () => {
    const run = runFrom([".....", ".>>@.", ".....", ".....", "....*"]);

    expect(step(run)).toMatchObject({ steps: 1, last: "moved" });
  });

  it("grows the snake by a square when it eats, and lays another apple", () => {
    const run = runFrom([".....", ".>>@*", ".....", ".....", "....."]);

    const after = step(run);

    expect({
      length: after.snake.length,
      eaten: after.eaten,
      last: after.last,
      apple: after.apple === null,
      outcome: after.outcome,
    }).toEqual({
      length: 4,
      eaten: 1,
      last: "ate",
      apple: false,
      outcome: "playing",
    });
  });

  it("lays the new apple off the snake", () => {
    const run = runFrom([">>@*", "....", "....", "...."]);

    const after = step(run);

    expect(after.snake).not.toContainEqual(after.apple);
  });

  it("crashes into the wall", () => {
    const run = runFrom(["....", ".>>@", "....", "...*"]);

    const after = step(run);

    expect({
      outcome: after.outcome,
      crash: after.crash,
      last: after.last,
      snake: after.snake,
      ended: hasEnded(after),
    }).toEqual({
      outcome: "over",
      crash: "wall",
      last: "crashed",
      snake: run.snake,
      ended: true,
    });
  });

  it("crashes into itself", () => {
    const run = runFrom(
      ["......", ".>>>v.", "...@<.", "......", ".....*", "......"],
      { heading: "up" },
    );

    expect(step(run)).toMatchObject({ outcome: "over", crash: "self" });
  });

  it("moves onto the square the tail is leaving", () => {
    const loop = runFrom([".....", ".v<..", ".>@..", ".....", "....*"], {
      heading: "up",
    });

    const after = step(loop);

    expect({ outcome: after.outcome, head: after.snake[0] }).toEqual({
      outcome: "playing",
      head: { x: 2, y: 1 },
    });
  });

  it("wins once the snake fills the board", () => {
    const nearlyFull = runFrom(["v>v", ">^v", "*@<"]);

    const after = step(nearlyFull);

    expect({
      outcome: after.outcome,
      last: after.last,
      apple: after.apple,
      length: after.snake.length,
    }).toEqual({ outcome: "won", last: "won", apple: null, length: 9 });
  });

  it("does nothing to a run that isn't under way", () => {
    const run = runFrom([".....", ".>>@.", ".....", ".....", "....*"], {
      outcome: "paused",
    });

    expect(step(run)).toBe(run);
  });

  it("lays the same apples for the same seed played the same way", () => {
    const run = createRun({ id: 1, seed: 42, speed: "normal" });
    const play = (): Run => steps(turn(run, "right"), 8);

    expect(play().apple).toEqual(play().apple);
  });
});

describe("pause and resume", () => {
  const playing = runFrom([".....", ".>>@.", ".....", ".....", "....*"]);

  it("pauses a run under way, and resumes it", () => {
    expect([pause(playing).outcome, resume(pause(playing)).outcome]).toEqual([
      "paused",
      "playing",
    ]);
  });

  it("pauses only a run under way", () => {
    const ready = { ...playing, outcome: "ready" as const };

    expect(pause(ready)).toBe(ready);
  });

  it("resumes only a paused run", () => {
    expect(resume(playing)).toBe(playing);
  });
});
