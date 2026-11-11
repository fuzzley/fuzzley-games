import { eventsOf, flyPicture } from "../../../testing/flights";
import { MOST_CHARGE } from "../../tuning";

// A fuzzball straight up from the floor meets a brick in field row 3 at 2.5.
describe("RECHARGES_RULE", () => {
  it("charges the fuzzball that punches through wool to the most, which it punches on with", () => {
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
        [4, 1, 0],
        [13, 1, MOST_CHARGE - 1],
        [22, 1, MOST_CHARGE - 2],
      ],
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
