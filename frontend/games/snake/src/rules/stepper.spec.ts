import { runFrom } from "../testing/run_picture";
import { type Run, pause } from "./run";
import { advance } from "./stepper";

/** A run at Normal speed, whose first step lasts 125 ms. */
function playing(): Run {
  return runFrom([
    "..........",
    ".>>@......",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    ".........*",
  ]);
}

describe("advance", () => {
  it("takes no step before a step's time has passed", () => {
    const run = playing();

    const after = advance({ run, carried: 0 }, 50);

    expect({
      steps: after.run.steps,
      carried: after.carried,
      progress: after.progress,
    }).toEqual({
      steps: 0,
      carried: 50,
      progress: 0.4,
    });
  });

  it("takes a step once its time has passed, and carries the rest", () => {
    const after = advance({ run: playing(), carried: 100 }, 50);

    expect({ steps: after.run.steps, carried: after.carried }).toEqual({
      steps: 1,
      carried: 25,
    });
  });

  it("takes at most two steps in a frame, dropping the time left over", () => {
    const after = advance({ run: playing(), carried: 0 }, 1000);

    expect({
      steps: after.run.steps,
      carried: after.carried,
      progress: after.progress,
    }).toEqual({
      steps: 2,
      carried: 0,
      progress: 0,
    });
  });

  it("keeps no time for a run that isn't under way", () => {
    const after = advance({ run: pause(playing()), carried: 80 }, 50);

    expect({
      steps: after.run.steps,
      carried: after.carried,
      progress: after.progress,
    }).toEqual({
      steps: 0,
      carried: 0,
      progress: 0,
    });
  });

  it("stops at a crash", () => {
    const run = runFrom(["....", ".>>@", "....", "...*"]);

    const after = advance({ run, carried: 0 }, 1000);

    expect({ outcome: after.run.outcome, steps: after.run.steps }).toEqual({
      outcome: "over",
      steps: 1,
    });
  });

  it("times each step at the speed the snake has reached", () => {
    const run = runFrom([".....", ".>>@*", ".....", ".....", "....."], {
      eaten: 10,
    });

    // 105 ms a step at ten apples, 103 at eleven.
    const after = advance({ run, carried: 0 }, 105 + 102);

    expect({ steps: after.run.steps, carried: after.carried }).toEqual({
      steps: 1,
      carried: 102,
    });
  });

  it("ignores a frame that goes back in time", () => {
    expect(advance({ run: playing(), carried: 30 }, -10).carried).toBe(30);
  });
});
