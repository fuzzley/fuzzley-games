import { REGROWS_RULE } from "./regrows";

describe("REGROWS_RULE", () => {
  it("has no rule for any moment of a flight, so moss takes hits as any brick", () => {
    expect(REGROWS_RULE).toEqual({});
  });
});
