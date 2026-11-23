import { type Aim, isAim } from "@fz/brick-wall/rules/aims";
import { isRecord } from "@fz/core/json";

/** Describes a shot as the player releases it: an aim, and nothing else (C9). */
export interface Shot {
  readonly aim: Aim;
}

/** Returns whether a value is a shot, as one read back from storage must be: a record whose aim is one of the 657. */
export function isShot(value: unknown): value is Shot {
  return isRecord(value) && isAim(value["aim"]);
}
