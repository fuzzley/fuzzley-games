import { eventsOf, flyPicture } from "../../../testing/flights";
import { WOOL } from "../../../testing/stand_ins";
import { BRICK_KINDS } from "../../catalog/bricks";
import { MOST_CHARGE } from "../../tuning";

// A fuzzball straight up from the floor meets a brick in field row 3 at 2.5.
describe("RECHARGES_RULE", () => {
  // Wool stands in for the row zapper, under two plain bricks.
  it("charges the fuzzball that punches through wool to the most, which it punches on with", () => {
    const kinds = { ...BRICK_KINDS, rowZapper: WOOL };

    const flown = flyPicture({
      picture: ["....o....", "....o....", "....-...."],
      charge: 1,
      kinds,
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
        [4, 1, 0],
        [13, 1, MOST_CHARGE - 1],
        [22, 1, MOST_CHARGE - 2],
      ],
    ]);
  });

  it("charges a hot shot that breaks wool, though it is full", () => {
    const kinds = { ...BRICK_KINDS, rowZapper: WOOL };

    const flown = flyPicture({ picture: ["....-...."], hot: true, kinds });

    expect(eventsOf(flown, "recharge")).toEqual([
      { at: 2.5, kind: "recharge", ball: 0, cell: 4 },
    ]);
  });

  // Wool stands in for the row zapper, over a plain brick the player's
  // fuzzball breaks and turns off; its friend flies on up through the cell.
  it("charges a friend that breaks wool", () => {
    const kinds = { ...BRICK_KINDS, rowZapper: WOOL };

    const flown = flyPicture({
      picture: ["....-....", "....o...."],
      friends: 1,
      kinds,
    });

    expect(eventsOf(flown, "recharge")).toEqual([
      expect.objectContaining({ ball: 1, cell: 13 }),
    ]);
  });

  // Wool stands in for the plain brick, two cells left of the row zapper.
  it("charges nothing as a zap breaks wool", () => {
    const kinds = { ...BRICK_KINDS, brick: WOOL };

    const flown = flyPicture({ picture: ["..o.-...."], kinds });

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
