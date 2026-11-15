import { edgePlaceOf, entriesOf, entryOf } from "../../testing/crossings";
import {
  type PictureOptions,
  fieldFrom,
  kindsLoggedOn,
  loggedOn,
  placeBurr,
  placeComet,
  placeRock,
  placeShot,
  shipOf,
  speedOf,
  stepTimes,
  wholeRocks,
} from "../../testing/field_picture";
import { RADIANS_PER_DEGREE } from "../angles";
import { ROCK_KINDS } from "../catalog/rocks";
import { type Field, steerField, stepField } from "../field/field";
import { hitRock } from "../rocks/rocks";
import { STILL, guardShip } from "../ship/ship";
import { zap } from "../sparks/zap";
import { stepsIn } from "../stepper";
import {
  BURR_FIRST_MS,
  BURR_NEXT_MS,
  BURR_POINTS,
  BURR_RADIUS,
  BURR_SIGHT,
  BURR_SLOW,
  BURR_SPEED,
  BURR_TILT,
  BURR_TURN,
  MOST_CLINGING,
  SHOT_SPEED,
  STATIC_MOST,
  STEP_S,
  TOP_SPEED,
} from "../tuning";
import { type Burr, TUNED_BURRING } from "./burrs";

/** A rock in the field's corner, which keeps the wave from clearing, and the ship, far off it. */
const PICTURE = ["L", "", "", "", "........^"];

/** Where the picture's ship is. */
const SHIP_X = 34;
const SHIP_Y = 18;

/** The picture's field's width. */
const WIDTH = 72;

/** How far a burr flies in a step. */
const BURR_STEP = BURR_SPEED * STEP_S;

/** How far a burr in sight of the ship turns toward it in a step, in radians. */
const BURR_STEP_TURN = BURR_TURN * RADIANS_PER_DEGREE * STEP_S;

/** The way down the field, in radians. */
const DOWN = Math.PI / 2;

/** The row the specs lay what a shot meets on, well below the ship. */
const ROW = 30;

/** A shot's speed that flies it ten units in a step, through all a spec lays in its way. */
const TEN_A_STEP = 10 / STEP_S;

/** How long a volatile rock's blast waits after it breaks. */
const BLAST_DELAY_MS = ROCK_KINDS.volatile.traits[0].delayMs;

/** The seeds the specs of what is drawn try. */
const SEEDS = Array.from({ length: 40 }, (_, seed) => seed + 1);

/** Returns the picture's field, its first burr due in the coming step. */
function burrDue(options: PictureOptions = {}): Field {
  const field = fieldFrom(PICTURE, { burrs: 1, ...options });
  field.steps = field.burrs.nextAt - 1;
  return field;
}

/** Returns the field's burrs adrift, in their slots' order. */
function burrsAdrift(field: Field): Burr[] {
  return field.burrs.slots.filter((burr) => burr.live);
}

/** Returns the field's only burr adrift, failing the spec if it has another or none. */
function onlyBurr(field: Field): Burr {
  const [burr, ...others] = burrsAdrift(field);
  if (!burr || others.length > 0) {
    throw new Error(`${String(burrsAdrift(field).length)} burrs are adrift.`);
  }
  return burr;
}

/**
 * Steps a field until a burr has gone.
 *
 * @throws {Error} If it hasn't gone within a second.
 */
function stepUntilGone(field: Field, burr: Readonly<Burr>): void {
  for (let step = 0; step < stepsIn(1000) && burr.live; step++) {
    stepField(field);
  }
  if (burr.live) throw new Error("The burr didn't go.");
}

/** Fires a gun's shot along the row from a place on it, flying ten units in a step. */
function fireFast(field: Field, x: number): void {
  placeShot(field, "gun", x, ROW).vx = TEN_A_STEP;
}

