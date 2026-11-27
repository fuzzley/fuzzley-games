// The six kinds of fuzzball, of which a level plays with 4 to 6. How each
// looks, its body's silhouette and its ink, is the view's.

import { isOneOf } from "@fz/core/records";

/** Every kind of fuzzball, in the order the design lists them. */
export const KIND_IDS = [
  "blue",
  "red",
  "amber",
  "green",
  "violet",
  "pink",
] as const satisfies readonly string[];

/** A kind of fuzzball, such as "amber". */
export type KindId = (typeof KIND_IDS)[number];

/** Returns whether a value names one of the six kinds. */
export function isKindId(value: unknown): value is KindId {
  return isOneOf(value, KIND_IDS);
}
