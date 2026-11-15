import {
  catchOn,
  fieldFrom,
  kindsLoggedOn,
  loggedOn,
  shipOf,
} from "../../testing/field_picture";
import { TURN } from "../angles";
import type { Field } from "../field/field";
import type { Crew } from "../ship/pilots";
import { STEP_MS, stepsIn } from "../stepper";
import {
  LOOSE_LIFE_MS,
  LOOSE_SLOWING_MS,
  LOOSE_SPEED,
  LOOSE_SWELL_MS,
  MOST_CREW,
  STEP_S,
  STRAY_CATCH_REACH,
  STRAY_SPEED,
  TOW_HOOK,
  TOW_LINK,
} from "../tuning";
import {
  type Loose,
  createLoose,
  floatAllHome,
  knockLastLoose,
  loosePilots,
  stepLoose,
  takeAllBack,
  withLooseGoneHome,
} from "./loose";

/** A rock in the field's corner, which keeps the wave from clearing, and the ship, far off it, its nose up. */
const PICTURE = ["L", "", "", "", "........^"];

/** Where the picture's ship lies. */
const SHIP_X = 34;
const SHIP_Y = 18;

/** How far behind the ship's middle the last of its first crew in tow rides. */
const LAST_BEHIND = TOW_HOOK + 2 * TOW_LINK;

/** The steps one knocked loose takes to swell, before which the ship can't catch it. */
const SWELL_STEPS = stepsIn(LOOSE_SWELL_MS);

/** Returns the picture's field, its crew a run's first unless a spec gives another. */
function fieldOf(crew?: Crew): Field {
  return fieldFrom(PICTURE, crew ? { crew } : {});
}

/** Returns the picture's field with the last of its first crew knocked loose, and the slot it flies in. */
function knocked(crew?: Crew): [Field, Loose] {
  const field = fieldOf(crew);
  knockLastLoose(field, shipOf(field));
  return [field, liveOf(field)];
}

/** Returns a field's one slot of the crew knocked loose that is out, failing the spec for another number. */
function liveOf(field: Field): Loose {
  const [loose, ...others] = field.loose.filter((each) => each.live);
  if (!loose || others.length > 0) throw new Error("Expected one loose.");
  return loose;
}

/** Returns a number to a millionth, as a place is compared. */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Moves the crew knocked loose on by steps, the field's steps counted as a step of it would. */
function stepOn(field: Field, steps = 1): void {
  for (let step = 0; step < steps; step++) {
    field.steps += 1;
    stepLoose(field);
  }
}

/** Puts one knocked loose still on the ship's middle, swelled, where it reaches the ship. */
function onShip(field: Field, loose: Loose): void {
  loose.x = SHIP_X;
  loose.y = SHIP_Y;
  loose.speed = 0;
  loose.knockedAt = field.steps - SWELL_STEPS;
}

describe("createLoose", () => {
  it("makes a slot for each of the most that ride in tow, none of them out", () => {
    const slots = createLoose();

    expect([slots.length, slots.filter((loose) => loose.live)]).toEqual([
      MOST_CREW - 1,
      [],
    ]);
  });
});

