import { isKeyOf, keysOf } from "@fz/core/records";
import type { ZapPattern } from "../flight/events";
import { SPARKS_KINDS } from "./kinds/sparks";
import { THICK_WALL_KINDS } from "./kinds/thick_walls";
import { TRICKS_KINDS } from "./kinds/tricks";
import { WARM_UP_KINDS } from "./kinds/warm_up";

/** Names something a brick does beyond taking hits, with its settings. */
export type BrickTrait =
  /** Never breaks, so a level doesn't need it: steel, a bumper, a portal. */
  | { readonly kind: "never" }
  /** Takes the charge of a fuzzball that strikes it, but a hot shot's: steel, a plate, a bumper. */
  | { readonly kind: "earths" }
  /**
   * As it breaks, zaps or blasts the bricks its pattern reaches, `reach`
   * cells each way, the field's sides and ceiling stopping it first, taking
   * `hits` off each.
   */
  | {
      readonly kind: "zaps";
      readonly pattern: ZapPattern;
      readonly hits: number;
      readonly reach: number;
    }
  /** Charges the fuzzball that breaks it to the most: wool. */
  | { readonly kind: "recharges" }
  /** Frees a friend as it breaks: a cage. */
  | { readonly kind: "frees" }
  /** Kicks a fuzzball straight away from its middle, a disc of `radius`: a bumper. */
  | { readonly kind: "kicks"; readonly radius: number }
  /**
   * Splits the fuzzball that breaks it into three, the two more turned by
   * the angle whose cosine and sine are written out: a prism, at 30°.
   */
  | { readonly kind: "splits"; readonly cos: number; readonly sin: number }
  /** Sends a fuzzball whose middle crosses into it out of its twin: a portal. */
  | { readonly kind: "teleports" }
  /** Plated on the faces its brick's plates name: a strike there does nothing and earths. */
  | { readonly kind: "plated" }
  /** Hurt only by charge, a zap or a blast: a plain fuzzball turns off it. */
  | { readonly kind: "shelled" }
  /** Grows a hit back after each round it survives, to its full hits: moss. */
  | { readonly kind: "regrows" };

/** A brick trait's kind, such as "zaps". */
export type TraitKind = BrickTrait["kind"];

/** Each brick trait, by its kind. */
export type TraitOf = {
  readonly [K in TraitKind]: Extract<BrickTrait, { readonly kind: K }>;
};

/** Describes a kind of brick: what breaking it takes, and what it does. */
export interface BrickKind {
  /** Names it in How to play, such as "Steel brick". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** How many hits break it, the fewest a level's legend gives it, or "never". */
  readonly hits: number | "never";
  /** The most hits a level's legend may give it: 0 for one that never breaks. */
  readonly mostHits: number;
  /** Whether a level needs it broken to be cleared. */
  readonly needed: boolean;
  /**
   * What it scores as it breaks, for each hit it had when whole, before the
   * streak's multiplier: plan.md's 50 for a cage of two hits is 25 here.
   */
  readonly points: number;
  /** Whether it stops a fuzzball: a portal doesn't. */
  readonly solid: boolean;
  /** The number of the level that introduces it, which no level before uses it. */
  readonly firstLevel: number;
  /** What it does beyond taking hits. */
  readonly traits: readonly BrickTrait[];
}

/**
 * Every kind of brick a level can hold, by id, in How to play's order, each
 * set's from its own file so the sets' kinds are added side by side.
 */
export const BRICK_KINDS = {
  ...WARM_UP_KINDS,
  ...SPARKS_KINDS,
  ...TRICKS_KINDS,
  ...THICK_WALL_KINDS,
} as const satisfies Readonly<Record<string, BrickKind>>;

/** A brick kind's id, such as "steel". */
export type BrickKindId = keyof typeof BRICK_KINDS;

/** Every brick kind's id, in How to play's order. */
export const BRICK_KIND_IDS = keysOf(BRICK_KINDS);

/** Returns a brick kind, as the shape every kind has. */
export function brickKind(id: BrickKindId): BrickKind {
  return BRICK_KINDS[id];
}

/** Returns whether a value names a brick kind. */
export function isBrickKindId(value: unknown): value is BrickKindId {
  return isKeyOf(value, BRICK_KINDS);
}

/** Returns whether a brick kind has a trait of a kind. */
export function hasTrait(id: BrickKindId, kind: TraitKind): boolean {
  return brickKind(id).traits.some((trait) => trait.kind === kind);
}
