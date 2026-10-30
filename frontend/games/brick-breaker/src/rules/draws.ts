import { drawAt } from "@fz/core/random";
import type { Field } from "./field";

/**
 * Returns the field's next random number, from 0 up to 1, seeded by its
 * seed and how many draws came before, so a field taken up again draws as
 * it would have.
 */
export function nextDraw(field: Field): number {
  field.draws++;
  return drawAt(field.setup.seed, field.draws);
}
