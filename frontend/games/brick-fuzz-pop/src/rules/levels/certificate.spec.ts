import { shotOf } from "./certificate";

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
