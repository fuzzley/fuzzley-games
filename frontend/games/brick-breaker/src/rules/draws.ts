import { createRandom } from "@fz/core/random";
import type { Field } from "./field";

/**
 * Returns the field's next random number, from 0 up to 1, seeded by its
 * seed and how many draws came before, so a field taken up again draws as
 * it would have.
 */
export function nextDraw(field: Field): number {
  field.draws++;
  return createRandom(field.setup.seed ^ Math.imul(field.draws, 0x9e3779b1))();
}
