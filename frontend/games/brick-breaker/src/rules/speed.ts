import { CLIMB } from "./tuning";

/** Names how fast the ball goes. */
export type Speed = "relaxed" | "normal" | "fast" | "custom";

/** The speeds whose ball's speed the game sets, slowest first: all but Custom. */
export const PRESET_SPEEDS: readonly Speed[] = ["relaxed", "normal", "fast"];

/** The speeds: the preset ones, slowest first, then Custom, the player's own. */
export const SPEEDS: readonly Speed[] = [...PRESET_SPEEDS, "custom"];

/**
 * How fast a Custom run's ball may go, as a whole percent of Normal's, and
 * the steps the player sets it in.
 */
export const CUSTOM_PERCENT = { least: 50, most: 200, step: 5 } as const;

/** Describes a speed: what it is called, how fast the ball goes, and what falls. */
export interface SpeedInfo {
  readonly name: string;
  /** The ball's speed as a level starts, in units a second. */
  readonly base: number;
  /** The fastest the ball climbs to, in units a second. */
  readonly top: number;
  /** Whether capsules that hinder the player may fall. */
  readonly badCapsules: boolean;
  /** What the speed is like, for the settings. */
  readonly says: string;
}

const NORMAL: SpeedInfo = {
  name: "Normal",
  base: 25,
  top: 37.5,
  badCapsules: true,
  says: "The classic pace.",
};

/** Each speed; Custom's ball goes at the player's percent of Normal's ({@link customFactor}). */
export const SPEED_INFO: Readonly<Record<Speed, SpeedInfo>> = {
  relaxed: {
    name: "Relaxed",
    base: 20,
    top: 30,
    badCapsules: false,
    says: "A slower ball, and no capsule that makes it harder.",
  },
  normal: NORMAL,
  fast: {
    name: "Fast",
    base: 30,
    top: 45,
    badCapsules: true,
    says: "Quick from the first serve.",
  },
  custom: {
    ...NORMAL,
    name: "Custom",
    says: "The ball at the speed you set.",
  },
};

/**
 * Returns the ball's speed, in units a second: the speed's base, climbed by
 * a share of it for each brick hit up to its top, times the level's pace and
 * a capsule's scale, which may take it past the top.
 */
export function ballSpeed(
  speed: Speed,
  pace: number,
  climbed: number,
  scale = 1,
): number {
  const { base, top } = SPEED_INFO[speed];
  return Math.min(top, base * (1 + CLIMB * climbed)) * pace * scale;
}

/**
 * Returns the factor a run at a speed takes on its ball's speed: the
 * player's percent of Normal's, at Custom, and 1 at any other.
 */
export function customFactor(speed: Speed, percent: number): number {
  return speed === "custom" ? percent / 100 : 1;
}

/** Returns whether a value names a speed. */
export function isSpeed(value: unknown): value is Speed {
  return SPEEDS.includes(value as Speed);
}

/** Returns whether a value is a percent a player may set Custom's speed to. */
export function isCustomPercent(value: unknown): value is number {
  const { least, most, step } = CUSTOM_PERCENT;
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= least &&
    value <= most &&
    (value - least) % step === 0
  );
}
