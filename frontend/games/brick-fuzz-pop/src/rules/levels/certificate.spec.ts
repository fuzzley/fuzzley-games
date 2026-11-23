import { readCertifiedShot, shotOf } from "./certificate";

describe("shotOf", () => {
  it("reads a certificate's pair as a shot", () => {
    expect(shotOf([656, 5])).toEqual({ aim: 656, charge: 5 });
  });

  it.each([-1, 657, 0.5])("throws a RangeError for an aim of %d", (aim) => {
    expect(() => shotOf([aim, 0])).toThrow(
      new RangeError(`${String(aim)} isn't an aim.`),
    );
  });

  it.each([-1, 6, 2.5])("throws a RangeError for a charge of %d", (charge) => {
    expect(() => shotOf([0, charge])).toThrow(
      new RangeError(`${String(charge)} isn't a charge.`),
    );
  });
});

describe("readCertifiedShot", () => {
  it("reads a pair of an aim and a charge", () => {
    expect(readCertifiedShot([656, 5])).toEqual([656, 5]);
  });

  it.each([
    ["an aim past the last", [657, 2]],
    ["an aim between two", [100.5, 2]],
    ["a charge past the most", [100, 6]],
    ["three numbers", [100, 2, 1]],
    ["one", [100]],
    ["no pair", { aim: 100, charge: 2 }],
  ])("reads none from %s", (_, kept) => {
    expect(readCertifiedShot(kept)).toBeNull();
  });
});
