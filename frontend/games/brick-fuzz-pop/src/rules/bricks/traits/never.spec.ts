import { struckOf } from "../../../testing/stand_ins";
import { MOST_CHARGE } from "../../tuning";
import { NEVER_RULE } from "./never";

describe("NEVER_RULE", () => {
  it.each([
    ["a plain fuzzball", {}],
    ["a charged fuzzball", { charge: 3 }],
    ["a hot shot", { charge: MOST_CHARGE, hot: true }],
    ["a zap", { by: "zap", side: 0 }],
    ["a blast", { by: "blast", side: 0 }],
  ] as const)("shields its brick from %s, earthing nothing", (_, given) => {
    const struck = struckOf(given);

    NEVER_RULE.struck?.(struck, { kind: "never" });

    expect([struck.hurts, struck.earths]).toEqual([false, false]);
  });
});
