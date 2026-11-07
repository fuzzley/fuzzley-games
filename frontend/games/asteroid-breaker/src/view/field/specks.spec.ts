import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../../rules/tuning";
import {
  CONSTELLATION_SIZE,
  MOST_SPECKS,
  SPECKS_PER_AREA,
  SPECK_AREA,
  constellationAt,
  speckCount,
  speckShares,
} from "./specks";

/** The seeds a spec lays constellations from. */
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);

describe("speckCount", () => {
  it("strews three dozen specks over each 1,600 units² of the field", () => {
    expect(speckCount({ width: 40, height: 40 })).toBe(SPECKS_PER_AREA);
  });

  it("strews more over a larger field, by its area", () => {
    expect(speckCount({ width: 72, height: 40 })).toBe(
      Math.round((SPECKS_PER_AREA * 72 * 40) / SPECK_AREA),
    );
  });

  it("strews the most over the largest field", () => {
    expect(
      speckCount({ width: FIELD_LONGEST_SIDE, height: FIELD_SHORT_SIDE }),
    ).toBe(MOST_SPECKS);
  });
});

describe("speckShares", () => {
  it("strews as many as the largest field holds", () => {
    expect(speckShares(7)).toHaveLength(MOST_SPECKS);
  });

  it("strews each within the field, as a share of its width and height", () => {
    const shares = speckShares(7);

    expect(
      shares.filter(({ x, y }) => x < 0 || x >= 1 || y < 0 || y >= 1),
    ).toEqual([]);
  });

  it("strews the same specks from the same seed, as a run's stay through its waves", () => {
    expect(speckShares(7)).toEqual(speckShares(7));
  });

  it("strews other specks from another seed, as the next run's", () => {
    expect(speckShares(8)).not.toEqual(speckShares(7));
  });
});

describe("constellationAt", () => {
  it("lays it as far in from every edge of the smallest field as it is wide, so it never wraps", () => {
    const margin = CONSTELLATION_SIZE / FIELD_SHORT_SIDE;

    const out = SEEDS.map((seed) => constellationAt(seed, 31)).filter(
      ({ x, y }) => Math.min(x, y) < margin || Math.max(x, y) > 1 - margin,
    );

    expect(out).toEqual([]);
  });

  it("lays it in the same place for the same run and wave", () => {
    expect(constellationAt(7, 40)).toEqual(constellationAt(7, 40));
  });

  it("lays each wave's elsewhere", () => {
    expect(constellationAt(7, 41)).not.toEqual(constellationAt(7, 40));
  });

  it("lays another run's elsewhere", () => {
    expect(constellationAt(8, 40)).not.toEqual(constellationAt(7, 40));
  });
});
