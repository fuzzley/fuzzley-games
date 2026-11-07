import { edgePlaceOf, entriesOf, entryOf } from "../../testing/crossings";
import {
  type PictureOptions,
  catchOn,
  fieldFrom,
  loggedOn,
  placeStray,
  shipOf,
  stepTimes,
} from "../../testing/field_picture";
import { RADIANS_PER_DEGREE } from "../angles";
import { PICKUPS } from "../catalog/pickups";
import { type Field, stepField } from "../field/field";
import { guardShip } from "../ship/ship";
import { stepsIn } from "../stepper";
import {
  FIRST_SHIP_POINTS,
  PICKUP_PULL_SPEED,
  STEP_S,
  STRAY_CATCH_REACH,
  STRAY_FIRST_MS,
  STRAY_NEXT_MS,
  STRAY_POINTS,
  STRAY_RADIUS,
  STRAY_SPEED,
  STRAY_TILT,
  STRAY_TURN,
} from "../tuning";
import { nextStrayAfter } from "./strays";

/** A rock in the field's corner, which keeps the wave from clearing, and the ship, far off it. */
const PICTURE = ["L", "", "", "", "........^"];

/** Where the picture's ship is. */
const SHIP_X = 34;
const SHIP_Y = 18;

/** The picture's field's width. */
const WIDTH = 72;

/** How far a stray crosses in a step. */
const STRAY_STEP = STRAY_SPEED * STEP_S;

/** How far off the field a stray lies a step short of leaving it: its bubble's reach, less a step. */
const SHORT_OF_LEAVING = STRAY_RADIUS - STRAY_STEP;

/** How far a Magnet draws a stray in, in a step. */
const PULLED = PICKUP_PULL_SPEED * STEP_S;

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/** The least a stray must be on the field for, so the ship can fly to it. */
const LONG_ENOUGH_MS = 5000;

/** The seeds the specs of what is drawn try. */
const SEEDS = Array.from({ length: 40 }, (_, seed) => seed + 1);

/**
 * Steps a field until its stray has left, and returns how many steps its
 * middle was on the field.
 *
 * @throws {Error} If it hasn't left within a minute.
 */
function stepsOnField(field: Field): number {
  const stray = field.strays.adrift;
  const { width, height } = field.torus;
  let on = 0;
  for (let step = 0; step < stepsIn(60_000); step++) {
    if (!stray.live) return on;
    stepField(field);
    if (stray.x >= 0 && stray.x < width && stray.y >= 0 && stray.y < height) {
      on += 1;
    }
  }
  throw new Error("The stray didn't leave.");
}

/** Returns the picture's field, its stray due in the coming step. */
function strayDue(options: PictureOptions = {}): Field {
  const field = fieldFrom(PICTURE, { strays: 1, ...options });
  field.steps = field.strays.nextAt - 1;
  return field;
}

/** Returns the picture's field with the stray it lets leave across its right edge, one still to send. */
function strayLeft(): Field {
  const field = fieldFrom(PICTURE, { strays: 2 });
  field.strays.sent = 1;
  placeStray(field, WIDTH + STRAY_RADIUS, 30);
  stepField(field);
  return field;
}

