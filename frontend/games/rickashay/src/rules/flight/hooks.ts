// What a flight asks of the bricks' rules. fly() runs a brick's trait rules
// at four moments: as a turn strikes it, as it breaks, as the fuzzball
// meets it, and as the fuzzball's middle crosses into its eye; so a kind
// brought in later plugs in through its traits' rules without touching
// fly().

import type { Brick, TraitKind } from "../catalog/kinds";
import type { Shield } from "./events";

/** Describes a strike on a brick before its hits are taken, which the brick's rules may shield it from. */
export interface Struck {
  /** The brick's wall cell. */
  readonly cell: number;
  /** The brick as it stood as the shot was released: its hits are those it had then. */
  readonly brick: Brick;
  /**
   * The sides of its cell that its faces that turned the fuzzball lie
   * along, as `FieldFace` bits: a flat's side, both sides of a cut corner,
   * and none for a long 45° face, which lies along no side; or, where none
   * of its faces turned it, as at a cut met beside another brick's flat,
   * those of every face of it the moment met.
   */
  readonly sides: number;
  /** What shields it, so the turn takes nothing: null, for a strike, unless a rule sets it. */
  shield: Shield | null;
}

/** Holds what a trait does at each moment of a flight it has a rule for, each moment's rules running in the order of its kind's traits. */
export interface TraitRule {
  /** Runs as a turn strikes a brick of a kind that breaks, before its hits are taken. */
  readonly struck?: (struck: Struck) => void;
  /** Runs as a strike breaks the brick in a wall cell, after its strike. */
  readonly broken?: (cell: number, brick: Brick) => void;
  /** Runs as the fuzzball meets the brick in a wall cell at a turn, after any strike, whether it struck it or not. */
  readonly met?: (cell: number, brick: Brick) => void;
  /** Runs as the fuzzball's middle crosses into the eye of the brick in a wall cell. */
  readonly entered?: (cell: number, brick: Brick) => void;
}

/** Holds every trait's rule, so a trait without one fails to compile. */
export type TraitRules = Readonly<Record<TraitKind, TraitRule>>;
