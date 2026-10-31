/** The speeds a run is played at, slowest first. */
export const SPEEDS = ["relaxed", "normal", "fast"] as const;

/**
 * Names a speed the player picks: how fast the rocks and the comets go, and
 * how often a wave sends a comet or lets a pickup go.
 */
export type Speed = (typeof SPEEDS)[number];

/** Describes a speed: what it is called, and how it sets a wave's dangers and gifts. */
export interface SpeedInfo {
  readonly name: string;
  /** How fast the rocks and the comets move, against Normal's. */
  readonly motion: number;
  /**
   * How often a comet comes, against Normal's, so a wave's time between two
   * is divided by it.
   */
  readonly cometRate: number;
  /** The chance that a broken rock lets a pickup go, against Normal's. */
  readonly drops: number;
  /** What the speed is like, for the settings. */
  readonly says: string;
}

/** Each speed. */
export const SPEED_INFO: Readonly<Record<Speed, SpeedInfo>> = {
  relaxed: {
    name: "Relaxed",
    motion: 0.8,
    cometRate: 0.5,
    drops: 1.25,
    says: "Slower rocks, fewer and slower comets, and more pickups.",
  },
  normal: {
    name: "Normal",
    motion: 1,
    cometRate: 1,
    drops: 1,
    says: "The classic pace.",
  },
  fast: {
    name: "Fast",
    motion: 1.2,
    cometRate: 1,
    drops: 1,
    says: "Quicker rocks and comets.",
  },
};

/** Returns whether a value names a speed. */
export function isSpeed(value: unknown): value is Speed {
  return SPEEDS.some((speed) => speed === value);
}
