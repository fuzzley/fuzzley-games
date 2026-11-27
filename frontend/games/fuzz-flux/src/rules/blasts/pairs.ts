// The pair two specials, or the frizzball and another, swapped together
// make, which goes off as one, and the kind it goes off with: the
// frizzball's with any other, taking that one's kind, then a wisp's, two
// puffers', a dasher and a puffer's, and two dashers', each taking the
// kind of the one picked up. A wisp swapped with a dasher keeps the
// dasher's way, which it carries. Two frizzballs take no kind.

import type { KindId } from "../catalog/kinds";
import type { BlastId, MadeId, SpecialId } from "../catalog/specials";
import type { FurPair } from "./frizzball";
import type { GoingOff } from "./striking";

/** A blast of two specials, or the frizzball and another, swapped together, such as "two-wisps". */
export type PairId = Exclude<BlastId, MadeId>;

/** Describes a pair going off, and the kind it goes off with. */
export type PairGoingOff = GoingOff & { readonly what: PairId };

/** A pair of two specials, the frizzball in neither. */
type SpecialsPairId = Exclude<PairId, FurPair | "two-frizzballs">;

/** Describes one of two pieces swapped together that go off as a pair: a special, with its fuzzball's kind, or the frizzball, which has none. */
export type Partner =
  | { readonly made: SpecialId; readonly kind: KindId }
  | { readonly made: "frizzball"; readonly kind: null };

/** Returns the pair two partners swapped together make, the same whichever was picked up, with the kind it goes off with. */
export function pairOf(picked: Partner, neighbor: Partner): PairGoingOff {
  if (picked.made === "frizzball") {
    return frizzballPair(neighbor);
  }
  if (neighbor.made === "frizzball") {
    return frizzballPair(picked);
  }
  return { what: specialsPair(picked.made, neighbor.made), kind: picked.kind };
}

/** Returns the pair the frizzball makes swapped with another special or frizzball, with that one's kind. */
function frizzballPair(other: Partner): PairGoingOff {
  switch (other.made) {
    case "frizzball":
      return { what: "two-frizzballs", kind: null };
    case "wisp":
      return { what: "frizzball-and-wisp", kind: other.kind };
    case "puffer":
      return { what: "frizzball-and-puffer", kind: other.kind };
    case "dasher-across":
    case "dasher-down":
      return { what: "frizzball-and-dasher", kind: other.kind };
  }
}

/** Returns the pair two specials make. */
function specialsPair(one: SpecialId, other: SpecialId): SpecialsPairId {
  if (one === "wisp" || other === "wisp") {
    return wispPair(one === "wisp" ? other : one);
  }
  if (one === "puffer" && other === "puffer") {
    return "two-puffers";
  }
  return one === "puffer" || other === "puffer"
    ? "dasher-and-puffer"
    : "two-dashers";
}

/** Returns the pair a wisp makes swapped with another wisp, a puffer or a dasher. */
function wispPair(other: SpecialId): SpecialsPairId {
  switch (other) {
    case "wisp":
      return "two-wisps";
    case "puffer":
      return "wisp-and-puffer";
    case "dasher-across":
      return "wisp-and-dasher-across";
    case "dasher-down":
      return "wisp-and-dasher-down";
  }
}
