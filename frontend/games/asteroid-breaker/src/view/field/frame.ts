import type { EventLogView } from "@fz/core/event_log";
import { TURN } from "../../rules/angles";
import type { WeaponId } from "../../rules/catalog/weapons";
import type { FieldEvent } from "../../rules/field/events";
import type { Comet } from "../../rules/hazards/comets";
import type { Stray } from "../../rules/hazards/strays";
import type { Floating } from "../../rules/rocks/drops";
import type { Effects } from "../../rules/rocks/pickups";
import type { Rock } from "../../rules/rocks/rocks";
import type { Crew } from "../../rules/ship/pilots";
import type { Ship } from "../../rules/ship/ship";
import type { Shot } from "../../rules/ship/shots";
import {
  type Moving,
  type Place,
  type Torus,
  across,
  wrap,
} from "../../rules/torus";

export type { FieldEvent, FieldEventKind } from "../../rules/field/events";
export type { Steer } from "../../rules/ship/ship";

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
  readonly events: EventLogView<FieldEvent>;
  /** The run's seed, which the field's specks are strewn from, so they stay through its waves. */
  readonly seed: number;
  /**
   * Where the constellation lies in an Endless wave, its middle as shares
   * of the field's width and height, or null in a sector's wave, which has
   * none.
   */
  readonly constellation: Readonly<Place> | null;
}

/**
 * Describes a thing the field steps: its last place and its next, which a frame
 * draws it between.
 */
export interface Stepped {
  readonly lastX: number;
  readonly lastY: number;
  readonly x: number;
  readonly y: number;
}

/** Describes where a thing is drawn on the field, and how far it is turned, in radians. */
export interface Drawn extends Moving {
  angle: number;
}

/**
 * Returns where a thing that wraps is drawn between its last place and its
 * next, `alpha` of the way the shortest way across the wrap, written into a
 * record the caller keeps, so one a step took across an edge is drawn at it
 * rather than across the field.
 *
 * The comets and the strays cross rather than wrap, and lie off the field
 * as they come in and leave, which this would wrap onto its far side;
 * `@fz/core/math`'s `lerp()` draws them.
 */
export function wrappedBetween(
  thing: Stepped,
  alpha: number,
  torus: Torus,
  into: Moving,
): Moving {
  into.x = betweenOnAxis(thing.lastX, thing.x, alpha, torus.width);
  into.y = betweenOnAxis(thing.lastY, thing.y, alpha, torus.height);
  return into;
}

/**
 * Returns where a thing's turn is drawn between its last angle and its next, in
 * radians, `alpha` of the way the shorter way round.
 */
export function angleBetween(
  last: number,
  next: number,
  alpha: number,
): number {
  return last + across(last, next, TURN) * alpha;
}

/**
 * Returns where the field's ship is drawn and how far it is turned, `alpha`
 * of the way from its last place and turn to its next, written into a
 * record the caller keeps, or null between one ship and the next.
 */
export function shipAt(
  { ship, torus }: Pick<FieldView, "ship" | "torus">,
  alpha: number,
  into: Drawn,
): Drawn | null {
  if (!ship) return null;
  wrappedBetween(ship, alpha, torus, into);
  into.angle = angleBetween(ship.lastAngle, ship.angle, alpha);
  return into;
}

/**
 * Returns where a thing that wraps is drawn on an axis of a length, as
 * {@link wrappedBetween} does on both.
 */
function betweenOnAxis(
  last: number,
  next: number,
  alpha: number,
  length: number,
): number {
  return wrap(last + across(last, next, length) * alpha, length);
}
