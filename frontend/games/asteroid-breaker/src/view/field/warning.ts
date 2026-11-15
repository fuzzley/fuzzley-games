import { clamp } from "@fz/core/math";
import type { Comet } from "../../rules/hazards/comets";
import type { Crossing } from "../../rules/hazards/crossing";
import { STEP_MS, stepsIn } from "../../rules/stepper";
import type { Moving, Place, Torus } from "../../rules/torus";
import { COMET_MARGIN, COMET_WARNING_MS } from "../../rules/tuning";

/** Every way a comet's warning shows: each of its chevrons lit in turn, from the edge in, and all three held still. */
export const CHEVRON_LITS = [0, 1, 2, null] as const;

/** A way a comet's warning shows: one of its chevrons lit, or null for all three held still. */
export type ChevronLit = (typeof CHEVRON_LITS)[number];

/** One of a comet's warning's chevrons, from the edge in. */
export type LitChevron = Exclude<ChevronLit, null>;

/**
 * How many chevrons a warning lights a second as it starts and as its comet
 * comes in, quickening between, so the warning gets faster rather than
 * louder: each chevron lit at a third of that, under three flashes a second.
 */
const CHEVRON_RATES = { from: 4.5, to: 7.5 } as const;

/** Returns how far along a way, one unit long across an axis, a coordinate goes to come within 0 and a size, or 0 where it is within. */
function entering(at: number, way: number, size: number): number {
  if (at < 0 && way > 0) return -at / way;
  if (at > size && way < 0) return (size - at) / way;
  return 0;
}

/** Returns how far along a way, one unit long across an axis, a coordinate goes to leave 0 to a size. */
function leaving(at: number, way: number, size: number): number {
  if (way > 0) return (size - at) / way;
  if (way < 0) return -at / way;
  return Infinity;
}

/**
 * Writes where a comet's warning stands into a place and returns it: on the
 * field's edge where the comet, waiting beyond it, will come in, along its
 * way.
 */
export function warningAt(
  comet: Readonly<Crossing>,
  torus: Torus,
  into: Moving,
): Moving {
  const x = Math.cos(comet.heading);
  const y = Math.sin(comet.heading);
  const along = Math.max(
    entering(comet.x, x, torus.width),
    entering(comet.y, y, torus.height),
  );
  into.x = clamp(comet.x + x * along, 0, torus.width);
  into.y = clamp(comet.y + y * along, 0, torus.height);
  return into;
}

/**
 * Returns how long a comet's lane is, in field units: from where its
 * warning stands on the field's edge, along its way, to the edge it leaves
 * by.
 */
export function laneLength(from: Place, heading: number, torus: Torus): number {
  return Math.min(
    leaving(from.x, Math.cos(heading), torus.width),
    leaving(from.y, Math.sin(heading), torus.height),
  );
}

/** Returns how long a comet has been warned of, in seconds, by the field's steps, so its warning lights from its start. */
export function warnedFor(comet: Readonly<Comet>): number {
  return ((stepsIn(COMET_WARNING_MS) - comet.warnSteps) * STEP_MS) / 1000;
}

/**
 * Returns which chevron of a comet's warning is lit, each in turn from the
 * edge in, quickening as the comet comes, from the warning's start; or none
 * of them, all held still, where motion isn't welcome.
 */
export function chevronLit(
  comet: Readonly<Comet>,
  motion: boolean,
): ChevronLit {
  if (!motion) return null;
  const seconds = warnedFor(comet);
  const lasts = COMET_WARNING_MS / 1000;
  const { from, to } = CHEVRON_RATES;
  // How many chevrons have been lit, the rate climbing evenly.
  const count =
    from * seconds + ((to - from) * seconds * seconds) / (2 * lasts);
  const turn = Math.floor(count) % 3;
  return turn === 0 ? 0 : turn === 1 ? 1 : 2;
}

/**
 * Returns how strongly a comet's tail shows, drawn at a place: whole while
 * its middle is on the field, fading as its middle lies off it, to nothing
 * at the margin it comes in from and leaves past, so its tail, which
 * reaches farther behind it than the margin, goes with it rather than
 * vanishing on the field.
 */
export function tailShare(at: Place, torus: Torus): number {
  const off = Math.hypot(
    Math.max(0, -at.x, at.x - torus.width),
    Math.max(0, -at.y, at.y - torus.height),
  );
  return clamp(1 - off / COMET_MARGIN, 0, 1);
}
