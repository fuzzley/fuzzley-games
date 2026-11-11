import { eventsOf, near } from "../../../testing/flights";
import { STAND_INS } from "../../../testing/stand_ins";
import { wallFrom } from "../../../testing/wall_picture";
import { type Flown, fly } from "../../flight/flight";
import { AIMS_PER_DEGREE, BORED, FIRST_AIM_DEGREES } from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";

/**
 * Returns the flight of a fuzzball straight up from 2.5 at a wall drawn as
 * a picture, its lowest row in field row 4, in a field 11 deep, its
 * portals, the column zappers' stand-ins, each other's twins if there are
 * two.
 */
function flyAtPortals(picture: readonly string[]): Flown {
  const wall = wallFrom(picture, { lowestRow: 4 });
  const portals = wall.bricks.flatMap((brick, cell) =>
    brick?.kind === "columnZapper" ? [cell] : [],
  );
  const bricks = wall.bricks.map((brick, cell) =>
    brick !== null && portals.includes(cell)
      ? { ...brick, twin: portals.find((other) => other !== cell) ?? null }
      : brick,
  );
  const aim = (90 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
  return fly(
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
    { bored: BORED, kinds: STAND_INS, traits: TRAIT_RULES },
  );
}

describe("TELEPORTS_RULE, flown", () => {
  // The fuzzball's middle crosses into the lower portal's cell 3.75 on and
  // comes out of the upper one's middle; it turns off the ceiling, crosses
  // into the upper one's cell at 9.75, and comes out of the lower one's.
  it("sends a fuzzball crossing into a portal out of its twin, and back again once it has turned", () => {
    const flown = flyAtPortals([
      "......|..",
      ".........",
      ".........",
      "..|......",
    ]);

    expect(
      eventsOf(flown, "portal").map(({ at, from, to }) => [at, from, to]),
    ).toEqual([
      [3.75, 2, 33],
      [9.75, 33, 2],
    ]);
  });

  it.each([
    ["has no twin", ["..|......"]],
    [
      "has a twin waiting over the ceiling",
      [
        "......|..",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "..|......",
      ],
    ],
  ])(
    "lets a fuzzball through a portal that %s, there and back",
    (_, picture) => {
      const flown = flyAtPortals(picture);

      expect([
        eventsOf(flown, "portal"),
        eventsOf(flown, "turn").map(({ off }) => off),
        eventsOf(flown, "land").map(({ x }) => x),
      ]).toEqual(near([[], ["ceiling"], [2.5]]));
    },
  );
});
