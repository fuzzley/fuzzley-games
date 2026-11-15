import {
  KEEPER,
  type PictureOptions,
  catchOn,
  fieldFrom,
  kindsLoggedOn,
  loggedOn,
  placeRock,
  placeSpark,
  shipOf,
  stepTimes,
} from "../../testing/field_picture";
import { PICKUPS } from "../catalog/pickups";
import type { RockKindId, RockSize } from "../catalog/rocks";
import { type Field, stepField } from "../field/field";
import { type Blow, hitRock } from "../rocks/rocks";
import type { Crew } from "../ship/pilots";
import { SPEED_INFO } from "../speed";
import { stepsIn } from "../stepper";
import { distance } from "../torus";
import {
  MOST_SPARKS,
  SPARK_BLINK_MS,
  SPARK_DRAW_REACH,
  SPARK_FLIGHT,
  SPARK_FLIGHT_MS,
  SPARK_GATHER_REACH,
  SPARK_LIFE_MS,
  SPARK_POINTS,
  SPARK_PULL_SPEED,
  STATIC_STEPS,
  STEP_S,
} from "../tuning";
import { TUNED_SPARKING } from "./charge";
import {
  type Spark,
  createSparks,
  drawReach,
  sparkBlinks,
  sparksShedBy,
  stepSparks,
} from "./sparks";

/** A rock in the field's corner, which keeps the wave from clearing, and the ship, far off it, its crew in tow behind it. */
const PICTURE = [...KEEPER, "", "", "", ".........^"];

/** Where the picture's ship is. */
const SHIP_X = 38;
const SHIP_Y = 18;

/** A rock in the field's corner, and no ship. */
const NO_SHIP = KEEPER;

/** How far a spark is drawn in to the ship in a step. */
const PULLED = SPARK_PULL_SPEED * STEP_S;

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/** Where static's first step, ×2, starts. */
const FIRST_STEP = STATIC_STEPS[2].from;

/** A crew of a pilot at the controls with no one in tow, whose run a hit ends. */
const ALONE: Crew = { pilot: 4, tow: [], home: [2], lastGiven: 6 };

/** Returns the picture's field, with a rock in its corner and the ship. */
function fieldOf(options?: PictureOptions): Field {
  return fieldFrom(PICTURE, options);
}

/** Returns the sparks out on a field. */
function sparksOut(field: Field): Spark[] {
  return field.sparks.filter((spark) => spark.live);
}

/** Breaks a rock of a size laid at a place on a field, by a blow, a shot's hit unless given. */
function breakRockAt(
  field: Field,
  x: number,
  y: number,
  size: RockSize = "small",
  blow: Blow = "hit",
): void {
  const rock = placeRock(field, size, x, y);
  rock.hits = 1;
  hitRock(field, rock, 0, 0, blow);
}

describe("createSparks", () => {
  it("makes a slot for each spark that can be out at once, none out", () => {
    const sparks = createSparks();

    expect([sparks.length, sparks.some((spark) => spark.live)]).toEqual([
      MOST_SPARKS,
      false,
    ]);
  });
});

describe("sparksShedBy", () => {
  it.each<[RockKindId, RockSize, number]>([
    ["stone", "small", 1],
    ["stone", "medium", 2],
    ["stone", "large", 3],
    ["boulder", "boulder", 8],
    ["crystal", "medium", 4],
    ["crystal", "large", 5],
  ])("sheds from a %s %s %i sparks", (kind, size, sparks) => {
    expect(sparksShedBy({ kind, size })).toBe(sparks);
  });
});