describe("a wave's strays", () => {
  it("sends none before its first is due", () => {
    const field = fieldFrom(PICTURE, { strays: 1 });

    stepTimes(field, stepsIn(STRAY_FIRST_MS) - 1);

    expect(field.strays.adrift.live).toBe(false);
  });

  it.each([
    [stepsIn(1000) - 1, 0],
    [stepsIn(1000), 1],
  ])(
    "sends its first as late as its field's setup says, by step %d sending %d",
    (steps, sent) => {
      const field = fieldFrom(PICTURE, { strays: 1, strayFirstMs: 1000 });

      stepTimes(field, steps);

      expect(field.strays.sent).toBe(sent);
    },
  );

  it("sends its first once it is due, in the next color in turn, logging it", () => {
    const field = fieldFrom(PICTURE, { strays: 1 });

    stepTimes(field, stepsIn(STRAY_FIRST_MS));

    const { adrift, sent } = field.strays;
    expect([
      adrift.live,
      adrift.pilot,
      field.crew.lastGiven,
      sent,
      loggedOn(field).at(-1),
    ]).toEqual([
      true,
      3,
      3,
      1,
      expect.objectContaining({ kind: "strayed", pilot: 3 }),
    ]);
  });

  it("sends a stray still where it came in a step ago", () => {
    const field = strayDue();

    stepField(field);

    const { adrift } = field.strays;
    expect([adrift.lastX, adrift.lastY]).toEqual([adrift.x, adrift.y]);
  });

  it("sends none for a wave without strays", () => {
    const field = strayDue({ strays: 0 });

    stepField(field);

    expect(field.strays.adrift.live).toBe(false);
  });

  it("gives a stray a color no pilot wears, flying or at home", () => {
    const field = strayDue({
      crew: { flying: [3, 0], home: [4], lastGiven: 2 },
    });

    stepField(field);

    expect(field.strays.adrift.pilot).toBe(5);
  });

  it.each(SEEDS.slice(0, 8))(
    "logs a stray's coming on the edge it comes in by, across its bubble from it, from seed %d",
    (seed) => {
      const field = strayDue({ seed });

      stepField(field);

      const place = edgePlaceOf(
        loggedOn(field).at(-1),
        field.strays.adrift,
        field.torus,
      );
      expect(place).toEqual([expect.closeTo(STRAY_RADIUS), true]);
    },
  );

  it("sends a stray in off any edge, its bubble out of sight, heading across within its tilt", () => {
    const entries = SEEDS.map((seed) => {
      const field = strayDue({ seed });
      stepField(field);
      return entryOf(field.strays.adrift, field.torus);
    });

    expect(entriesOf(entries, STRAY_RADIUS, STRAY_TILT)).toEqual({
      edges: 4,
      wrong: [],
    });
  });

  it.each([
    ["the narrowest field", { width: 40, height: 40 }],
    ["the widest field", { width: 88, height: 40 }],
  ])("keeps every stray on %s long enough to fly to", (_, torus) => {
    const onField = SEEDS.map((seed) => {
      const field = strayDue({ seed, torus });
      field.ship = null;
      stepField(field);
      return stepsOnField(field);
    });

    expect(Math.min(...onField)).toBeGreaterThanOrEqual(
      stepsIn(LONG_ENOUGH_MS),
    );
  });

  it("curves a stray's crossing to one side or the other, within its span", () => {
    const turns = SEEDS.map((seed) => {
      const field = strayDue({ seed });
      stepField(field);
      return field.strays.adrift.turn / RADIANS_PER_DEGREE;
    });

    expect({
      sides: new Set(turns.map(Math.sign)).size,
      outside: turns.filter(
        (turn) =>
          Math.abs(turn) < STRAY_TURN.least - SLIVER ||
          Math.abs(turn) > STRAY_TURN.most + SLIVER,
      ),
    }).toEqual({ sides: 2, outside: [] });
  });

  it.each([
    ["no stray a step before", -1, false],
    ["the next once", 0, true],
  ])(
    "sends %s its time has come after the last has gone",
    (_, beyond, sent) => {
      const field = strayLeft();

      stepTimes(field, stepsIn(STRAY_NEXT_MS) + beyond);

      expect(field.strays.adrift.live).toBe(sent);
    },
  );

  it("sends no more than the wave's strays", () => {
    const field = strayLeft();
    field.strays.sent = 2;

    stepTimes(field, stepsIn(STRAY_NEXT_MS) * 2);

    expect(field.strays.adrift.live).toBe(false);
  });
});

