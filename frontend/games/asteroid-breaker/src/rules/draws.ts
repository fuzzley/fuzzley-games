import { drawAt } from "@fz/core/random";
import type { Span } from "./tuning";

/** Describes where a field's random numbers come from: its seed, and how many it has drawn. */
export interface Draws {
  /** The seed everything random on the field is drawn from. */
  readonly seed: number;
  /** How many random draws the field has made, which seeds the next. */
  draws: number;
}

/**
 * Returns the field's next random number, from 0 up to 1, seeded by its
 * seed and how many draws came before, so a field taken up again draws as
 * it would have.
 */
export function nextDraw(field: Draws): number {
  field.draws += 1;
  return drawAt(field.seed, field.draws);
}

/** Returns a number drawn from a span, from its least up to its most. */
export function drawIn(field: Draws, span: Span): number {
  return span.least + (span.most - span.least) * nextDraw(field);
}
