import { CLIMB } from "./tuning";

/** Names how fast the ball goes. */
export type Speed = "relaxed" | "normal" | "fast";

/** The speeds, slowest first. */
export const SPEEDS: readonly Speed[] = ["relaxed", "normal", "fast"];

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

export const SPEED_INFO: Readonly<Record<Speed, SpeedInfo>> = {
  relaxed: {
    name: "Relaxed",
    base: 16,
    top: 24,
    badCapsules: false,
    says: "A slower ball, and no capsule that makes it harder.",
  },
  normal: {
    name: "Normal",
    base: 20,
    top: 30,
    badCapsules: true,
    says: "The classic pace.",
  },
  fast: {
    name: "Fast",
    base: 24,
    top: 36,
    badCapsules: true,
    says: "Quick from the first serve.",
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

/** Returns whether a value names a speed. */
export function isSpeed(value: unknown): value is Speed {
  return SPEEDS.includes(value as Speed);
}
