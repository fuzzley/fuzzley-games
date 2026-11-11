import { eventsOf } from "../../../testing/flights";
import { struckOf } from "../../../testing/stand_ins";
import { wallFrom } from "../../../testing/wall_picture";
import { BRICK_KINDS, type TraitOf } from "../../catalog/bricks";
import { type Flown, fly } from "../../flight/flight";
import type { Struck } from "../../flight/hooks";
import {
  CEILINGWARD,
  CEILINGWARD_LEFT,
  CEILINGWARD_RIGHT,
  FLOORWARD,
  FLOORWARD_LEFT,
  FLOORWARD_RIGHT,
  LEFT,
  RIGHT,
} from "../../grid";
import {
  AIMS_PER_DEGREE,
  BORED,
  FIRST_AIM_DEGREES,
  MOST_CHARGE,
} from "../../tuning";
import { TRAIT_RULES } from "../trait_rules";
import { PLATED_RULE } from "./plated";

/** A plated brick's trait. */
const PLATED: TraitOf["plated"] = { kind: "plated" };

/** Every face a brick has. */
const EVERY_FACE = FLOORWARD | CEILINGWARD | LEFT | RIGHT;

/** Returns whether a strike as given hurts a plated brick, and whether it earths the charge, once the rule has run. */
function struckBy(given: Partial<Struck>): [hurts: boolean, earths: boolean] {
  const struck = struckOf(given);
  PLATED_RULE.struck?.(struck, PLATED);
  return [struck.hurts, struck.earths];
}

describe("PLATED_RULE", () => {
  it.each([
    ["floorward", FLOORWARD, FLOORWARD],
    ["ceilingward", CEILINGWARD, CEILINGWARD],
    ["left", LEFT, FLOORWARD | LEFT | RIGHT],
    ["right", RIGHT, FLOORWARD | LEFT | RIGHT],
  ])(
    "shields its brick from a strike on its plated %s face, earthing the charge",
    (_, side, plates) => {
      expect(struckBy({ side, plates, charge: 3 })).toEqual([false, true]);
    },
  );

  it("earths a hot shot on a plated face, whose charge strike() keeps", () => {
    const given = { side: FLOORWARD, plates: FLOORWARD, hot: true };

    expect(struckBy({ ...given, charge: MOST_CHARGE })).toEqual([false, true]);
  });

  it.each([
    ["an unplated brick's", FLOORWARD, 0],
    ["the face opposite its plate", CEILINGWARD, FLOORWARD],
    ["a side face beside its plate", LEFT, FLOORWARD],
  ])("lets a strike on %s hurt it, earthing nothing", (_, side, plates) => {
    expect(struckBy({ side, plates })).toEqual([true, false]);
  });

  it.each([
    ["floorward left", FLOORWARD_LEFT, FLOORWARD, LEFT],
    ["floorward right", FLOORWARD_RIGHT, FLOORWARD, RIGHT],
    ["ceilingward left", CEILINGWARD_LEFT, CEILINGWARD, LEFT],
    ["ceilingward right", CEILINGWARD_RIGHT, CEILINGWARD, RIGHT],
  ])(
    "shields its %s corner only where both its faces are plated",
    (_, side, one, other) => {
      expect([
        struckBy({ side, plates: one | other }),
        struckBy({ side, plates: one }),
        struckBy({ side, plates: other }),
        struckBy({ side, plates: EVERY_FACE & ~one & ~other }),
      ]).toEqual([
        [false, true],
        [true, false],
        [true, false],
        [true, false],
      ]);
    },
  );

  it.each([
    ["a zap", { by: "zap" }],
    ["a blast", { by: "blast" }],
    ["a fuzzball meeting no face", {}],
  ] as const)(
    "lets %s, whose side is 0, hurt a brick plated all round",
    (_, given) => {
      expect(struckBy({ ...given, side: 0, plates: EVERY_FACE })).toEqual([
        true,
        false,
      ]);
    },
  );
});

/** The catalog with a plated brick standing in for the tough brick, so a picture's `2` is one. */
const PLATED_KINDS = {
  ...BRICK_KINDS,
  tough: { ...BRICK_KINDS.tough, name: "Plated brick", traits: [PLATED] },
};

/** Returns the flight of a fuzzball straight up from the floor's middle at a plated brick of 2 hits in field row 3, plated on the faces given. */
function flyAtPlated(plates: number, charge: number, hot = false): Flown {
  const wall = wallFrom(["....2...."], { lowestRow: 3 });
  const bricks = wall.bricks.map((brick) =>
    brick === null ? null : { ...brick, plates },
  );
  const aim = (90 - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
  return fly(
    {
      wall: { ...wall, bricks },
      depth: 11,
      x: 4.5,
      aim,
      charge,
      hot,
      mates: 0,
      friends: 0,
    },
    { bored: BORED, kinds: PLATED_KINDS, traits: TRAIT_RULES },
  );
}

// A fuzzball straight up from the floor meets the brick's floorward face at
// 2.5.
describe("PLATED_RULE, flown", () => {
  it("turns a charged fuzzball off its plate, earthed, the brick whole", () => {
    const flown = flyAtPlated(FLOORWARD, 3);

    expect([
      eventsOf(flown, "strike"),
      eventsOf(flown, "turn").map(({ at, off }) => [at, off]),
    ]).toEqual([
      [
        {
          at: 2.5,
          kind: "strike",
          ball: 0,
          cell: 4,
          took: 0,
          left: 2,
          charge: 0,
          earthed: true,
        },
      ],
      [[2.5, "face"]],
    ]);
  });

  // It bounces off the floor once, and strikes the plate again.
  it("turns a hot shot off its plate with its charge, the brick whole", () => {
    const flown = flyAtPlated(FLOORWARD, MOST_CHARGE, true);

    expect(
      eventsOf(flown, "strike").map(({ took, charge, earthed }) => [
        took,
        charge,
        earthed,
      ]),
    ).toEqual([
      [0, MOST_CHARGE, false],
      [0, MOST_CHARGE, false],
    ]);
  });

  it("takes a hit from a plain fuzzball on a face it isn't plated on", () => {
    const flown = flyAtPlated(CEILINGWARD, 0);

    expect(
      eventsOf(flown, "strike").map(({ took, left }) => [took, left]),
    ).toEqual([[1, 1]]);
  });
});
