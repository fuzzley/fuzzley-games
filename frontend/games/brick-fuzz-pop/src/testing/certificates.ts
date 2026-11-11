import type { CertificateFiles } from "../app/debug/certificates.service";
import { SPEC_LEVELS } from "./play";

/** A line of two shots, as a certificates file holds it. */
export const TWO_SHOTS: readonly (readonly [number, number])[] = [
  [100, 2],
  [300, 4],
];

/** Says which level a file certifies, and which set's file it is. */
interface Certifying {
  /** The level's id; the specs' first level's by default. */
  readonly level?: string;
  /** The set's id; the specs' set's by default. */
  readonly set?: string;
}

/** Describes what settles as Angular's `whenStable()` says: a fixture, or the app. */
interface Stabilizing {
  whenStable(): Promise<unknown>;
}

/**
 * Returns certificates files whose set's file holds a line of two shots
 * for a level, on the depth `depth()` gives as the file loads: in a spec,
 * the field's.
 */
export function filesCertifying(
  depth: () => number,
  {
    level = SPEC_LEVELS[0]?.data.id ?? "",
    set = SPEC_LEVELS[0]?.set.id ?? "",
  }: Certifying = {},
): CertificateFiles {
  return {
    [set]: () => Promise.resolve({ [level]: { [String(depth())]: TWO_SHOTS } }),
  };
}

/**
 * Waits for the debug menu, where it is offered, the certificates it
 * loads, or a line it starts playing, and then the page, to settle. The
 * menu's own load is a pending task, which `whenStable()` waits for, but
 * neither of the others is, so `whenStable()` alone returns first; a file
 * `filesCertifying()` gives resolves before the next macrotask, but the
 * game's own, a dynamic import, may take longer.
 */
export async function loadsSettled(stabilizing: Stabilizing): Promise<void> {
  await stabilizing.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await stabilizing.whenStable();
}
