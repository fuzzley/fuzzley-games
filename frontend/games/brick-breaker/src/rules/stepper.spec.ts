import { STEP_MS, advanceClock, createClock, progressOf } from "./stepper";
import { MAX_STEPS_PER_FRAME } from "./tuning";

describe("advanceClock", () => {
  it("takes no step before a step's time has passed", () => {
    const clock = createClock();

    const steps = advanceClock(clock, STEP_MS / 2);

    expect([steps, clock.carried]).toEqual([0, STEP_MS / 2]);
  });

  it("takes as many steps as a frame holds, keeping what is left", () => {
    const clock = createClock();

    // Two steps and a quarter of a third.
    const steps = advanceClock(clock, STEP_MS * 2.25);

    expect([steps, Math.round((clock.carried / STEP_MS) * 100)]).toEqual([
      2, 25,
    ]);
  });

  it("adds the time a frame carries to the next", () => {
    const clock = createClock();
    advanceClock(clock, STEP_MS * 0.75);

    const steps = advanceClock(clock, STEP_MS * 0.5);

    expect(steps).toBe(1);
  });

  it("takes no more steps than a frame may, and drops the rest", () => {
    const clock = createClock();

    const steps = advanceClock(clock, 1000);

    expect([steps, clock.carried]).toEqual([MAX_STEPS_PER_FRAME, 0]);
  });

  it("takes no time back from a frame that went backward", () => {
    const clock = createClock();
    advanceClock(clock, STEP_MS / 2);

    const steps = advanceClock(clock, -100);

    expect([steps, clock.carried]).toEqual([0, STEP_MS / 2]);
  });
});

describe("progressOf", () => {
  it("is how far the clock is toward its next step", () => {
    const clock = createClock();
    advanceClock(clock, STEP_MS / 4);

    expect(progressOf(clock)).toBeCloseTo(0.25);
  });
});
