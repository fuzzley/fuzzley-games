import {
  type Clock,
  Countdown,
  advanceClock,
  createClock,
  createStepper,
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

/** The mark the countdowns here count up to, in milliseconds. */
const MARK_MS = 300;

/** Returns a countdown started, with no time counted. */
function started(): Countdown {
  const countdown = new Countdown();
  countdown.start();
  return countdown;
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

describe("createStepper", () => {
  it("keeps its step", () => {
    expect(createStepper(STEP_MS, MAX_STEPS).stepMs).toBe(STEP_MS);
  });

  it.each([
    [14, 1],
    [15, 2],
  ])("counts %i ms as %i of its steps, to the nearest", (ms, steps) => {
    const stepper = createStepper(STEP_MS, MAX_STEPS);

    expect(stepper.stepsIn(ms)).toBe(steps);
  });

  it("makes a clock of its step and its most a frame, with no time under way", () => {
    const stepper = createStepper(STEP_MS, MAX_STEPS);

    expect(stepper.createClock()).toEqual({
      stepMs: STEP_MS,
      maxStepsPerFrame: MAX_STEPS,
      carried: 0,
    });
  });

  it("makes a new clock each time, so no clock's time carries to another", () => {
    const stepper = createStepper(STEP_MS, MAX_STEPS);
    const first = stepper.createClock();
    advanceClock(first, STEP_MS / 2);

    const second = stepper.createClock();

    expect(second.carried).toBe(0);
  });
});

describe("Countdown", () => {
  describe("count", () => {
    it("says nothing is reached before it is started", () => {
      const countdown = new Countdown();

      expect(countdown.count(1000, 0)).toBe(false);
    });

    it("counts toward its mark", () => {
      const countdown = started();

      expect(countdown.count(MARK_MS / 3, MARK_MS)).toBe(false);
    });

    it("says its mark is reached once the time counted reaches it, and once only", () => {
      const countdown = started();
      countdown.count(MARK_MS / 3, MARK_MS);

      const reached = [
        countdown.count((MARK_MS * 2) / 3, MARK_MS),
        countdown.count(MARK_MS, MARK_MS),
      ];

      expect(reached).toEqual([true, false]);
    });

    it("counts up to the mark a frame gives, though the last gave another", () => {
      const countdown = started();
      countdown.count(MARK_MS / 2, MARK_MS);

      expect(countdown.count(0, MARK_MS / 2)).toBe(true);
    });

    it("counts the whole time again once it is started again", () => {
      const countdown = started();
      countdown.count(MARK_MS / 2, MARK_MS);

      countdown.start();

      expect(countdown.count(MARK_MS / 2, MARK_MS)).toBe(false);
    });

    it("counts a frame of negative time back", () => {
      const countdown = started();
      countdown.count(-MARK_MS / 3, MARK_MS);

      expect(countdown.count(MARK_MS, MARK_MS)).toBe(false);
    });

    it("reaches its mark at once on a frame whose time is not a number", () => {
      const countdown = started();

      expect(countdown.count(Number.NaN, MARK_MS)).toBe(true);
    });

    it("reaches no mark once stopped", () => {
      const countdown = started();

      countdown.stop();

      expect(countdown.count(MARK_MS, MARK_MS)).toBe(false);
    });
  });

  describe("running", () => {
    it("is false before it is started", () => {
      expect(new Countdown().running).toBe(false);
    });

    it("is true once it is started, until its mark is reached", () => {
      const countdown = started();

      countdown.count(MARK_MS / 2, MARK_MS);

      expect(countdown.running).toBe(true);
    });

    it("is false once its mark is reached", () => {
      const countdown = started();

      countdown.count(MARK_MS, MARK_MS);

      expect(countdown.running).toBe(false);
    });

    it("is false once it is stopped", () => {
      const countdown = started();

      countdown.stop();

      expect(countdown.running).toBe(false);
    });
  });
});
