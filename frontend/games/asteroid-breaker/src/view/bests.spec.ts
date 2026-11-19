import { RULES_VERSION } from "../rules/run/stats";
import {
  bestTerm,
  isEarlierBest,
  saysEarlierRules,
  sectorStatus,
} from "./bests";

describe("isEarlierBest", () => {
  it.each([
    ["one made under these rules", 900, RULES_VERSION, false],
    ["one made under earlier rules", 900, RULES_VERSION - 1, true],
    ["one kept with no rules' number", 900, undefined, true],
    [
      "one made under later rules, a later build's",
      900,
      RULES_VERSION + 1,
      false,
    ],
    ["one of no points under earlier rules", 0, RULES_VERSION - 1, false],
  ])("tells %s", (_, best, rules, earlier) => {
    expect(isEarlierBest(best, rules)).toBe(earlier);
  });
});

describe("bestTerm", () => {
  it("calls a best under these rules the best", () => {
    expect(bestTerm(900, RULES_VERSION)).toBe("Best");
  });

  it("says a best was made under earlier rules", () => {
    expect(bestTerm(900, RULES_VERSION - 1)).toBe("Best (old rules)");
  });
});

describe("sectorStatus", () => {
  it("says a sector not yet reached is locked, whatever its best", () => {
    expect(sectorStatus(false, { best: 4100, rules: undefined })).toBe(
      "Locked",
    );
  });

  it("says nothing of an open sector no run has ended in", () => {
    expect(sectorStatus(true, { best: undefined, rules: undefined })).toBe(
      null,
    );
  });

  it("says an open sector's best in points grouped in thousands", () => {
    expect(sectorStatus(true, { best: 4100, rules: RULES_VERSION })).toBe(
      "Best 4,100",
    );
  });

  it("says an open sector's best kept with no rules' number was made under earlier rules", () => {
    expect(sectorStatus(true, { best: 4100, rules: undefined })).toBe(
      "Best 4,100 (old rules)",
    );
  });
});

describe("saysEarlierRules", () => {
  it.each([
    ["an open sector's best under earlier rules", true, 4100, undefined, true],
    [
      "a locked sector's best under earlier rules",
      false,
      4100,
      undefined,
      false,
    ],
    [
      "an open sector's best under these rules",
      true,
      4100,
      RULES_VERSION,
      false,
    ],
    ["an open sector with no best", true, undefined, undefined, false],
  ])(
    "tells whether the dialog says %s was made under earlier rules",
    (_, open, best, rules, says) => {
      expect(saysEarlierRules(open, { best, rules })).toBe(says);
    },
  );
});
