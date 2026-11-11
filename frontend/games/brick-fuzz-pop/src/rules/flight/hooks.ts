// What a flight asks of the bricks' rules, and what they may do to it in
// turn. fly() runs a brick's trait rules at four moments: as something
// strikes it, as it breaks, as a fuzzball meets its disc and as a
// fuzzball's middle crosses into its cell; and a rule changes the flight
// only through the hooks it is handed, so a kind added later plugs in
// without touching fly().

import type { BrickTrait, TraitKind, TraitOf } from "../catalog/bricks";
import type { BreakCause, ZapPattern } from "./events";

/** Describes a strike on a brick before its hits are taken, which the brick's rules may shield it from or earth. */
export interface Struck {
  /** What strikes it: a fuzzball, a zap or a blast. */
  readonly by: BreakCause;
  /** The face or corner a fuzzball meets it at, as `SIDE`'s bits: 0 for a disc, a zap or a blast. */
  readonly side: number;
  /** The faces the brick is plated on, as `SIDE`'s bits. */
  readonly plates: number;
  /** The charge it is struck with: 0 for a plain fuzzball, a zap or a blast. */
  readonly charge: number;
  /** Whether a hot shot strikes it, whose charge nothing takes. */
  readonly hot: boolean;
  /** Whether it takes hits: true unless a rule shields it. */
  hurts: boolean;
  /** Whether it takes the fuzzball's charge: false unless a rule earths it. */
  earths: boolean;
}

/**
 * Holds what a brick's rules may do to the flight, at the moment they run.
 *
 * Each is made only at the moments it says, and throws at any other; one
 * asked for no fuzzball (-1), as for a brick a zap breaks, is ignored
 * where it says so.
 */
export interface Hooks {
  /**
   * Splits the fuzzball meeting a brick, as it breaks it or meets its disc:
   * once it has turned, two more leave from where it is, each turned from
   * its heading by the angle whose cosine and sine are given, the turn
   * counter-clockwise first, as many as `MOST_FUZZBALLS` leaves room for.
   * Ignored for no fuzzball.
   */
  split(ball: number, cell: number, cos: number, sin: number): void;
  /**
   * Sends the fuzzball crossing into a cell out of another's middle, flying
   * the same way, if that cell holds a brick in play; it then crosses into
   * no cell until it next turns.
   */
  teleport(ball: number, from: number, to: number): void;
  /**
   * Kicks the fuzzball meeting a brick, as it breaks it or meets its disc:
   * it flies on along the sum of every kick at that moment, a unit long.
   * Ignored for no fuzzball.
   */
  kick(ball: number, nx: number, ny: number): void;
  /**
   * Sets off a zap or a blast from a cell, at any moment, which lands
   * `ZAP_DELAY` later and takes `hits` off each brick its pattern reaches,
   * `reach` cells each way, the field's sides, floor and ceiling stopping
   * it first.
   */
  zap(cell: number, pattern: ZapPattern, hits: number, reach: number): void;
  /** Charges a fuzzball to the most, from the brick in a cell, at any moment; ignored for no fuzzball. */
  recharge(ball: number, cell: number): void;
  /** Frees a friend in an ink from the brick in a cell, as it breaks. */
  free(cell: number, ink: number): void;
}

/** Holds what a trait does at each moment of a flight it has a rule for. */
export interface TraitRule<T extends BrickTrait> {
  /** Runs as a fuzzball, a zap or a blast strikes the brick, before its hits are taken. */
  readonly struck?: (struck: Struck, trait: T) => void;
  /**
   * Runs as the brick breaks, by a fuzzball, numbered `ball`, or by a zap or
   * a blast, `ball` then -1, handed the brick's tint: for a cage, the ink of
   * the friend it holds.
   */
  readonly broken?: (
    hooks: Hooks,
    cell: number,
    ball: number,
    trait: T,
    tint: number,
  ) => void;
  /** Runs as a fuzzball meets the brick's disc, the way out of it `nx`, `ny`. */
  readonly met?: (
    hooks: Hooks,
    ball: number,
    nx: number,
    ny: number,
    trait: T,
  ) => void;
  /** Runs as a fuzzball's middle crosses into the brick's cell, its twin's cell given, or null. */
  readonly entered?: (
    hooks: Hooks,
    ball: number,
    cell: number,
    twin: number | null,
    trait: T,
  ) => void;
}

/** Holds every trait's rules, so a trait without its own fails to compile. */
export type TraitRules = {
  readonly [K in TraitKind]: TraitRule<TraitOf[K]>;
};