describe("a wave's burrs", () => {
  it("sends none before its first is due", () => {
    const field = fieldFrom(PICTURE, { burrs: 1 });

    stepTimes(field, stepsIn(BURR_FIRST_MS) - 1);

    expect(burrsAdrift(field)).toEqual([]);
  });

  it("sends its first once it is due, logging it", () => {
    const field = fieldFrom(PICTURE, { burrs: 1 });

    stepTimes(field, stepsIn(BURR_FIRST_MS));

    expect([
      burrsAdrift(field).length,
      field.burrs.sent,
      loggedOn(field).at(-1),
    ]).toEqual([1, 1, expect.objectContaining({ kind: "burred" })]);
  });

  it("sends a burr still where it came in a step ago, coming in", () => {
    const field = burrDue();

    stepField(field);

    const burr = onlyBurr(field);
    expect([burr.lastX, burr.lastY, burr.wraps]).toEqual([
      burr.x,
      burr.y,
      false,
    ]);
  });

  it("sends none for a wave without burrs", () => {
    const field = burrDue({ burrs: 0 });

    stepField(field);

    expect(burrsAdrift(field)).toEqual([]);
  });

  it.each(SEEDS.slice(0, 8))(
    "logs a burr's coming on the edge it comes in by, across its spines from it, from seed %d",
    (seed) => {
      const field = burrDue({ seed });

      stepField(field);

      const place = edgePlaceOf(
        loggedOn(field).at(-1),
        onlyBurr(field),
        field.torus,
      );
      expect(place).toEqual([expect.closeTo(BURR_RADIUS), true]);
    },
  );

  it("sends a burr in off any edge, out of sight, heading across within its tilt", () => {
    const entries = SEEDS.map((seed) => {
      const field = burrDue({ seed });
      stepField(field);
      return entryOf(onlyBurr(field), field.torus);
    });

    expect(entriesOf(entries, BURR_RADIUS, BURR_TILT)).toEqual({
      edges: 4,
      wrong: [],
    });
  });

  it.each([
    ["no burr a step before", -1, 1],
    ["the next once", 0, 2],
  ])(
    "sends %s its time has come after it sent the last, a slot free",
    (_, beyond, sent) => {
      const field = burrDue({ burrs: 2 });
      stepField(field);

      stepTimes(field, stepsIn(BURR_NEXT_MS) + beyond);

      expect(field.burrs.sent).toBe(sent);
    },
  );

  it("waits for a free slot while as many as may be at once are adrift", () => {
    const field = burrDue({ burrsAtOnce: 1 });
    placeBurr(field, 10, ROW);

    stepField(field);

    expect(field.burrs.sent).toBe(0);
  });

  it("sends no more than the wave's burrs", () => {
    const field = burrDue();
    field.burrs.sent = 1;

    stepField(field);

    expect(burrsAdrift(field)).toEqual([]);
  });
});

describe("a burr's flight", () => {
  it("flies a burr coming in straight on at its speed, without wrapping", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, -BURR_RADIUS, ROW, 0, false);

    stepField(field);

    expect([burr.x, burr.y, burr.wraps]).toEqual([
      expect.closeTo(BURR_STEP - BURR_RADIUS),
      ROW,
      false,
    ]);
  });

  it("wraps a burr from the step it lies wholly on the field", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, BURR_RADIUS - BURR_STEP / 2, ROW, 0, false);

    stepField(field);

    expect(burr.wraps).toBe(true);
  });

  it("flies a burr that wraps across the field's edge", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, WIDTH - BURR_STEP / 2, ROW);

    stepField(field);

    expect(burr.x).toBeCloseTo(BURR_STEP / 2);
  });

  it("turns a burr toward the ship within its sight, by its turn a step at most", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, SHIP_X - BURR_SIGHT / 2, SHIP_Y, DOWN);

    stepField(field);

    expect(burr.heading).toBeCloseTo(DOWN - BURR_STEP_TURN);
  });

  it("turns a burr toward the ship the shortest way across the wrap", () => {
    const field = fieldFrom(["^", "", "", "", "........L"]);
    const burr = placeBurr(field, WIDTH - 2, 2, DOWN);

    stepField(field);

    expect(burr.heading).toBeCloseTo(DOWN - BURR_STEP_TURN);
  });

  it("turns a burr by the field's burring's sight and turn", () => {
    const field = fieldFrom(PICTURE);
    field.burring = { ...TUNED_BURRING, sight: 3, turn: 2 * BURR_TURN };
    const near = placeBurr(field, SHIP_X - 2, SHIP_Y, DOWN);
    const far = placeBurr(field, SHIP_X - 6, SHIP_Y, DOWN);

    stepField(field);

    expect([near.heading, far.heading]).toEqual([
      expect.closeTo(DOWN - 2 * BURR_STEP_TURN),
      DOWN,
    ]);
  });

  it("flies a burr coming in on straight, the ship in its sight", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, SHIP_X - 6, SHIP_Y, DOWN, false);

    stepField(field);

    expect(burr.heading).toBe(DOWN);
  });

  it("flies a burr on straight beyond the ship's sight", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, SHIP_X - BURR_SIGHT - 1, SHIP_Y, DOWN);

    stepField(field);

    expect(burr.heading).toBe(DOWN);
  });

  it("flies a burr on straight on a field with no ship", () => {
    const field = fieldFrom(PICTURE);
    field.ship = null;
    const burr = placeBurr(field, SHIP_X - 2, SHIP_Y, DOWN);

    stepField(field);

    expect(burr.heading).toBe(DOWN);
  });

  it("flies a burr by the field's burring", () => {
    const field = fieldFrom(PICTURE);
    field.burring = { ...TUNED_BURRING, speed: 2 * BURR_SPEED };
    const burr = placeBurr(field, 10, ROW);

    stepField(field);

    expect(burr.x).toBeCloseTo(10 + 2 * BURR_STEP);
  });
});

