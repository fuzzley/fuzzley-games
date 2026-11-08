import { type Run, createRun, nextWave, startWave } from "../../rules/run/run";
import { CLEARED_BUZZ, LOST_BUZZ, buzzOf } from "./haptics";

/** Returns a run with a wave under way, its first crew flying. */
function underWay(id = 1): Run {
  return startWave(createRun({ id, seed: 1, speed: "normal", wave: 1 }));
}

/** Returns a run with one ship fewer flying. */
function lessAShip(run: Run): Run {
  return { ...run, crew: { ...run.crew, flying: run.crew.flying.slice(1) } };
}

describe("buzzOf", () => {
  it("buzzes once, firmly, as the run loses a ship", () => {
    const run = underWay();

    expect(buzzOf(run, lessAShip(run))).toBe(LOST_BUZZ);
  });

  it("buzzes twice, lightly, as the run clears a wave", () => {
    const run = underWay();

    expect(buzzOf(run, { ...run, outcome: "cleared" })).toBe(CLEARED_BUZZ);
  });

  it("buzzes for a lost ship rather than the wave a blast then clears", () => {
    const run = underWay();

    expect(buzzOf(run, { ...lessAShip(run), outcome: "cleared" })).toBe(
      LOST_BUZZ,
    );
  });

  it.each([
    ["points scored", (run: Run): Run => ({ ...run, score: 40 })],
    ["a pause", (run: Run): Run => ({ ...run, outcome: "paused" })],
    [
      "a ship gained",
      (run: Run): Run => ({
        ...run,
        crew: { ...run.crew, flying: [...run.crew.flying, 3] },
      }),
    ],
    [
      "the next wave",
      (run: Run): Run => nextWave({ ...run, outcome: "cleared" }),
    ],
  ])("buzzes nothing for %s", (_, change) => {
    const run = underWay();

    expect(buzzOf(run, change(run))).toBeNull();
  });

  it("buzzes nothing as a cleared wave stays cleared", () => {
    const run: Run = { ...underWay(), outcome: "cleared" };

    expect(buzzOf(run, { ...run, score: 1_040 })).toBeNull();
  });

  it("buzzes nothing as a new run, with the first ships, takes the place of one with more", () => {
    const run = underWay(1);
    const gained: Run = {
      ...run,
      crew: { ...run.crew, flying: [...run.crew.flying, 3] },
    };

    expect(buzzOf(gained, underWay(2))).toBeNull();
  });
});
