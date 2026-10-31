import {
  type Clock,
  advanceClock,
  createClock,
  progressOf,
  stepsIn,
} from "./clock";

/** How long a step of the clocks here is, in milliseconds. */
const STEP_MS = 10;

/** The most steps a frame of the clocks here takes. */
const MAX_STEPS = 4;

/** Returns a clock of {@link STEP_MS} steps, at most {@link MAX_STEPS} a frame. */
function newClock(): Clock {
  return createClock(STEP_MS, MAX_STEPS);
}

describe("createClock", () => {
  it("keeps its step and its most a frame, with no time under way", () => {
    expect(createClock(STEP_MS, MAX_STEPS)).toEqual({
      stepMs: STEP_MS,
      maxStepsPerFrame: MAX_STEPS,
      carried: 0,
    });
  });
});

describe("advanceClock", () => {
  it("takes no step before a step's time has passed", () => {
    const clock = newClock();

    const steps = advanceClock(clock, STEP_MS / 2);

    expect({ steps, carried: clock.carried }).toEqual({
      steps: 0,
      carried: STEP_MS / 2,
    });
  });

  it("takes as many steps as a frame holds", () => {
    const clock = newClock();

    const steps = advanceClock(clock, STEP_MS * 2.25);

    expect(steps).toBe(2);
  });

  it("keeps what is left toward the next step", () => {
    const clock = newClock();

    advanceClock(clock, STEP_MS * 2.25);

    expect(clock.carried).toBe(STEP_MS * 0.25);
  });

  it("adds the time a frame carries to the next", () => {
    const clock = newClock();
    advanceClock(clock, STEP_MS * 0.75);

    const steps = advanceClock(clock, STEP_MS * 0.5);

    expect(steps).toBe(1);
  });

  it("takes every step of a frame that holds as many as it may", () => {
    const clock = newClock();

    const steps = advanceClock(clock, STEP_MS * (MAX_STEPS + 0.5));

    expect({ steps, carried: clock.carried }).toEqual({
      steps: MAX_STEPS,
      carried: STEP_MS / 2,
    });
  });

  it("takes no more steps than a frame may, and drops the rest", () => {
    const clock = newClock();

    const steps = advanceClock(clock, STEP_MS * (MAX_STEPS + 1.5));

    expect({ steps, carried: clock.carried }).toEqual({
      steps: MAX_STEPS,
      carried: 0,
    });
  });

  it.each([0, -100, Number.NaN])(
    "takes no time from a frame of %f ms",
    (deltaMs) => {
      const clock = newClock();
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
    const clock = newClock();
    advanceClock(clock, STEP_MS / 4);

    expect(progressOf(clock)).toBe(0.25);
  });
});

describe("stepsIn", () => {
  it.each([
    [0, 0],
    [14, 1],
    [15, 2],
    [26, 3],
  ])("counts %i ms as %i steps", (ms, steps) => {
    expect(stepsIn(ms, STEP_MS)).toBe(steps);
  });
});