describe("a broken rock's sparks", () => {
  it("sheds a small rock's one spark from its place, at the step it broke", () => {
    const field = fieldFrom(NO_SHIP);
    field.steps = 40;

    breakRockAt(field, 30, 20);

    expect(sparksOut(field)).toEqual([
      expect.objectContaining({ x: 30, y: 20, shedAt: 40 }),
    ]);
  });

  it.each<[string, Blow]>([
    ["a comet smashed", "smashes"],
    ["broken against the ship", "breaks"],
  ])("sheds none from a rock %s", (_, blow) => {
    const field = fieldFrom(NO_SHIP);

    breakRockAt(field, 30, 20, "small", blow);

    expect(sparksOut(field)).toEqual([]);
  });

  it("flies each spark out from the rock, from the least of a spark's flight to the most, in its flight's time", () => {
    const field = fieldFrom(NO_SHIP);
    breakRockAt(field, 30, 20, "large");

    stepTimes(field, stepsIn(SPARK_FLIGHT_MS));

    const out = sparksOut(field).map((spark) =>
      distance(field.torus, 30, 20, spark.x, spark.y),
    );
    expect([
      out.length,
      Math.min(...out) >= SPARK_FLIGHT.least - SLIVER,
      Math.max(...out) <= SPARK_FLIGHT.most + SLIVER,
    ]).toEqual([3, true, true]);
  });

  it("spreads a rock's sparks evenly around it, each its own way", () => {
    const field = fieldFrom(NO_SHIP);

    breakRockAt(field, 30, 20, "large");

    const ways = sparksOut(field).map(({ wayX, wayY }) => {
      const length = Math.hypot(wayX, wayY);
      return { x: wayX / length, y: wayY / length };
    });
    const sumX = ways.reduce((sum, way) => sum + way.x, 0);
    const sumY = ways.reduce((sum, way) => sum + way.y, 0);
    expect([ways.length, Math.hypot(sumX, sumY)]).toEqual([
      3,
      expect.closeTo(0),
    ]);
  });

  it("hangs a spark where it flew to once its flight is over", () => {
    const field = fieldFrom(NO_SHIP);
    breakRockAt(field, 30, 20);
    stepTimes(field, stepsIn(SPARK_FLIGHT_MS));
    const [spark] = sparksOut(field);
    const flown = { x: spark?.x, y: spark?.y };

    stepTimes(field, 60);

    expect({ x: spark?.x, y: spark?.y }).toEqual(flown);
  });

  it("takes the oldest spark's slot for a new one once every slot is out", () => {
    const field = fieldFrom(NO_SHIP);
    for (let n = 0; n < MOST_SPARKS; n++) {
      placeSpark(field, 1, 1).shedAt = n === 5 ? 0 : 10;
    }
    field.steps = 20;

    breakRockAt(field, 30, 20);

    expect(field.sparks[5]).toMatchObject({ x: 30, y: 20, shedAt: 20 });
  });
});

describe("a spark's time", () => {
  it("keeps a spark out until its life is up", () => {
    const field = fieldFrom(NO_SHIP);
    const spark = placeSpark(field, 30, 20);

    stepTimes(field, stepsIn(SPARK_LIFE_MS) - 1);

    expect(spark.live).toBe(true);
  });

  it("then lets it go", () => {
    const field = fieldFrom(NO_SHIP);
    const spark = placeSpark(field, 30, 20);

    stepTimes(field, stepsIn(SPARK_LIFE_MS));

    expect(spark.live).toBe(false);
  });

  it.each([
    ["no", -1, false],
    ["its last second's", 0, true],
  ])("blinks a spark through %s step", (_, past, blinks) => {
    const field = fieldFrom(NO_SHIP);
    const spark = placeSpark(field, 30, 20);

    const steps = stepsIn(SPARK_LIFE_MS - SPARK_BLINK_MS) + past;

    expect(sparkBlinks(spark, steps)).toBe(blinks);
  });
});

describe("the ship drawing sparks in", () => {
  it.each([
    ["is drawn toward the ship from within", -SLIVER, -PULLED],
    ["hangs where it is from beyond", SLIVER, 0],
  ])("%s its reach", (_, beyond, moved) => {
    const field = fieldOf();
    const start = SHIP_X + SPARK_DRAW_REACH + beyond;
    const spark = placeSpark(field, start, SHIP_Y);

    stepField(field);

    expect(spark.x).toBeCloseTo(start + moved);
  });

  it("draws sparks in from farther at Relaxed", () => {
    const field = fieldOf({ sparkReach: SPEED_INFO.relaxed.sparkReach });
    const start = SHIP_X + 8 - SLIVER;
    const spark = placeSpark(field, start, SHIP_Y);

    stepField(field);

    expect(spark.x).toBeCloseTo(start - PULLED);
  });

  it("draws sparks in from the Magnet's reach", () => {
    const field = fieldOf();
    catchOn(field, "magnet");
    const start = SHIP_X + PICKUPS.magnet.effect.reach - SLIVER;
    const spark = placeSpark(field, start, SHIP_Y);

    stepField(field);

    expect(spark.x).toBeCloseTo(start - PULLED);
  });

  it("draws sparks in from no farther than the field's sparking says", () => {
    const field = fieldOf();
    field.sparking = { ...TUNED_SPARKING, reach: 2 };
    const spark = placeSpark(field, SHIP_X + 4, SHIP_Y);

    stepField(field);

    expect(spark.x).toBe(SHIP_X + 4);
  });

  it("draws them in from the farther of the sparking's reach and the pickups'", () => {
    const field = fieldOf();
    field.sparking = { ...TUNED_SPARKING, reach: 1 };

    expect(drawReach(field)).toBe(field.pullReach);
  });
});

