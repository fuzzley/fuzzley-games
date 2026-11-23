import { FLIGHT_RULES } from "../tuning";
import { strike, takesStrikes } from "./strike";

describe("takesStrikes", () => {
  it.each(["brick", "tough"] as const)(
    "strikes the %s it turns off",
    (kind) => {
      expect(takesStrikes(kind)).toBe(true);
    },
  );

  it("turns off steel without a strike", () => {
    expect(takesStrikes("steel")).toBe(false);
  });
});

describe("strike", () => {
  it("takes a hit off a brick, which breaks", () => {
    expect(strike(1, false, FLIGHT_RULES)).toEqual({ took: 1, left: 0 });
  });

  it("takes a pip off a tough brick, which holds", () => {
    expect(strike(4, false, FLIGHT_RULES)).toEqual({ took: 1, left: 3 });
  });

  it("takes a hot shot's two hits off a tough brick", () => {
    expect(strike(3, true, FLIGHT_RULES)).toEqual({ took: 2, left: 1 });
  });

  it("takes no more hits than a brick has, a hot shot's strike on a brick of one taking one", () => {
    expect(strike(1, true, FLIGHT_RULES)).toEqual({ took: 1, left: 0 });
  });

  it("takes the hot shot's hits it is handed", () => {
    expect(strike(6, true, { hotHits: 4 })).toEqual({ took: 4, left: 2 });
  });
});
