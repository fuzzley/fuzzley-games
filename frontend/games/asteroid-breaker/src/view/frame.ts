import type { WeaponId } from "../rules/catalog/weapons";
import type { Floating } from "../rules/drops";
import type { FieldEventLog } from "../rules/events";
import type { Comet, Stray } from "../rules/hazards";
import type { Effects } from "../rules/pickups";
import type { Crew } from "../rules/pilots";
import type { Rock } from "../rules/rocks";
import type { Ship } from "../rules/ship";
import type { Shot } from "../rules/shots";
import { TURN } from "../rules/angles";
import { type Torus, across, wrap } from "../rules/torus";

export type { FieldEvent, FieldEventKind } from "../rules/events";
export type { Steer } from "../rules/ship";

/**
 * Describes the field as the view and the scene read it, which they can't
 * change: the rules' `Field` is one.
 */
export interface FieldView {
  /** Its size, in field units. */
  readonly torus: Torus;
  /** A slot for each rock it holds at most, whole or not. */
  readonly rocks: readonly Readonly<Rock>[];
  /** The ship in play, waiting or flying, or null between one ship and the next. */
  readonly ship: Readonly<Ship> | null;
  /** A slot for each shot that can be in flight, flying while it has steps left. */
  readonly shots: { readonly slots: readonly Readonly<Shot>[] };
  /** The weapon in hand. */
  readonly weapon: WeaponId;
  /** A record for each pickup that can float at once, floating or not. */
  readonly pickups: readonly Readonly<Floating>[];
  /** The stray adrift, crossing the field or not. */
  readonly strays: { readonly adrift: Readonly<Stray> };
  /** A record for each comet that can be on its way at once, warned of, crossing or neither. */
  readonly comets: { readonly slots: readonly Readonly<Comet>[] };
  /** The effects in play, one of each group. */
  readonly effects: Effects;
  /** Whether a Shield guards the ship from the next rock to touch it. */
  readonly shielded: boolean;
  /** Who flies the run's ships, the pilot at the controls first, and who waits at home. */
  readonly crew: Crew;
  /** How many steps the wave has taken, by which its timers run. */
  readonly steps: number;
  /** Whether every rock it held is gone. */
  readonly cleared: boolean;
}

/** Describes the field's log of events as the scene reads it: from a serial on, never adding to it. */
export type EventsView = Pick<FieldEventLog, "latest" | "forEachSince">;

/** Describes the field between one step and the next. */
export interface FieldFrame {
  /** The field as of its last step. */
  readonly field: FieldView;
  /** How far the field is from its last step to its next, from 0 to 1. */
  readonly alpha: number;
  /**
   * What happened, each event numbered, for the scene to play the new ones
   * once; a new log comes with a new field, and stops what the last set off.
   */
  readonly events: EventsView;
  /** The run's seed, which the field's specks are strewn from, so they stay through its waves. */
  readonly seed: number;
}

/** Returns where a thing is drawn between its last place and its next, `alpha` of the way. */
export function between(last: number, next: number, alpha: number): number {
  return last + (next - last) * alpha;
}

/**
 * Returns where a thing that wraps is drawn between its last place on an
 * axis of a length and its next, `alpha` of the way the shortest way
 * across the wrap, so one a step took across an edge is drawn at it rather
 * than across the field.
 *
 * The comets and the strays cross rather than wrap, and lie off the field
 * as they come in and leave, which this would wrap onto its far side;
 * {@link between} draws them.
 */
export function betweenOnAxis(
  last: number,
  next: number,
  alpha: number,
  length: number,
): number {
  return wrap(last + across(last, next, length) * alpha, length);
}

/** Returns where a thing's turn is drawn between its last angle and its next, in radians, `alpha` of the way the shorter way round. */
export function angleBetween(
  last: number,
  next: number,
  alpha: number,
): number {
  return last + across(last, next, TURN) * alpha;
}
