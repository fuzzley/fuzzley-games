import { struckOf } from "../../../testing/stand_ins";
import { MOST_CHARGE } from "../../tuning";
import { SHELLED_RULE } from "./shelled";

describe("SHELLED_RULE", () => {
  it("shields its brick from a plain fuzzball, earthing nothing", () => {
    const struck = struckOf();

    SHELLED_RULE.struck?.(struck, { kind: "shelled" });

    expect([struck.hurts, struck.earths]).toEqual([false, false]);
  });

  it.each([
    ["a charged fuzzball", { charge: 1 }],
    ["a hot shot", { charge: MOST_CHARGE, hot: true }],
    ["a zap", { by: "zap", side: 0 }],
    ["a blast", { by: "blast", side: 0 }],
  ] as const)("leaves its brick hurt by %s, earthing nothing", (_, given) => {
    const struck = struckOf(given);

    SHELLED_RULE.struck?.(struck, { kind: "shelled" });

    expect([struck.hurts, struck.earths]).toEqual([true, false]);
  });
});
