import type { CertificateFiles } from "@fz/brick-wall/app/certificates";
import { SPEC_LEVELS } from "./play";

/** A line of two shots, as a certificates file holds it. */
export const TWO_SHOTS: readonly (readonly [number, number])[] = [
  [100, 2],
  [300, 4],
];

/**
 * Returns certificates files whose set's file holds a line of two shots
 * for the specs' first level, on the depth `depth()` gives as the file
 * loads: in a spec, the field's.
 */
export function filesCertifying(depth: () => number): CertificateFiles {
  const level = SPEC_LEVELS[0]?.data.id ?? "";
  const set = SPEC_LEVELS[0]?.set.id ?? "";
  return {
    [set]: () => Promise.resolve({ [level]: { [String(depth())]: TWO_SHOTS } }),
  };
}
