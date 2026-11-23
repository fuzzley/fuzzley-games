// What a flight asks of the bricks' rules, and what they may do to it in
// turn. fly() reads the bolts a brick is shut by as it starts, and runs a
// brick's trait rules at four moments: as a turn strikes it, as it breaks,
// as the fuzzball meets it, and as the fuzzball's middle crosses into its
// eye; and a rule changes the flight only through the hooks it is handed,
// so a kind brought in later plugs in through its traits' rules without
// touching fly().

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

/**
 * Holds what a brick's rules may do to the flight, at the moment they run.
 *
 * Each is made only at the moments it says, and throws at any other, as
 * one kept and called once its flight has flown does.
 */
export interface Hooks {
  /**
   * Earns the flight a floor bounce from the brick whose rules run, as a
   * spring brick's break does: kept if the fuzzball holds fewer than
   * `FlightRules.mostBounces`, and announced either way. Made as a brick
   * breaks or is met.
   */
  earn(): void;
  /**
   * Counts the turn at which the fuzzball met the hatch whose rules run as
   * one of the hatches' holds: once a turn, however many bars it met there,
   * the first naming the hold, until the hatches have held it
   * `FlightRules.hatchHolds` times between them, when every hatch opens
   * until it lands. Made as a brick breaks or is met.
   *
   * It doesn't turn the fuzzball: the bar has turned it at that moment.
   */
  hold(): void;
  /**
   * Takes the fuzzball from the eye whose rules run to the same place in
   * its twin's, the portal in the wall cell given, flying on the same way:
   * no turn. Made once, as the middle crosses into a portal's eye, and
   * only to its twin.
   */
  teleport(to: number): void;
}

/** Holds what a trait does to a flight: the bolts it shuts a brick by, and what it does at each moment it has a rule for, each moment's rules running in the order of its kind's traits. */
export interface TraitRule {
  /**
   * Returns the bolts a brick of the trait is shut by, read as the flight
   * starts, the most any of its kind's traits give where several do, of
   * which the flight draws one back at every `FlightRules.boltTurns`th
   * turn while a brick in the field still has more than are drawn.
   *
   * A strike on a brick still shut takes nothing, as a lock's shield, and
   * its rules for being struck don't run.
   */
  readonly bolts?: (brick: Brick) => number;
  /** Runs as a turn strikes a brick of a kind that breaks, before its hits are taken, unless it is still shut. */
  readonly struck?: (struck: Struck) => void;
  /** Runs as a strike breaks the brick in a wall cell, after its strike. */
  readonly broken?: (hooks: Hooks, cell: number, brick: Brick) => void;
  /** Runs as the fuzzball meets the brick in a wall cell at a turn, after any strike, whether it struck it or not. */
  readonly met?: (hooks: Hooks, cell: number, brick: Brick) => void;
  /** Runs as the fuzzball's middle crosses into the eye of the brick in a wall cell. */
  readonly entered?: (hooks: Hooks, cell: number, brick: Brick) => void;
}

/** Holds every trait's rule, so a trait without one fails to compile. */
export type TraitRules = Readonly<Record<TraitKind, TraitRule>>;
