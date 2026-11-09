/**
 * Keeps a game's time between frames in fixed steps: how long a step is, the
 * most a frame takes, and the time under way toward the next.
 */
export interface Clock {
  /** How long a step is, in milliseconds. */
  readonly stepMs: number;
  /** The most steps one frame takes, however long it was. */
  readonly maxStepsPerFrame: number;
  /** The time since the last step, in milliseconds, less than a step's. */
  carried: number;
}

/** Returns a clock of steps `stepMs` long, at most `maxStepsPerFrame` a frame, with no time under way. */
export function createClock(stepMs: number, maxStepsPerFrame: number): Clock {
  return { stepMs, maxStepsPerFrame, carried: 0 };
}

/**
 * Returns how many steps a frame's time holds, at most the clock's
 * `maxStepsPerFrame`, and keeps on the clock what is left toward the next.
 *
 * A frame too long for its steps drops the rest rather than catching up
 * later, so a stall slows the game rather than leaping it on; a frame of no
 * time, less, or not a number, adds none.
 */
export function advanceClock(clock: Clock, deltaMs: number): number {
  const time = clock.carried + (deltaMs > 0 ? deltaMs : 0);
  const steps = Math.floor(time / clock.stepMs);
  if (steps > clock.maxStepsPerFrame) {
    clock.carried = 0;
    return clock.maxStepsPerFrame;
  }
  clock.carried = time - steps * clock.stepMs;
  return steps;
}

/**
 * Returns how many steps `stepMs` long a time spans, to the nearest.
 *
 * A game counts its timers in steps, as a step's time in milliseconds is
 * seldom a whole number and would creep in a sum.
 */
export function stepsIn(ms: number, stepMs: number): number {
  return Math.round(ms / stepMs);
}

/** Describes a game's steps, all of one length: a time counted in them, and a clock of them. */
export interface Stepper {
  /** How long a step is, in milliseconds. */
  readonly stepMs: number;
  /** Returns how many of the steps a time spans, to the nearest. */
  readonly stepsIn: (ms: number) => number;
  /** Returns a new clock of the steps, with no time under way. */
  readonly createClock: () => Clock;
}

/**
 * Returns a game's steps, `stepMs` long and at most `maxStepsPerFrame` a
 * frame, for its rules to bind once and count every timer by.
 */
export function createStepper(
  stepMs: number,
  maxStepsPerFrame: number,
): Stepper {
  return {
    stepMs,
    stepsIn: (ms) => stepsIn(ms, stepMs),
    createClock: () => createClock(stepMs, maxStepsPerFrame),
  };
}

/**
 * Counts frames' time up to a mark, from when it is started, and says once
 * that the mark is reached, as a card waits out the beat before it opens.
 */
export class Countdown {
  /** The time counted since it was started, or null while it is stopped. */
  private counted: number | null = null;

  /** Whether it is counting: started, and its mark not yet reached. */
  get running(): boolean {
    return this.counted !== null;
  }

  /** Starts counting from no time, whether or not it was counting. */
  start(): void {
    this.counted = 0;
  }

  /** Stops counting, so it reaches no mark until it is started again. */
  stop(): void {
    this.counted = null;
  }

  /**
   * Counts a frame's time and returns whether the count reaches `markMs`
   * now, which stops it; a stopped countdown counts nothing.
   *
   * The mark is given each frame, as a wait may change while it runs, as a
   * card's does when the player comes to prefer less motion. A frame's time
   * is counted as it comes: a negative one counts back, and one that is not
   * a number reaches the mark at once.
   */
  count(deltaMs: number, markMs: number): boolean {
    if (this.counted === null) return false;
    this.counted += deltaMs;
    if (this.counted < markMs) return false;
    this.counted = null;
    return true;
  }
}
