import type { Aim } from "@fz/brick-wall/rules/aims";
import { isKeyOf } from "@fz/core/records";
import { MOST_CHARGE } from "./tuning";

/** A fuzzball's charge, the hits it can punch through, 0 to {@link MOST_CHARGE}. */
export type Charge = 0 | 1 | 2 | 3 | 4 | 5;

/** Names a boon a jump earns the next shot: the hot shot or the triple shot. */
export type Boon = "hot" | "triple";

/** Every boon, so a boon added to {@link Boon} fails to compile until it is here. */
const BOONS: Readonly<Record<Boon, true>> = { hot: true, triple: true };

/** Describes a shot as the player releases it. */
export interface Shot {
  readonly aim: Aim;
  readonly charge: Charge;
}

/** Returns whether a value is a charge: a whole number from 0 to 5. */
export function isCharge(value: unknown): value is Charge {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= (MOST_CHARGE satisfies Charge)
  );
}

/** Returns whether a value names a boon: "hot" or "triple". */
export function isBoon(value: unknown): value is Boon {
  return isKeyOf(value, BOONS);
}
