import { isOneOf, keysOf } from "@fz/core/records";
import { ELEMENT_IDS } from "../catalog/elements";
import { GUST_RULE } from "../wind/gust";
import { ELEMENT_RULES, STAND_INS, WIND_RULE } from "./element_rules";

/** Every element brought in, its rule its own. */
const BROUGHT_IN = ELEMENT_IDS.filter((id) => !isOneOf(id, STAND_INS));

describe("ELEMENT_RULES", () => {
  it("holds a rule for each element, in the catalog's order", () => {
    expect(keysOf(ELEMENT_RULES)).toEqual(ELEMENT_IDS);
  });

  it.each(BROUGHT_IN)("plays %s by a rule of its own", (id) => {
    expect(Object.keys(ELEMENT_RULES[id])).not.toEqual([]);
  });
});

describe("STAND_INS", () => {
  it("lists each element once, in the catalog's order", () => {
    expect(STAND_INS).toEqual(
      ELEMENT_IDS.filter((id) => isOneOf(id, STAND_INS)),
    );
  });
});

describe("WIND_RULE", () => {
  it("plays the wind by the gust's rule", () => {
    expect(WIND_RULE).toBe(GUST_RULE);
  });
});