describe("a stray adrift", () => {
  it("crosses at its speed along its heading", () => {
    const field = fieldFrom(PICTURE);
    const stray = placeStray(field, 10, 30, 0.5);

    stepField(field);

    expect([stray.x, stray.y]).toEqual([
      expect.closeTo(10 + Math.cos(0.5) * STRAY_STEP),
      expect.closeTo(30 + Math.sin(0.5) * STRAY_STEP),
    ]);
  });

  it("turns its heading by its turn as it crosses, on a curve", () => {
    const field = fieldFrom(PICTURE);
    const stray = placeStray(field, 10, 30);
    stray.turn = 0.5;

    stepTimes(field, 120);

    expect(stray.heading).toBeCloseTo(0.5);
  });

  it("keeps where it was a step ago", () => {
    const field = fieldFrom(PICTURE);
    const stray = placeStray(field, 10, 30);

    stepField(field);

    expect([stray.lastX, stray.lastY]).toEqual([10, 30]);
  });

  it("crosses an edge without wrapping", () => {
    const field = fieldFrom(PICTURE);
    const stray = placeStray(field, WIDTH - 0.01, 30);

    stepField(field);

    expect(stray.x).toBeGreaterThan(WIDTH);
  });

  // Each stray heads out across an edge, a step and a sliver short of
  // leaving, or past it.
  it.each([
    [
      "stays on its way just within",
      "right",
      WIDTH + SHORT_OF_LEAVING - SLIVER,
      30,
      0,
      true,
    ],
    [
      "leaves just past",
      "right",
      WIDTH + SHORT_OF_LEAVING + SLIVER,
      30,
      0,
      false,
    ],
    [
      "stays on its way just within",
      "left",
      -SHORT_OF_LEAVING + SLIVER,
      30,
      Math.PI,
      true,
    ],
    [
      "leaves just past",
      "left",
      -SHORT_OF_LEAVING - SLIVER,
      30,
      Math.PI,
      false,
    ],
    [
      "stays on its way just within",
      "top",
      30,
      -SHORT_OF_LEAVING + SLIVER,
      1.5 * Math.PI,
      true,
    ],
    [
      "leaves just past",
      "top",
      30,
      -SHORT_OF_LEAVING - SLIVER,
      1.5 * Math.PI,
      false,
    ],
    [
      "stays on its way just within",
      "bottom",
      30,
      40 + SHORT_OF_LEAVING - SLIVER,
      Math.PI / 2,
      true,
    ],
    [
      "leaves just past",
      "bottom",
      30,
      40 + SHORT_OF_LEAVING + SLIVER,
      Math.PI / 2,
      false,
    ],
  ])("%s its bubble off the field's %s edge", (_, __, x, y, heading, live) => {
    const field = fieldFrom(PICTURE);
    const stray = placeStray(field, x, y, heading);

    stepField(field);

    expect(stray.live).toBe(live);
  });

  it.each([
    ["is brought home by a ship just within", SLIVER, false],
    ["isn't by one just past", -SLIVER, true],
  ])("%s its reach", (_, beyond, live) => {
    const field = fieldFrom(PICTURE);
    const stray = placeStray(
      field,
      SHIP_X - STRAY_CATCH_REACH - STRAY_STEP + beyond,
      SHIP_Y,
    );

    stepField(field);

    expect(stray.live).toBe(live);
  });

  it("waits at home once brought home, behind those home before it, counted and logged", () => {
    const field = fieldFrom(PICTURE, {
      crew: { flying: [0, 1], home: [6], lastGiven: 6 },
    });
    placeStray(field, SHIP_X, SHIP_Y, Math.PI / 2, 5);

    stepField(field);

    const logged = loggedOn(field).find((each) => each.kind === "home");
    expect([
      field.crew.home,
      field.strays.broughtHome,
      field.strays.nextAt,
      logged?.kind,
      logged?.pilot,
      logged?.x,
      logged?.y,
      logged?.waiting,
    ]).toEqual([
      [6, 5],
      1,
      field.steps + stepsIn(STRAY_NEXT_MS),
      "home",
      5,
      expect.closeTo(SHIP_X),
      expect.closeTo(SHIP_Y + STRAY_STEP),
      2,
    ]);
  });

  it("is logged waiting at home, though the ship its points bring takes it at once", () => {
    const field = fieldFrom(PICTURE, {
      crew: { flying: [0, 1], home: [], lastGiven: 6 },
      banked: FIRST_SHIP_POINTS - STRAY_POINTS,
    });
    placeStray(field, SHIP_X, SHIP_Y, Math.PI / 2, 5);

    stepField(field);

    expect(
      loggedOn(field)
        .filter((each) => each.kind === "home" || each.kind === "gained")
        .map(({ kind, waiting, ships, fromHome }) => ({
          kind,
          waiting,
          ships,
          fromHome,
        })),
    ).toEqual([
      { kind: "home", waiting: 1, ships: 2, fromHome: false },
      { kind: "gained", waiting: 0, ships: 3, fromHome: true },
    ]);
  });

  it("is brought home by a guarded ship", () => {
    const field = fieldFrom(PICTURE);
    guardShip(shipOf(field), 500);
    const stray = placeStray(field, SHIP_X, SHIP_Y);

    stepField(field);

    expect(stray.live).toBe(false);
  });

  it("crosses on with no ship to bring it home", () => {
    const field = fieldFrom(PICTURE);
    field.ship = null;
    const stray = placeStray(field, SHIP_X, SHIP_Y);

    stepField(field);

    expect([stray.live, stray.x]).toEqual([
      true,
      expect.closeTo(SHIP_X + STRAY_STEP),
    ]);
  });

  // Each stray lies half a unit within an edge or past it, heading down, too
  // slowly to cross it in a step, and the ship half a unit within the edge
  // across the wrap from it.
  it.each([
    ["is brought home with its middle on the field", 0.5, 18, 71.5, 18, false],
    ["isn't with its middle off the left edge", -0.5, 18, 71.5, 18, true],
    ["isn't with its middle off the right edge", 72.5, 18, 0.5, 18, true],
    ["isn't with its middle off the top edge", 34, -0.5, 34, 39.5, true],
    ["isn't with its middle off the bottom edge", 34, 40.5, 34, 0.5, true],
  ])("%s, across the wrap", (_, x, y, shipX, shipY, live) => {
    const field = fieldFrom(PICTURE);
    const ship = shipOf(field);
    ship.x = shipX;
    ship.y = shipY;
    const stray = placeStray(field, x, y, Math.PI / 2);

    stepField(field);

    expect(stray.live).toBe(live);
  });

  // Each stray heads down, across the way to the ship.
  it.each([
    ["is drawn in toward the ship from just within", SLIVER, PULLED, 0],
    ["crosses on from just past", -SLIVER, 0, STRAY_STEP],
  ])("%s a Magnet's reach", (_, beyond, acrossBy, downBy) => {
    const field = fieldFrom(PICTURE);
    catchOn(field, "magnet");
    const x = SHIP_X - PICKUPS.magnet.effect.reach + beyond;
    const stray = placeStray(field, x, SHIP_Y, Math.PI / 2);

    stepField(field);

    expect([stray.x - x, stray.y - SHIP_Y]).toEqual([
      expect.closeTo(acrossBy),
      expect.closeTo(downBy),
    ]);
  });

  it("is drawn in by nothing but a Magnet, however near the ship", () => {
    const field = fieldFrom(PICTURE);
    const stray = placeStray(field, SHIP_X - 2.5, SHIP_Y, Math.PI / 2);

    stepField(field);

    expect([stray.x, stray.y]).toEqual([
      expect.closeTo(SHIP_X - 2.5),
      expect.closeTo(SHIP_Y + STRAY_STEP),
    ]);
  });

  it("is drawn in onto the field as it comes in, its middle still off it", () => {
    const field = fieldFrom(PICTURE);
    catchOn(field, "magnet");
    shipOf(field).x = 10;
    const stray = placeStray(field, -0.5, SHIP_Y, Math.PI / 2);

    stepField(field);

    expect([stray.x, stray.y]).toEqual([
      expect.closeTo(-0.5 + PULLED),
      expect.closeTo(SHIP_Y),
    ]);
  });

  it("is drawn in the straight way only, never across an edge", () => {
    const field = fieldFrom(PICTURE);
    catchOn(field, "magnet");
    shipOf(field).x = WIDTH - 3;
    const stray = placeStray(field, 0.05, SHIP_Y, Math.PI / 2);

    stepField(field);

    expect([stray.x, stray.y]).toEqual([
      expect.closeTo(0.05),
      expect.closeTo(SHIP_Y + STRAY_STEP),
    ]);
  });
});

describe("nextStrayAfter", () => {
  it("puts the next stray eight seconds' steps, 960, after the step one goes at", () => {
    expect(nextStrayAfter(600)).toBe(1560);
  });
});
