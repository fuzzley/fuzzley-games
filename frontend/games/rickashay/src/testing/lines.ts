import type { CertificateFiles } from "@fz/brick-wall/app/certificates";
import type { Aim } from "@fz/brick-wall/rules/aims";
import { SPEC_LEVELS } from "./spec_play";

/** A line of two shots, as a certificates or a rally lines file holds it: each an aim's index. */
export const TWO_SHOTS: readonly Aim[] = [300, 340];

/**
 * Returns certificates or rally lines files whose set's file holds a line
 * of two shots for the specs' first level, on the depth `depth()` gives as
 * the file loads: in a spec, the field's.
 */
export function filesHolding(depth: () => number): CertificateFiles {
  const level = SPEC_LEVELS[0]?.data.id ?? "";
  const set = SPEC_LEVELS[0]?.set.id ?? "";
  return {
    [set]: () => Promise.resolve({ [level]: { [String(depth())]: TWO_SHOTS } }),
  };
}
