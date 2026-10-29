import { TINTS } from "../rules/level";
import { DARK_INKS, LIGHT_INKS } from "./inks";

describe("the inks", () => {
  it.each([
    ["light", LIGHT_INKS],
    ["dark", DARK_INKS],
  ])("give each tint a level may name a %s color of its own", (_, inks) => {
    expect({ count: inks.length, distinct: new Set(inks).size }).toEqual({
      count: TINTS,
      distinct: TINTS,
    });
  });
});
