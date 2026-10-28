/** Names how fast the snake goes. */
export type Speed = "slow" | "normal" | "fast";

/** The speeds, slowest first. */
export const SPEEDS: readonly Speed[] = ["slow", "normal", "fast"];

/** Describes a speed: what it is called, and how long its steps last. */
export interface SpeedInfo {
  readonly name: string;
  /** How long a step lasts at the start of a run, in milliseconds. */
  readonly firstMs: number;
  /** The shortest a step gets, however long the snake grows. */
  readonly fastestMs: number;
  /** What the speed is like, for the settings. */
  readonly says: string;
}

export const SPEED_INFO: Readonly<Record<Speed, SpeedInfo>> = {
  slow: {
    name: "Slow",
    firstMs: 160,
    fastestMs: 100,
    says: "Time to think between turns.",
  },
  normal: {
    name: "Normal",
    firstMs: 125,
    fastestMs: 70,
    says: "The classic pace.",
  },
  fast: {
    name: "Fast",
    firstMs: 90,
    fastestMs: 55,
    says: "Quick from the start.",
  },
};

/** How much shorter each apple eaten makes a step, in milliseconds. */
export const QUICKENING_MS = 2;

/** Returns how long a step lasts at a speed, once a number of apples are eaten. */
export function stepMs(speed: Speed, eaten: number): number {
  const { firstMs, fastestMs } = SPEED_INFO[speed];
  return Math.max(fastestMs, firstMs - eaten * QUICKENING_MS);
}

/** Returns whether a value names a speed. */
export function isSpeed(value: unknown): value is Speed {
  return SPEEDS.includes(value as Speed);
}
