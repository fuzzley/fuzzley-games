import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../../rules/tuning";
import {
  CONSTELLATION_SIZE,
  DEPTHS,
  MOST_SPECKS,
  MOST_STARS,
  SPECKS_PER_AREA,
  SPECK_AREA,
  STARS_PER_AREA,
  STAR_SIZES,
  constellationAt,
  speckCount,
  speckShares,
  starCount,
  starsOf,
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

describe("starCount", () => {
  it.each(DEPTHS)(
    "strews the %s stars over the field by its area, rounded",
    (depth) => {
      expect(starCount(depth, { width: 80, height: 40 })).toBe(
        Math.round(STARS_PER_AREA[depth] * 2),
      );
    },
  );

  it("strews the far stars thickest and the bright ones thinnest", () => {
    const field = { width: 72, height: 40 };

    const counts = DEPTHS.map((depth) => starCount(depth, field));

    expect(counts).toEqual([173, 61, 6]);
  });

  it.each(DEPTHS)(
    "strews the most %s stars over the largest field",
    (depth) => {
      expect(
        starCount(depth, {
          width: FIELD_LONGEST_SIDE,
          height: FIELD_SHORT_SIDE,
        }),
      ).toBe(MOST_STARS[depth]);
    },
  );
});

describe("starsOf", () => {
  it("strews as many of each depth as the largest field holds", () => {
    const stars = starsOf(7);

    expect(DEPTHS.map((depth) => stars[depth].length)).toEqual(
      DEPTHS.map((depth) => MOST_STARS[depth]),
    );
  });

  it.each(DEPTHS)(
    "strews each %s star within the field, at its depth's size and a shine from 0 to 1",
    (depth) => {
      const [least, most] = STAR_SIZES[depth];

      const out = starsOf(7)[depth].filter(
        ({ x, y, r, shine }) =>
          Math.min(x, y, shine) < 0 ||
          Math.max(x, y, shine) >= 1 ||
          r < least ||
          r > most,
      );

      expect(out).toEqual([]);
    },
  );

  it("strews each depth's stars from a stream of its own", () => {
    const { far, mid } = starsOf(7);

    expect(mid[0]).not.toEqual(far[0]);
  });

  it("strews the same stars from the same seed, as a run's stay through its waves", () => {
    expect(starsOf(7)).toEqual(starsOf(7));
  });

  it("strews other stars from another seed, as the next run's", () => {
    expect(starsOf(8).far[0]).not.toEqual(starsOf(7).far[0]);
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

  it("keeps the place a run's seed lays a wave's in", () => {
    expect(constellationAt(1, 31)).toEqual({
      x: 0.38208381342701614,
      y: 0.47782566340174526,
    });
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