describe("a shot meeting a burr", () => {
  it("pops it, logged, for its points among the rocks', shedding a spark", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, 50, ROW, DOWN);
    placeShot(field, "gun", 46, ROW);

    stepTimes(field, stepsIn((1000 * 4) / SHOT_SPEED));

    expect({
      live: burr.live,
      score: field.score,
      rockPoints: field.rockPoints,
      popped: loggedOn(field).filter((event) => event.kind === "popped"),
      sparks: field.sparks.filter((spark) => spark.live).length,
    }).toEqual({
      live: false,
      score: BURR_POINTS,
      rockPoints: BURR_POINTS,
      popped: [expect.objectContaining({ x: burr.x, y: burr.y })],
      sparks: 1,
    });
  });

  it("misses a burr whose middle is still off the field", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, -BURR_RADIUS / 2, ROW, 0, false);
    placeShot(field, "gun", WIDTH - 1, ROW);

    stepTimes(field, 8);

    expect(burr.live).toBe(true);
  });

  it("pops a burr it meets sooner in a step than a rock, which it leaves whole", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, 48, ROW, DOWN);
    const rock = placeRock(field, "small", 52, ROW);
    fireFast(field, 44);

    stepField(field);

    expect([burr.live, rock.live]).toEqual([false, true]);
  });

  it("hits a rock it meets sooner in a step than a burr, which it leaves", () => {
    const field = fieldFrom(PICTURE);
    const rock = placeRock(field, "small", 48, ROW);
    const burr = placeBurr(field, 52, ROW, DOWN);
    fireFast(field, 44);

    stepField(field);

    expect([rock.live, burr.live]).toEqual([false, true]);
  });

  it("flies a Lance's shot on through a burr it pops, passing nothing laid in that step", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, 48, ROW, DOWN);
    placeShot(field, "lance", 46, ROW);
    stepUntilGone(field, burr);
    const rock = placeRock(field, "small", 50, ROW);

    stepTimes(field, stepsIn((1000 * 4) / SHOT_SPEED));

    expect(rock.live).toBe(false);
  });

  it("flies a Lance's shot on through a burr it pops, as through a rock it breaks", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, 48, ROW, DOWN);
    const rock = placeRock(field, "small", 52, ROW);
    placeShot(field, "lance", 46, ROW);

    stepTimes(field, stepsIn((1000 * 6) / SHOT_SPEED));

    expect([burr.live, rock.live]).toEqual([false, false]);
  });
});

describe("what passes a burr by", () => {
  it("lets a comet fly through a burr, which it leaves", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, 44, ROW, DOWN);
    placeComet(field, 40, ROW);

    stepTimes(field, stepsIn(500));

    expect(burr.live).toBe(true);
  });

  it("lets a volatile rock's blast pass a burr by", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, 55, ROW, DOWN);
    hitRock(field, placeRock(field, "large", 54, ROW, "volatile"), 1, 0);

    stepTimes(field, stepsIn(BLAST_DELAY_MS));

    expect([kindsLoggedOn(field).includes("blast"), burr.live]).toEqual([
      true,
      true,
    ]);
  });

  it("lets a zap arc to the rocks in reach, passing a burr by", () => {
    const field = fieldFrom(PICTURE, { charge: STATIC_MOST });
    const burr = placeBurr(field, SHIP_X - 3, SHIP_Y - 4, DOWN);
    placeRock(field, "small", SHIP_X + 3, SHIP_Y - 4);

    zap(field, shipOf(field), shipOf(field).angle);

    const arcs = kindsLoggedOn(field).filter((kind) => kind === "arced");
    expect([arcs, burr.live]).toEqual([["arced"], true]);
  });
});