describe("gathering a spark", () => {
  it("gathers a spark the pod reaches, scoring its points times static's multiplier, logged at its place with the pilot at the controls", () => {
    const field = fieldOf({ charge: FIRST_STEP });
    const at = SHIP_X + SPARK_GATHER_REACH;
    const spark = placeSpark(field, at + PULLED - SLIVER, SHIP_Y);

    stepField(field);

    expect([spark.live, field.score, loggedOn(field)]).toEqual([
      false,
      SPARK_POINTS * 2,
      [
        expect.objectContaining({
          kind: "sparked",
          y: SHIP_Y,
          pilot: field.crew.pilot,
          points: SPARK_POINTS,
          times: 2,
        }),
      ],
    ]);
  });

  it("leaves a spark beyond the pod's reach out", () => {
    const field = fieldOf();
    const at = SHIP_X + SPARK_GATHER_REACH;
    const spark = placeSpark(field, at + PULLED + SLIVER, SHIP_Y);

    stepField(field);

    expect(spark.live).toBe(true);
  });

  it("adds a spark's static once it has scored, holding static from that step", () => {
    const field = fieldOf({ charge: FIRST_STEP - 1 });
    const ship = shipOf(field);
    placeSpark(field, ship.x, ship.y);

    stepField(field);

    expect({
      score: field.score,
      charge: field.charge,
      events: kindsLoggedOn(field),
    }).toEqual({
      score: SPARK_POINTS,
      charge: { level: FIRST_STEP, lastSparkAt: field.steps },
      events: ["sparked", "stepped"],
    });
  });

  it("gathers a spark a bubble in tow reaches, logged with its pilot", () => {
    const field = fieldOf();
    const [bubble] = field.tow;
    placeSpark(field, bubble?.x ?? 0, bubble?.y ?? 0);

    stepField(field);

    expect(loggedOn(field)).toEqual([
      expect.objectContaining({ kind: "sparked", pilot: field.crew.tow[0] }),
    ]);
  });

  it("gathers a spark both the pod and a bubble in tow reach for the pilot at the controls", () => {
    const field = fieldOf();
    const [bubble] = field.tow;
    const x = bubble?.x ?? 0;
    const y = bubble?.y ?? 0;
    Object.assign(shipOf(field), { x: x + 1, y });
    placeSpark(field, x + 0.5, y);

    stepSparks(field);

    expect(loggedOn(field)).toEqual([
      expect.objectContaining({ kind: "sparked", pilot: field.crew.pilot }),
    ]);
  });

  it("gathers none at a link of the line no one rides in", () => {
    const field = fieldOf({ crew: ALONE });
    const [link] = field.tow;
    const spark = placeSpark(field, link?.x ?? 0, link?.y ?? 0);

    stepField(field);

    expect(spark.live).toBe(true);
  });

  it("gathers none once a hit has ended the run", () => {
    const field = fieldFrom(["^B"], { crew: ALONE });
    const ship = shipOf(field);
    const spark = placeSpark(field, ship.x, ship.y);

    stepField(field);

    expect([field.ship, spark.live, kindsLoggedOn(field)]).toEqual([
      null,
      true,
      expect.not.arrayContaining(["sparked"]),
    ]);
  });

  it("lets every spark go as the wave is cleared", () => {
    const field = fieldFrom(["^"]);
    breakRockAt(field, 50, 30);

    stepField(field);

    expect([field.cleared, sparksOut(field)]).toEqual([true, []]);
  });
});
