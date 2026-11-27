import { LEVELS } from "../rules/levels/levels";
import { CERTIFY_API } from "./certify_api";

describe("CERTIFY_API", () => {
  it("certifies the game's levels", () => {
    expect(CERTIFY_API.levels).toBe(LEVELS);
  });

  it("proves a deal of a level by the line of the sketch's certificate", () => {
    expect(CERTIFY_API.lineOf(1, 1)).toEqual([
      { from: 34, to: 35 },
      { from: 15, to: 16 },
    ]);
  });
});