describe("knockLastLoose", () => {
  it("knocks the last in tow out of the line and returns its pilot", () => {
    const field = fieldOf();

    const pilot = knockLastLoose(field, shipOf(field));

    expect([pilot, field.crew.tow]).toEqual([2, [1]]);
  });

  it("sends it flying from where it rode, straight away from the ship, as of the step", () => {
    const field = fieldOf();
    field.steps = 40;

    knockLastLoose(field, shipOf(field));

    const { x, y, lastX, lastY, ...rest } = liveOf(field);
    expect([[x, y, lastX, lastY].map(round), rest]).toEqual([
      [SHIP_X, SHIP_Y + LAST_BEHIND, SHIP_X, SHIP_Y + LAST_BEHIND].map(round),
      {
        live: true,
        pilot: 2,
        wayX: 0,
        wayY: 1,
        speed: LOOSE_SPEED,
        knockedAt: 40,
      },
    ]);
  });

  it("sends one that rode across an edge from the ship away from it the short way", () => {
    const field = fieldOf();
    const ship = shipOf(field);
    ship.y = 39;
    field.tow[1]!.y = 2;

    knockLastLoose(field, ship);

    expect([liveOf(field).wayX, liveOf(field).wayY]).toEqual([0, 1]);
  });

  it("sends one away from the ship from where it rode, whichever way the ship now heads", () => {
    const field = fieldOf();
    shipOf(field).angle = TURN / 4;

    knockLastLoose(field, shipOf(field));

    expect([liveOf(field).wayX, liveOf(field).wayY]).toEqual([0, 1]);
  });

  it("sends one that rode on the ship's middle the way the ship's tail points", () => {
    const field = fieldOf();
    const ship = shipOf(field);
    ship.angle = 0;
    field.tow[1]!.x = ship.x;
    field.tow[1]!.y = ship.y;

    knockLastLoose(field, ship);

    expect([liveOf(field).wayX, liveOf(field).wayY]).toEqual([-1, -0]);
  });

  it("floats the one knocked loose longest ago home to make room, with every slot taken", () => {
    const tow = Array.from({ length: MOST_CREW - 1 }, (_, at) => at + 1);
    const field = fieldOf({ pilot: 0, tow, home: [], lastGiven: 7 });
    for (const [at, loose] of field.loose.entries()) {
      Object.assign(loose, { live: true, pilot: 7, knockedAt: 9 - at });
    }

    knockLastLoose(field, shipOf(field));

    const [last] = field.loose.slice(-1);
    expect({
      home: field.crew.home,
      events: kindsLoggedOn(field),
      last: last?.pilot,
      knockedAt: last?.knockedAt,
    }).toEqual({ home: [7], events: ["floated"], last: 5, knockedAt: 0 });
  });

  it("throws for a crew with no one in tow", () => {
    const field = fieldOf({ pilot: 0, tow: [], home: [], lastGiven: 0 });

    expect(() => knockLastLoose(field, shipOf(field))).toThrow(RangeError);
  });

  it("throws for a field with no slot for the crew knocked loose", () => {
    const field = { ...fieldOf(), loose: [] };

    expect(() => knockLastLoose(field, shipOf(fieldOf()))).toThrow(RangeError);
  });
});

