import { runFrom } from "../testing/run_picture";
import {
  describeEnd,
  describePause,
  describeResume,
  describeStart,
} from "./describe";

const run = runFrom(["@<<<<", ".....", ".....", ".....", "....*"], {
  speed: "slow",
});

describe("describe", () => {
  it("names the speed a run starts at", () => {
    expect(describeStart(run)).toBe("Started at Slow speed.");
  });

  it("gives the score as a run pauses", () => {
    expect(describePause(run)).toBe("Paused. Score 2. Press Space to resume.");
  });

  it("says a run goes on", () => {
    expect(describeResume()).toBe("Resumed.");
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
      "You filled the board. Score 2. New best.",
    ],
  ] as const)("says why a run ended (%o)", (end, newBest, said) => {
    expect(describeEnd({ ...run, ...end }, newBest)).toBe(said);
  });
});
