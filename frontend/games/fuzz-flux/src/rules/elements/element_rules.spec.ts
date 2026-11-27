import { isOneOf, keysOf } from "@fz/core/records";
import { ELEMENT_IDS } from "../catalog/elements";
import { ELEMENT_RULES, STAND_INS, WIND_RULE } from "./element_rules";

/** Every element brought in, its rule its own. */
const BROUGHT_IN = ELEMENT_IDS.filter((id) => !isOneOf(id, STAND_INS));

describe("ELEMENT_RULES", () => {
  it("holds a rule for each element, in the catalog's order", () => {
    expect(keysOf(ELEMENT_RULES)).toEqual(ELEMENT_IDS);
  });

  it.each(STAND_INS)("takes %s's part in no moment, as the stand-in", (id) => {
    expect(Object.keys(ELEMENT_RULES[id])).toEqual([]);
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
  it("takes the wind's part in no move, as the stand-in", () => {
    expect(WIND_RULE.afterMove).toBeUndefined();
  });
});