describe("stepLoose", () => {
  it("flies one knocked loose on its way, slowing toward a stray's drift", () => {
    const [field, loose] = knocked();
    const startY = loose.y;

    stepOn(field);

    const speed =
      STRAY_SPEED +
      (LOOSE_SPEED - STRAY_SPEED) * 0.5 ** (STEP_MS / LOOSE_SLOWING_MS);
    expect([loose.speed, loose.y]).toEqual([
      expect.closeTo(speed),
      expect.closeTo(startY + speed * STEP_S),
    ]);
  });

  it("halves its speed past a stray's drift in the time its slowing takes", () => {
    const [field, loose] = knocked();

    stepOn(field, stepsIn(LOOSE_SLOWING_MS));

    expect(loose.speed).toBeCloseTo(
      STRAY_SPEED + (LOOSE_SPEED - STRAY_SPEED) / 2,
    );
  });

  it("keeps where it was a step ago, for the scene to draw between", () => {
    const [field, loose] = knocked();
    const { x, y } = loose;

    stepOn(field);

    expect([loose.lastX, loose.lastY]).toEqual([x, y]);
  });

  it("wraps one that flies past an edge to the far side", () => {
    const [field, loose] = knocked();
    loose.y = 39.99;

    stepOn(field);

    expect(loose.y).toBeLessThan(1);
  });

  it("floats one home once its time is up, out of the run, logged", () => {
    const [field, loose] = knocked();

    stepOn(field, stepsIn(LOOSE_LIFE_MS));

    expect([loose.live, field.crew.home, loggedOn(field).at(-1)]).toEqual([
      false,
      [2],
      expect.objectContaining({ kind: "floated", pilot: 2, inTow: 1 }),
    ]);
  });

  it("lets the ship catch one that reaches it once it has swelled, back at the line's end, logged", () => {
    const [field, loose] = knocked();
    onShip(field, loose);

    stepOn(field);

    expect([loose.live, field.crew.tow, loggedOn(field).at(-1)]).toEqual([
      false,
      [1, 2],
      expect.objectContaining({ kind: "recaught", pilot: 2, inTow: 2 }),
    ]);
  });

  it("lays one caught again a link behind the last in tow", () => {
    const [field, loose] = knocked();
    onShip(field, loose);

    stepOn(field);

    const [first, second] = field.tow;
    expect([second!.x, second!.y]).toEqual([
      expect.closeTo(first!.x),
      expect.closeTo(first!.y + TOW_LINK),
    ]);
  });

  it("keeps the ship from catching one before it has swelled", () => {
    const [field, loose] = knocked();
    onShip(field, loose);
    loose.knockedAt = field.steps - SWELL_STEPS + 2;

    stepOn(field);

    expect(loose.live).toBe(true);
  });

  it.each([
    ["catches one just within", -0.01, false],
    ["leaves one just past", 0.01, true],
  ])("%s the ship's reach", (_, beyond, live) => {
    const [field, loose] = knocked();
    onShip(field, loose);
    loose.x = SHIP_X + STRAY_CATCH_REACH + beyond;

    stepOn(field);

    expect(loose.live).toBe(live);
  });

  it("floats one the ship catches with the most in tow home, logged", () => {
    const [field, loose] = knocked();
    field.towing = { mostInTow: 1 };
    onShip(field, loose);

    stepOn(field);

    expect([field.crew.tow, field.crew.home, kindsLoggedOn(field)]).toEqual([
      [1],
      [2],
      ["floated"],
    ]);
  });

  it("flies one on with no ship to catch it", () => {
    const [field, loose] = knocked();
    onShip(field, loose);
    loose.speed = STRAY_SPEED;
    field.ship = null;

    stepOn(field);

    expect([loose.live, loose.y]).toEqual([
      true,
      expect.closeTo(SHIP_Y + STRAY_SPEED * STEP_S),
    ]);
  });

  it("draws one within a Magnet's reach in toward the ship the short way, across the wrap", () => {
    const field = fieldOf();
    catchOn(field, "magnet");
    const ship = shipOf(field);
    ship.y = 1;
    knockLastLoose(field, ship);
    const loose = liveOf(field);
    loose.y = 38;
    loose.wayY = -1;

    stepOn(field);

    expect(loose.y).toBeGreaterThan(38);
  });

  it("leaves one past a Magnet's reach to fly on its way", () => {
    const field = fieldOf();
    catchOn(field, "magnet");
    knockLastLoose(field, shipOf(field));
    const loose = liveOf(field);
    loose.y = SHIP_Y + field.pullReach + 1;

    stepOn(field);

    expect(loose.y).toBeGreaterThan(SHIP_Y + field.pullReach + 1);
  });
});

describe("floatAllHome", () => {
  it("floats every one knocked loose home, logging each", () => {
    const [field] = knocked({
      pilot: 0,
      tow: [1, 4, 6],
      home: [],
      lastGiven: 6,
    });
    knockLastLoose(field, shipOf(field));

    floatAllHome(field);

    expect({
      loose: loosePilots(field),
      home: field.crew.home,
      events: kindsLoggedOn(field),
    }).toEqual({ loose: [], home: [6, 4], events: ["floated", "floated"] });
  });
});

describe("takeAllBack", () => {
  it("takes every one knocked loose back at the line's end, logging each", () => {
    const [field] = knocked({
      pilot: 0,
      tow: [1, 4, 6],
      home: [],
      lastGiven: 6,
    });
    knockLastLoose(field, shipOf(field));

    takeAllBack(field);

    expect([field.crew.tow, kindsLoggedOn(field)]).toEqual([
      [1, 6, 4],
      ["recaught", "recaught"],
    ]);
  });
});

describe("withLooseGoneHome", () => {
  it("returns the crew with every one knocked loose gone home, in the order of their slots", () => {
    const [field] = knocked({
      pilot: 0,
      tow: [1, 4, 6],
      home: [2],
      lastGiven: 6,
    });
    knockLastLoose(field, shipOf(field));

    expect(withLooseGoneHome(field.crew, field)).toMatchObject({
      tow: [1],
      home: [2, 6, 4],
    });
  });

  it("returns a crew with no one knocked loose as it is", () => {
    const field = fieldOf();

    expect(withLooseGoneHome(field.crew, field)).toBe(field.crew);
  });
});

describe("loosePilots", () => {
  it("returns the pilots of the crew knocked loose", () => {
    const [field] = knocked();

    expect(loosePilots(field)).toEqual([2]);
  });
});