describe("a burr touching the ship", () => {
  it("clings to it, logged at the ship with how many cling", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, SHIP_X + 1, SHIP_Y, DOWN);

    stepField(field);

    expect([burr.live, shipOf(field).burrs, loggedOn(field)]).toEqual([
      false,
      1,
      [
        expect.objectContaining({
          kind: "clung",
          x: SHIP_X,
          y: SHIP_Y,
          burrs: 1,
        }),
      ],
    ]);
  });

  it("clings to a ship a hit has left untouchable", () => {
    const field = fieldFrom(PICTURE);
    guardShip(shipOf(field), 1000);
    placeBurr(field, SHIP_X, SHIP_Y);

    stepField(field);

    expect(shipOf(field).burrs).toBe(1);
  });

  it("never hits the ship", () => {
    const field = fieldFrom(PICTURE);
    shipOf(field).guardSteps = 0;
    placeBurr(field, SHIP_X, SHIP_Y);

    stepField(field);

    expect([field.hits, kindsLoggedOn(field)]).toEqual([0, ["clung"]]);
  });

  it("clings no burr to a ship as it dashes", () => {
    const field = fieldFrom(PICTURE);
    const burr = placeBurr(field, SHIP_X, SHIP_Y);
    steerField(field, { ...STILL, dash: true });

    stepField(field);

    expect([burr.live, shipOf(field).burrs]).toEqual([true, 0]);
  });

  it("clings no burr to a ship waiting", () => {
    const field = fieldFrom(PICTURE);
    field.steps = 10;
    shipOf(field).waiting = true;
    const burr = placeBurr(field, SHIP_X, SHIP_Y);

    stepField(field);

    expect([burr.live, shipOf(field).burrs]).toEqual([true, 0]);
  });

  it("pops, for nothing, against a ship the most already cling to", () => {
    const field = fieldFrom(PICTURE);
    shipOf(field).burrs = MOST_CLINGING;
    const burr = placeBurr(field, SHIP_X, SHIP_Y);

    stepField(field);

    expect([
      burr.live,
      shipOf(field).burrs,
      field.score,
      kindsLoggedOn(field),
    ]).toEqual([false, MOST_CLINGING, 0, ["popped"]]);
  });

  it("clings no more than the field's burring says", () => {
    const field = fieldFrom(PICTURE);
    field.burring = { ...TUNED_BURRING, most: 1 };
    shipOf(field).burrs = 1;
    placeBurr(field, SHIP_X, SHIP_Y);

    stepField(field);

    expect(shipOf(field).burrs).toBe(1);
  });
});

describe("burrs clinging", () => {
  it("slow the ship by a share each, as the field's burring says", () => {
    const field = fieldFrom(PICTURE);
    field.burring = { ...TUNED_BURRING, slow: BURR_SLOW / 2 };
    shipOf(field).burrs = 2;
    steerField(field, { ...STILL, thrust: 1 });

    stepTimes(field, stepsIn(10_000));

    expect(speedOf(shipOf(field))).toBeCloseTo(TOP_SPEED * (1 - BURR_SLOW));
  });

  it("are all shaken off as the ship dashes, logged with how many and the way it heads, for nothing", () => {
    const field = fieldFrom(PICTURE);
    const ship = shipOf(field);
    ship.burrs = 2;
    steerField(field, { ...STILL, dash: true });

    stepField(field);

    const shaken = loggedOn(field).find((event) => event.kind === "shaken");
    expect([
      ship.burrs,
      field.score,
      kindsLoggedOn(field),
      shaken?.burrs,
      shaken?.wayX,
      shaken?.wayY,
    ]).toEqual([
      0,
      0,
      ["dashed", "shaken"],
      2,
      expect.closeTo(Math.cos(ship.angle)),
      expect.closeTo(Math.sin(ship.angle)),
    ]);
  });

  it("are not shaken off a dash with none clinging", () => {
    const field = fieldFrom(PICTURE);
    steerField(field, { ...STILL, dash: true });

    stepField(field);

    expect(kindsLoggedOn(field)).toEqual(["dashed"]);
  });
});

describe("a wave cleared", () => {
  it("lets every burr adrift go, and keeps those clinging to the ship", () => {
    const field = fieldFrom(["S", "", "", "", "........^"]);
    const burr = placeBurr(field, 10, ROW);
    shipOf(field).burrs = 1;
    const [rock] = wholeRocks(field);
    hitRock(field, rock!, 0, 0);

    stepField(field);

    expect([field.cleared, burr.live, shipOf(field).burrs]).toEqual([
      true,
      false,
      1,
    ]);
  });
});
