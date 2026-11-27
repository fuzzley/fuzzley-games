import type { KindId } from "../catalog/kinds";
import type { MadeId } from "../catalog/specials";
import { type PairId, type Partner, pairOf } from "./pairs";

/** Each pair two specials make, by the two, in the design's "Swapped together" order. */
const PAIRS: readonly (readonly [MadeId, MadeId, PairId])[] = [
  ["dasher-across", "dasher-across", "two-dashers"],
  ["dasher-across", "dasher-down", "two-dashers"],
  ["dasher-down", "dasher-down", "two-dashers"],
  ["dasher-across", "puffer", "dasher-and-puffer"],
  ["dasher-down", "puffer", "dasher-and-puffer"],
  ["puffer", "puffer", "two-puffers"],
  ["wisp", "wisp", "two-wisps"],
  ["wisp", "dasher-across", "wisp-and-dasher-across"],
  ["wisp", "dasher-down", "wisp-and-dasher-down"],
  ["wisp", "puffer", "wisp-and-puffer"],
  ["frizzball", "dasher-across", "frizzball-and-dasher"],
  ["frizzball", "dasher-down", "frizzball-and-dasher"],
  ["frizzball", "puffer", "frizzball-and-puffer"],
  ["frizzball", "wisp", "frizzball-and-wisp"],
  ["frizzball", "frizzball", "two-frizzballs"],
];

/** The frizzball swapped, which has no kind. */
const FRIZZBALL: Partner = { made: "frizzball", kind: null };

/** Returns a special swapped, on a fuzzball of a kind, or the frizzball, which takes no kind. */
function partner(made: MadeId, kind: KindId): Partner {
  return made === "frizzball" ? FRIZZBALL : { made, kind };
}

describe("pairOf", () => {
  it.each(PAIRS)("makes %s and %s %s", (one, other, pair) => {
    expect(pairOf(partner(one, "red"), partner(other, "blue")).what).toBe(pair);
  });

  it.each(PAIRS)(
    "makes %s and %s the same pair whichever was picked up",
    (one, other) => {
      expect(pairOf(partner(other, "blue"), partner(one, "red")).what).toBe(
        pairOf(partner(one, "red"), partner(other, "blue")).what,
      );
    },
  );

  it("sets two specials off with the kind of the one picked up", () => {
    expect([
      pairOf(partner("wisp", "red"), partner("puffer", "blue")),
      pairOf(partner("puffer", "blue"), partner("wisp", "red")),
    ]).toEqual([
      { what: "wisp-and-puffer", kind: "red" },
      { what: "wisp-and-puffer", kind: "blue" },
    ]);
  });

  it("sets the frizzball and a special off with the special's kind, whichever was picked up", () => {
    expect([
      pairOf(FRIZZBALL, partner("dasher-down", "blue")),
      pairOf(partner("dasher-down", "blue"), FRIZZBALL),
    ]).toEqual([
      { what: "frizzball-and-dasher", kind: "blue" },
      { what: "frizzball-and-dasher", kind: "blue" },
    ]);
  });

  it("sets two frizzballs off with no kind", () => {
    expect(pairOf(FRIZZBALL, FRIZZBALL)).toEqual({
      what: "two-frizzballs",
      kind: null,
    });
  });
});
