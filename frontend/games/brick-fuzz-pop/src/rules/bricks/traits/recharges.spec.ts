import { eventsOf, flyPicture } from "../../../testing/flights";
import { struckOf } from "../../../testing/stand_ins";
import { MOST_CHARGE } from "../../tuning";
import { RECHARGES_RULE } from "./recharges";

describe("RECHARGES_RULE", () => {
  it.each([
    ["a plain fuzzball", {}],
    ["a charged fuzzball", { charge: 2 }],
  ] as const)("charges %s striking it to the most", (_, given) => {
    const struck = struckOf(given);

    RECHARGES_RULE.struck?.(struck, { kind: "recharges" });

    expect(struck.charge).toBe(MOST_CHARGE);
  });

  it.each([
    ["a zap", { by: "zap", side: 0 }],
    ["a blast", { by: "blast", side: 0 }],
  ] as const)("charges nothing for %s", (_, given) => {
    const struck = struckOf(given);

    RECHARGES_RULE.struck?.(struck, { kind: "recharges" });

    expect(struck.charge).toBe(0);
  });
});

// A fuzzball straight up from the floor meets a brick in field row 3 at 2.5.
describe("RECHARGES_RULE, flown", () => {
  it("charges the fuzzball that strikes wool to the most, and again as it breaks it, which it punches on with", () => {
    const flown = flyPicture({
      picture: ["....o....", "....o....", "....W...."],
      charge: 1,
    });

    expect([
      eventsOf(flown, "recharge"),
      eventsOf(flown, "strike").map(({ cell, took, charge }) => [
        cell,
        took,
        charge,
      ]),
    ]).toEqual([
      [{ at: 2.5, kind: "recharge", ball: 0, cell: 4 }],
      [
        [4, 1, MOST_CHARGE - 1],
        [13, 1, MOST_CHARGE - 1],
        [22, 1, MOST_CHARGE - 2],
      ],
    ]);
  });

  it("punches a plain fuzzball through wool, which flies on through the bricks behind it charged", () => {
    const flown = flyPicture({
      picture: ["....o....", "....o....", "....W...."],
    });

    expect([
      eventsOf(flown, "turn").map(({ off }) => off),
      eventsOf(flown, "strike").map(({ cell, charge }) => [cell, charge]),
      flown.punched,
    ]).toEqual([
      ["ceiling"],
      [
        [4, MOST_CHARGE - 1],
        [13, MOST_CHARGE - 1],
        [22, MOST_CHARGE - 2],
      ],
      [4, 13, 22],
    ]);
  });

  it("charges a hot shot that breaks wool, though it is full", () => {
    const flown = flyPicture({ picture: ["....W...."], hot: true });

    expect(eventsOf(flown, "recharge")).toEqual([
      { at: 2.5, kind: "recharge", ball: 0, cell: 4 },
    ]);
  });

  // The wool stands over a plain brick the player's fuzzball breaks and
  // turns off; its friend flies on up through the cell.
  it("charges a friend that breaks wool", () => {
    const flown = flyPicture({
      picture: ["....W....", "....o...."],
      friends: 1,
    });

    expect(eventsOf(flown, "recharge")).toEqual([
      expect.objectContaining({ ball: 1, cell: 13 }),
    ]);
  });

  it("charges nothing as a zap breaks wool", () => {
    const flown = flyPicture({ picture: ["..W.-...."] });

    expect([
      eventsOf(flown, "recharge"),
      eventsOf(flown, "break").map(({ cell, by }) => [cell, by]),
    ]).toEqual([
      [],
      [
        [4, "fuzzball"],
        [2, "zap"],
      ],
    ]);
  });
});
