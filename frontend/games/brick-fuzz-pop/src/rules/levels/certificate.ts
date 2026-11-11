import { type Shot, isAim, isCharge } from "../shot";

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
