import { struckOf } from "../../../testing/stand_ins";
import { MOST_CHARGE } from "../../tuning";
import { EARTHS_RULE } from "./earths";

describe("EARTHS_RULE", () => {
  it.each([
    ["a plain fuzzball", {}],
    ["a charged fuzzball", { charge: 3 }],
    [
      "a hot shot, whose charge strike() keeps",
      { charge: MOST_CHARGE, hot: true },
    ],
  ] as const)("has its brick earth %s, leaving it hurt", (_, given) => {
    const struck = struckOf(given);

    EARTHS_RULE.struck?.(struck, { kind: "earths" });

    expect([struck.hurts, struck.earths]).toEqual([true, true]);
  });
});
