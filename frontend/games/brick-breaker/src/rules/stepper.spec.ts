import { STEP_MS, advanceClock, createClock, progressOf } from "./stepper";
import { MAX_STEPS_PER_FRAME } from "./tuning";

describe("advanceClock", () => {
  it("takes no step before a step's time has passed", () => {
    const clock = createClock();

    const steps = advanceClock(clock, STEP_MS / 2);

    expect({ steps, carried: clock.carried }).toEqual({
      steps: 0,
      carried: STEP_MS / 2,
    });
  });

  it("takes as many steps as a frame holds", () => {
    const clock = createClock();

    const steps = advanceClock(clock, STEP_MS * 2.25);

    expect(steps).toBe(2);
  });

  it("keeps what is left toward the next step", () => {
    const clock = createClock();

    advanceClock(clock, STEP_MS * 2.25);

    expect(progressOf(clock)).toBeCloseTo(0.25);
  });

  it("adds the time a frame carries to the next", () => {
    const clock = createClock();
    advanceClock(clock, STEP_MS * 0.75);

    const steps = advanceClock(clock, STEP_MS * 0.5);

    expect(steps).toBe(1);
  });

  it("takes every step of a frame that holds as many as it may", () => {
    const clock = createClock();

    const steps = advanceClock(clock, STEP_MS * (MAX_STEPS_PER_FRAME + 0.5));

    expect({ steps, progress: progressOf(clock) }).toEqual({
      steps: MAX_STEPS_PER_FRAME,
      progress: expect.closeTo(0.5) as number,
    });
  });

  it("takes no more steps than a frame may, and drops the rest", () => {
    const clock = createClock();

    const steps = advanceClock(clock, STEP_MS * (MAX_STEPS_PER_FRAME + 1));

    expect({ steps, carried: clock.carried }).toEqual({
      steps: MAX_STEPS_PER_FRAME,
      carried: 0,
    });
  });

  it.each([-100, Number.NaN])(
    "takes no time from a frame of %f ms",
    (deltaMs) => {
      const clock = createClock();
      advanceClock(clock, STEP_MS / 2);

      const steps = advanceClock(clock, deltaMs);

      expect({ steps, carried: clock.carried }).toEqual({
        steps: 0,
        carried: STEP_MS / 2,
      });
    },
  );
});

describe("progressOf", () => {
  it("is how far the clock is toward its next step", () => {
    const clock = createClock();
    advanceClock(clock, STEP_MS / 4);

    expect(progressOf(clock)).toBeCloseTo(0.25);
  });
});
