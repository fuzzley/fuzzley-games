import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../rules/tuning";
import {
  MOST_SPECKS,
  SPECKS_PER_AREA,
  SPECK_AREA,
  speckCount,
  speckShares,
} from "./specks";

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
