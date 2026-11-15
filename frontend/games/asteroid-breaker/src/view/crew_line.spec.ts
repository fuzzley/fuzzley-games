import type { Crew } from "../rules/ship/pilots";
import { cardCrewWords, crewLineOf, crewWords } from "./crew_line";

/** Returns a crew with its first pilot at the controls and those given in tow. */
function crewOf(tow: readonly number[]): Crew {
  return { pilot: 0, tow, home: [], lastGiven: 5 };
}

describe("crewLineOf", () => {
  it("draws each in tow, then each knocked loose, while there are three or fewer", () => {
    expect(crewLineOf([1, 2], [3])).toEqual({
      drawn: [1, 2],
      loose: [3],
      count: null,
    });
  });

  it("draws as many as it may", () => {
    expect(crewLineOf([1, 2, 3], []).count).toBeNull();
  });

  it("counts those in tow past three, beside the first", () => {
    expect(crewLineOf([1, 2, 3, 4], [])).toEqual({
      drawn: [1],
      loose: [],
      count: 4,
    });
  });

  it("counts those in tow, not those loose, once in tow and loose pass three", () => {
    expect(crewLineOf([1, 2, 3], [4])).toEqual({
      drawn: [1],
      loose: [],
      count: 3,
    });
  });

  it("counts those knocked loose beside the first of them, with no one in tow", () => {
    expect(crewLineOf([], [4, 3, 2, 1])).toEqual({
      drawn: [],
      loose: [4],
      count: 4,
    });
  });
});

describe("crewWords", () => {
  it("says how many ride in tow where the bar draws them", () => {
    expect(crewWords(crewOf([1, 2]), [], "line")).toBe("2 in tow");
  });

  it("says no one rides in tow", () => {
    expect(crewWords(crewOf([]), [], "line")).toBe("No one in tow");
  });

  it("says how many are aboard where the bar gives that number", () => {
    expect(crewWords(crewOf([1, 2]), [], "aboard")).toBe("3 aboard");
  });

  it("says how many are knocked loose", () => {
    expect([
      crewWords(crewOf([1]), [2, 3], "line"),
      crewWords(crewOf([1]), [2], "aboard"),
    ]).toEqual(["1 in tow, 2 knocked loose", "2 aboard, 1 knocked loose"]);
  });
});

describe("cardCrewWords", () => {
  it("says how many of the crew are aboard, the pilot among them", () => {
    expect(cardCrewWords(crewOf([1, 2]), [])).toBe("3 of the crew aboard");
  });

  it("says how many are knocked loose after them", () => {
    expect(cardCrewWords(crewOf([1]), [3, 2])).toBe(
      "2 of the crew aboard, 2 knocked loose",
    );
  });
});
