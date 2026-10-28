import { runFrom } from "../testing/run_picture";
import {
  describeEnd,
  describePause,
  describeResume,
  describeStart,
  describeTakenUp,
} from "./describe";

const run = runFrom(["@<<<<", ".....", ".....", ".....", "....*"], {
  speed: "slow",
});

describe("describe", () => {
  it("names the speed a run starts at", () => {
    expect(describeStart(run)).toBe("Started, at Slow speed.");
  });

  it("gives the score as a run pauses", () => {
    expect(describePause(run)).toBe(
      "Paused, with a score of 2. Press a direction to go on.",
    );
  });

  it("says a run goes on", () => {
    expect(describeResume()).toBe("Going on.");
  });

  it("says a run was taken up paused", () => {
    expect(describeTakenUp(run)).toBe(
      "Your last run is paused, with a score of 2. Press a direction to go on.",
    );
  });

  it.each([
    [
      { outcome: "over", crash: "wall" },
      false,
      "The snake ran into the wall. Score 2.",
    ],
    [
      { outcome: "over", crash: "self" },
      false,
      "The snake ran into itself. Score 2.",
    ],
    [
      { outcome: "won", crash: null },
      true,
      "You filled the board! Score 2. A new best!",
    ],
  ] as const)("says why a run ended (%o)", (end, newBest, said) => {
    expect(describeEnd({ ...run, ...end }, newBest)).toBe(said);
  });
});
