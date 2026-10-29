import type { BallKindId } from "./balls";

/**
 * Names what catching a capsule does.
 *
 * Its kind is its group: catching one replaces whatever of its kind is in
 * effect, so two never run at once.
 */
export type CapsuleEffect =
  /** The paddle grows or shrinks to a width, for a time. */
  | {
      readonly kind: "paddle-size";
      readonly width: number;
      readonly ms: number;
    }
  /** The paddle catches the balls, or fires bolts, for a time. */
  | {
      readonly kind: "paddle-mode";
      readonly mode: "catch" | "laser";
      readonly ms: number;
    }
  /** Every ball in play becomes a kind of ball, for a time. */
  | { readonly kind: "ball"; readonly ball: BallKindId; readonly ms: number }
  /**
   * The balls go at a share of their speed, and climb at a share of the
   * rate, from the base if `fromBase`, for a time.
   */
  | {
      readonly kind: "pace";
      readonly scale: number;
      readonly climb: number;
      readonly fromBase: boolean;
      readonly ms: number;
    }
  /** Every ball in play splits into `into`, `spreadDeg` apart. */
  | {
      readonly kind: "split";
      readonly into: number;
      readonly spreadDeg: number;
    }
  /** One more life. */
  | { readonly kind: "life" }
  /** A net under the paddle turns back the next ball that falls. */
  | { readonly kind: "net" };

/** An effect's kind, which is its group. */
export type EffectKind = CapsuleEffect["kind"];

/** What the paddle can do beyond turning the balls, as a capsule says. */
export type PaddleMode = Extract<
  CapsuleEffect,
  { readonly kind: "paddle-mode" }
>["mode"];

/** Describes a capsule: what it does, and when it may fall. */
export interface Capsule {
  /** Names it, in How to play and as it is caught, such as "Wide paddle". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** Whether it helps the player or hinders them; Relaxed drops no bad one. */
  readonly tone: "good" | "bad";
  /** How likely it is to be drawn, against the others in the pool. */
  readonly weight: number;
  /** The first level whose pool it joins. */
  readonly from: number;
  /** What catching it does. */
  readonly effect: CapsuleEffect;
}

/** Every capsule, by id, in How to play's order. */
export const CAPSULES = {
  wide: {
    name: "Wide paddle",
    about: "The paddle grows half as wide again for 20 seconds.",
    tone: "good",
    weight: 10,
    from: 2,
    effect: { kind: "paddle-size", width: 6, ms: 20_000 },
  },
  multi: {
    name: "Multiball",
    about: "Every ball in play splits into three.",
    tone: "good",
    weight: 8,
    from: 2,
    effect: { kind: "split", into: 3, spreadDeg: 25 },
  },
  slow: {
    name: "Slow ball",
    about:
      "The balls drop to their first speed, and speed up half as fast, for 15 seconds.",
    tone: "good",
    weight: 8,
    from: 2,
    effect: { kind: "pace", scale: 1, climb: 0.5, fromBase: true, ms: 15_000 },
  },
  life: {
    name: "Extra life",
    about: "One more life, up to six.",
    tone: "good",
    weight: 1,
    from: 5,
    effect: { kind: "life" },
  },
  catch: {
    name: "Catch",
    about:
      "For 20 seconds, a ball that lands on the paddle waits there, for 3 seconds at most, until launched.",
    tone: "good",
    weight: 6,
    from: 6,
    effect: { kind: "paddle-mode", mode: "catch", ms: 20_000 },
  },
  net: {
    name: "Net",
    about: "A line under the paddle turns back the next ball that falls.",
    tone: "good",
    weight: 4,
    from: 8,
    effect: { kind: "net" },
  },
  laser: {
    name: "Laser",
    about:
      "Launching fires a bolt from each end of the paddle, for 12 seconds.",
    tone: "good",
    weight: 5,
    from: 9,
    effect: { kind: "paddle-mode", mode: "laser", ms: 12_000 },
  },
  narrow: {
    name: "Narrow paddle",
    about: "The paddle shrinks to two thirds of its width for 15 seconds.",
    tone: "bad",
    weight: 5,
    from: 11,
    effect: { kind: "paddle-size", width: 2.6, ms: 15_000 },
  },
  fire: {
    name: "Fire ball",
    about: "The balls burn through every brick that can break, for 10 seconds.",
    tone: "good",
    weight: 4,
    from: 12,
    effect: { kind: "ball", ball: "fire", ms: 10_000 },
  },
  fast: {
    name: "Fast ball",
    about: "The balls go a quarter faster for 12 seconds.",
    tone: "bad",
    weight: 4,
    from: 14,
    effect: {
      kind: "pace",
      scale: 1.25,
      climb: 1,
      fromBase: false,
      ms: 12_000,
    },
  },
  blast: {
    name: "Blast ball",
    about: "Each brick the balls hit hits the eight around it, for 12 seconds.",
    tone: "good",
    weight: 4,
    from: 15,
    effect: { kind: "ball", ball: "blast", ms: 12_000 },
  },
} as const satisfies Readonly<Record<string, Capsule>>;

/** A capsule's id, such as "wide". */
export type CapsuleId = keyof typeof CAPSULES;

/** Every capsule's id, in How to play's order. */
// Object.keys() types its keys as strings; the catalog's keys are its ids.
export const CAPSULE_IDS = Object.keys(CAPSULES) as readonly CapsuleId[];

/** Returns a capsule, as the shape every capsule has. */
export function capsule(id: CapsuleId): Capsule {
  return CAPSULES[id];
}

/** Returns whether a value names a capsule. */
export function isCapsuleId(value: unknown): value is CapsuleId {
  return typeof value === "string" && Object.hasOwn(CAPSULES, value);
}
