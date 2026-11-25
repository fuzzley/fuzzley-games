import { hatchTint } from "./hatch_tint";

describe("hatchTint", () => {
  it.each([
    [3, 0],
    [2, 1],
    [1, 2],
    [0, 3],
  ])(
    "gives the hatches, with %i holds left, the tint %i, a dot lost for each hold taken, and open at the last",
    (left, tint) => {
      expect(hatchTint(left)).toBe(tint);
    },
  );

  it("shows all 3 dots while more holds than that are left, as the rules may be tuned to give", () => {
    expect(hatchTint(5)).toBe(0);
  });
});
