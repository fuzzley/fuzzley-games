// The levels' certificates as the debug menu plays them: a set's file holds,
// for each level's id and each depth the field takes, the line of shots
// that clears the level from its start, each an aim's index and a charge,
// as `yarn certify:levels` writes them. The specs read the same files
// through `src/testing/every_level.ts`, which throws at what it can't read,
// as a spec should; this reader drops it, as a page should.

import { isRecord, listOf } from "@fz/core/json";
import type { CertifiedShot, Line } from "../../rules/levels/certificate";
import { isAim, isCharge } from "../../rules/shot";
import { isDepth } from "../../rules/wall/wall";

/** A set's certificates: each level's line on each depth it holds one for, by the level's id, then the depth. */
export type SetCertificates = ReadonlyMap<string, ReadonlyMap<number, Line>>;

/**
 * Returns a set's certificates read from its file, dropping what can't be
 * trusted: a level that isn't a record of lines, a depth no field has, and
 * a line that is empty or holds anything but pairs of an aim and a charge.
 * A file that isn't a record reads as none.
 */
export function readCertificates(value: unknown): SetCertificates {
  const certificates = new Map<string, ReadonlyMap<number, Line>>();
  if (!isRecord(value)) return certificates;
  for (const [id, lines] of Object.entries(value)) {
    const read = readLines(lines);
    if (read.size > 0) certificates.set(id, read);
  }
  return certificates;
}

/** Returns a level's line on a depth, or null where its certificates hold none. */
export function lineOf(
  certificates: SetCertificates,
  levelId: string,
  depth: number,
): Line | null {
  return certificates.get(levelId)?.get(depth) ?? null;
}

/** Returns a level's lines by depth, those that read. */
function readLines(value: unknown): ReadonlyMap<number, Line> {
  const lines = new Map<number, Line>();
  if (!isRecord(value)) return lines;
  for (const [key, shots] of Object.entries(value)) {
    const depth = Number(key);
    const line = listOf(shots, readPair);
    if (isDepth(depth) && key === String(depth) && line?.length) {
      lines.set(depth, line);
    }
  }
  return lines;
}

/** Returns a shot's pair of an aim and a charge, as a certificate keeps it, or null for anything else. */
function readPair(value: unknown): CertifiedShot | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const pair: readonly unknown[] = value;
  const [aim, charge] = pair;
  return isAim(aim) && isCharge(charge) ? [aim, charge] : null;
}
