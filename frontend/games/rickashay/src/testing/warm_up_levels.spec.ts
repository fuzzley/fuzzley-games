import warmUpMarks from "./warm_up_marks.json";
import { WARM_UP_LEVELS } from "./warm_up_levels";

describe("WARM_UP_LEVELS", () => {
  it("holds Warm-up's nine levels, numbered 1 to 9", () => {
    expect(WARM_UP_LEVELS.map(({ number, set }) => [number, set.id])).toEqual(
      Array.from({ length: 9 }, (_, index) => [index + 1, "warm-up"]),
    );
  });

  it("holds the levels whose pars and rally marks the fixture of Warm-up's marks holds", () => {
    const ids = WARM_UP_LEVELS.map(({ data }) => data.id).sort();

    expect([
      Object.keys(warmUpMarks.par).sort(),
      Object.keys(warmUpMarks.rally).sort(),
    ]).toEqual([ids, ids]);
  });
});
