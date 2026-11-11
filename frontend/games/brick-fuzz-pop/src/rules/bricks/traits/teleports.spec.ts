import { eventsOf, flyPicture, near } from "../../../testing/flights";
import { wallFrom } from "../../../testing/wall_picture";
import { BRICK_KINDS } from "../../catalog/bricks";
import { fly } from "../../flight/flight";
import { AIMS_PER_DEGREE, BORED, FIRST_AIM_DEGREES } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";

/** A portal's twin, its pair's other portal, 3 rows over it and 4 columns right. */
const PAIR = ["......@..", ".........", ".........", "..@......"];

// Straight up from 2.5, its lowest row in field row 4: the fuzzball's
// middle crosses into the lower portal's cell 3.75 on.
describe("TELEPORTS_RULE, flown", () => {
  // It comes out of the upper one's middle, turns off the ceiling, crosses
  // into the upper one's cell at 9.75, and comes out of the lower one's.
  it("sends a fuzzball crossing into a portal out of its twin, and back again once it has turned", () => {
    const flown = flyPicture({ picture: PAIR, lowestRow: 4, x: 2.5 });

    expect(
      eventsOf(flown, "portal").map(({ at, from, to }) => [at, from, to]),
    ).toEqual([
      [3.75, 2, 33],
      [9.75, 33, 2],
    ]);
  });

  it("lets a fuzzball through a portal whose twin waits over the ceiling, there and back", () => {
    const picture = [
      "......@..",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "..@......",
    ];

    const flown = flyPicture({ picture, lowestRow: 4, x: 2.5 });

    expect([
      eventsOf(flown, "portal"),
      eventsOf(flown, "turn").map(({ off }) => off),
      eventsOf(flown, "land").map(({ x }) => x),
    ]).toEqual(near([[], ["ceiling"], [2.5]]));
  });

  // No level lays a portal out alone, but a wall handed in may hold one.
  it("lets a fuzzball through a portal with no twin, there and back", () => {
    const wall = wallFrom(PAIR, { lowestRow: 4 });
    const bricks = wall.bricks.map((brick) =>
      brick === null ? null : { ...brick, twin: null },
    );
    const aim = (90 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;

    const flown = fly(
      {
        wall: { ...wall, bricks },
        depth: 11,
        x: 2.5,
        aim,
        charge: 0,
        hot: false,
        mates: 0,
        friends: 0,
      },
      { bored: BORED, kinds: BRICK_KINDS, traits: TRAIT_RULES },
    );

    expect([
      eventsOf(flown, "portal"),
      eventsOf(flown, "turn").map(({ off }) => off),
      eventsOf(flown, "land").map(({ x }) => x),
    ]).toEqual(near([[], ["ceiling"], [2.5]]));
  });
});
