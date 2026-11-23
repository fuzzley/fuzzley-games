import { isAim } from "@fz/brick-wall/rules/aims";
import { type Shot, isCharge } from "../shot";

/** A shot of a level's certificate as its file keeps it: an aim's index, 0 to 656, and a charge, 0 to 5 (C14). */
export type CertifiedShot = readonly [aim: number, charge: number];

/** A line of shots, played in turn from a level's start, as a certificate keeps it. */
export type Line = readonly CertifiedShot[];

/** Returns the shot a certificate keeps as a pair. It throws a `RangeError` for an aim or a charge that isn't one. */
export function shotOf([aim, charge]: CertifiedShot): Shot {
  if (!isAim(aim)) {
    throw new RangeError(`${String(aim)} isn't an aim.`);
  }
  if (!isCharge(charge)) {
    throw new RangeError(`${String(charge)} isn't a charge.`);
  }
  return { aim, charge };
}

/**
 * Returns a shot as a certificate's file keeps it, a pair of an aim and a
 * charge, or null for anything else: the codec a page reads a file with,
 * dropping what it can't trust.
 */
export function readCertifiedShot(value: unknown): CertifiedShot | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const pair: readonly unknown[] = value;
  const [aim, charge] = pair;
  return isAim(aim) && isCharge(charge) ? [aim, charge] : null;
}
