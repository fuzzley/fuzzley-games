import { STATIC_STEPS } from "../../rules/tuning";
import { PLACE_IDS, type PlaceId } from "../places/places";
import { BED_NAMES, type BedName, bedOf, bedPlays, bedsAhead } from "./beds";

/** Returns the beds and layers that play under a place at a multiplier. */
function playingUnder(place: PlaceId, multiplier: number): BedName[] {
  return BED_NAMES.filter((name) => bedPlays(name, place, multiplier));
}

describe("bedOf", () => {
  it.each([
    ["inner-belt", "bed-inner-belt"],
    ["iron-reach", "bed-iron-reach"],
    ["storm", "bed-storm"],
    ["endless", "bed-endless"],
  ] as const)("plays %s's waves over %s", (place, bed) => {
    expect(bedOf(place)).toBe(bed);
  });

  it("gives each place a bed of its own", () => {
    expect(new Set(PLACE_IDS.map(bedOf)).size).toBe(PLACE_IDS.length);
  });
});

describe("bedPlays", () => {
  it.each(PLACE_IDS)("plays %s's bed alone with no multiplier", (place) => {
    expect(playingUnder(place, 1)).toEqual([bedOf(place)]);
  });

  it("plays the bed alone at ×2", () => {
    expect(playingUnder("storm", 2)).toEqual(["bed-storm"]);
  });

  it("joins the pulse at ×3", () => {
    expect(playingUnder("storm", 3)).toEqual(["bed-storm", "bed-pulse"]);
  });

  it("joins the shimmer over the pulse at ×4", () => {
    expect(playingUnder("endless", 4)).toEqual([
      "bed-endless",
      "bed-pulse",
      "bed-shimmer",
    ]);
  });

  it("reaches every layer at static's highest multiplier", () => {
    const top = Math.max(...STATIC_STEPS.map(({ times }) => times));

    expect(playingUnder("inner-belt", top)).toHaveLength(3);
  });
});

describe("bedsAhead", () => {
  it("fetches a place's bed ahead of its waves, and every layer", () => {
    expect(bedsAhead("iron-reach")).toEqual([
      "bed-iron-reach",
      "bed-pulse",
      "bed-shimmer",
    ]);
  });

  it("covers every bed over the places", () => {
    const ahead = new Set(PLACE_IDS.flatMap(bedsAhead));

    expect(BED_NAMES.filter((name) => !ahead.has(name))).toEqual([]);
  });
});
