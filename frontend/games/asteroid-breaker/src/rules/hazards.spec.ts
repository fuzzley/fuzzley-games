import {
  type PictureOptions,
  catchOn,
  fieldFrom,
  floatingPickups,
  loggedOn,
  placeComet,
  placeRock,
  placeStray,
  shipOf,
  stepTimes,
  wholeRocks,
} from "../testing/field_picture";
import { RADIANS_PER_DEGREE, TURN } from "./angles";
import { PICKUPS } from "./catalog/pickups";
import { ROCK_KINDS, type RockKindId } from "./catalog/rocks";
import type { FieldEvent } from "./events";
import { type Field, stepField } from "./field";
import {
  COMET_PASSES,
  COMET_RECORDS,
  type Comet,
  type Crossing,
} from "./hazards";
import { hitRock, rockHitRadius } from "./rocks";
import { guardShip } from "./ship";
import { stepsIn } from "./stepper";
import { type Place, type Torus, across } from "./torus";
import {
  COMET_MARGIN,
  COMET_RADIUS,
  COMET_SPEED,
  COMET_TILT,
  COMET_WARNING_MS,
  DROUGHT_MS,
  ENTRY_ALONG,
  PICKUP_PULL_SPEED,
  SHIP_HIT_RADIUS,
  STEP_S,
  STRAY_CATCH_REACH,
  STRAY_FIRST_MS,
  STRAY_NEXT_MS,
  STRAY_RADIUS,
  STRAY_SPEED,
  STRAY_TILT,
  STRAY_TURN,
  type Span,
} from "./tuning";

/** A rock in the field's corner, which keeps the wave from clearing, and the ship, far off it. */
const PICTURE = ["L", "", "", "", "........^"];

/** Where the picture's ship is. */
const SHIP_X = 34;
const SHIP_Y = 18;

/** The picture's field's width. */
const WIDTH = 72;

/** Comets every 14 to 18 seconds. */
const EVERY: Span = { least: 14_000, most: 18_000 };

/** How far a stray crosses in a step. */
const STRAY_STEP = STRAY_SPEED * STEP_S;

/** How far a comet crosses in a step, at a pace of 1. */
const COMET_STEP = COMET_SPEED * STEP_S;

/** How far off the field a stray lies a step short of leaving it: its bubble's reach, less a step. */
const SHORT_OF_LEAVING = STRAY_RADIUS - STRAY_STEP;

/** How far a Magnet draws a stray in, in a step. */
const PULLED = PICKUP_PULL_SPEED * STEP_S;

/** Where the specs lay a rock for a comet to meet, across the field. */
const ROCK_X = 50;

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/** The least a stray must be on the field for, so the ship can fly to it. */
const LONG_ENOUGH_MS = 5000;

/** The seeds the specs of what is drawn try. */
const SEEDS = Array.from({ length: 40 }, (_, seed) => seed + 1);

/**
 * Describes where a crossing waits to come in: off which edge, by how far,
 * how far along it, and how its heading tilts off straight across.
 */
interface Entry {
  readonly edge: "left" | "right" | "top" | "bottom";
  readonly by: number;
  /** Its share of the way along its edge. */
  readonly along: number;
  /** In degrees. */
  readonly tilt: number;
  /** Whether it tilts toward its edge's middle, or not at all. */
  readonly towardMiddle: boolean;
}

/** Returns where a crossing waits to come in, off an edge of a field. */
function entryOf(crossing: Readonly<Crossing>, torus: Torus): Entry {
  const { x, y, heading } = crossing;
  const down = y / torus.height;
  const right = x / torus.width;
  if (x < 0) return entry("left", -x, down, heading, 0);
  if (x > torus.width) {
    return entry("right", x - torus.width, down, heading, Math.PI);
  }
  if (y < 0) return entry("top", -y, right, heading, Math.PI / 2);
  return entry("bottom", y - torus.height, right, heading, 1.5 * Math.PI);
}

/** Returns an entry off an edge, its tilt measured from straight across. */
function entry(
  edge: Entry["edge"],
  by: number,
  along: number,
  heading: number,
  straight: number,
): Entry {
  const turned = across(straight, heading, TURN);
  // Down a left or right edge, or right along the top or bottom.
  const alongEdge =
    edge === "left" || edge === "right" ? Math.sin(heading) : Math.cos(heading);
  return {
    edge,
    by,
    along,
    tilt: Math.abs(turned) / RADIANS_PER_DEGREE,
    towardMiddle: alongEdge * (0.5 - along) >= -SLIVER,
  };
}

/** Returns what the entries of crossings come to: how many edges they use, and those that come in wrongly. */
function entriesOf(
  entries: readonly Entry[],
  margin: number,
  tilt: number,
): { edges: number; wrong: Entry[] } {
  return {
    edges: new Set(entries.map((each) => each.edge)).size,
    wrong: entries.filter(
      (each) =>
        Math.abs(each.by - margin) > SLIVER ||
        each.along < ENTRY_ALONG.least - SLIVER ||
        each.along > ENTRY_ALONG.most + SLIVER ||
        each.tilt > tilt ||
        !each.towardMiddle,
    ),
  };
}

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

/**
 * Returns the picture's field with a rock laid where its comet, just warned
 * of, will cross two units in from its edge, and the rock's place.
 */
function rockInComingWay(field: Field): Place {
  stepField(field);
  const comet = onlyComet(field);
  const into = COMET_MARGIN + 2;
  const x = comet.x + Math.cos(comet.heading) * into;
  const y = comet.y + Math.sin(comet.heading) * into;
  placeRock(field, "large", x, y);
  return { x, y };
}

/**
 * Returns how far an event lies from a crossing waiting to come in, and
 * whether it lies on the field's border, as one logged where the crossing
 * will come in does.
 */
function edgePlaceOf(
  event: Readonly<FieldEvent> | undefined,
  crossing: Readonly<Crossing>,
  torus: Torus,
): [number, boolean] {
  if (!event) throw new Error("Nothing was logged.");
  const { x, y } = event;
  const onBorder =
    x === 0 || x === torus.width || y === 0 || y === torus.height;
  return [Math.hypot(x - crossing.x, y - crossing.y), onBorder];
}

/** Returns the velocities of a field's whole medium rocks, in their slots' order. */
function velocitiesOfMedium(field: Field): number[][] {
  return field.rocks
    .filter((rock) => rock.live && rock.size === "medium")
    .map((rock) => [rock.vx, rock.vy]);
}

/** Returns the picture's field, its stray due in the coming step. */
function strayDue(options: PictureOptions = {}): Field {
  const field = fieldFrom(PICTURE, { strays: 1, ...options });
  field.steps = field.strays.nextAt - 1;
  return field;
}

/** Returns the picture's field, its next comet's warning due in the coming step. */
function cometDue(options: PictureOptions = {}): Field {
  const field = fieldFrom(PICTURE, { cometEvery: EVERY, ...options });
  field.steps = field.comets.nextAt - 1;
  return field;
}

/** Steps a field a number of times, and returns the steps a rock broke in, as their count. */
function stepsBreaking(field: Field, steps: number): number[] {
  const broke: number[] = [];
  for (let step = 0; step < steps; step++) {
    const before = wholeRocks(field).length;
    stepField(field);
    if (wholeRocks(field).length < before) broke.push(field.steps);
  }
  return broke;
}

/** Returns the sizes of the rocks a field's breaks laid, in their slots' order. */
function piecesOf(field: Field): string[] {
  return field.rocks
    .filter((each) => each.live && each.laidAt > 0)
    .map((each) => each.size);
}

/** Returns the comets on a field's way, warned of or crossing. */
function cometsOn(field: Field): Comet[] {
  return field.comets.slots.filter((comet) => comet.live);
}

/** Returns the one comet on a field's way, failing the spec if it has another number. */
function onlyComet(field: Field): Comet {
  const [comet, ...others] = cometsOn(field);
  if (!comet || others.length > 0) throw new Error("Expected one comet.");
  return comet;
}

/** Returns the picture's field with the stray it lets leave across its right edge, one still to send. */
function strayLeft(): Field {
  const field = fieldFrom(PICTURE, { strays: 2 });
  field.strays.sent = 1;
  placeStray(field, WIDTH + STRAY_RADIUS, 30);
  stepField(field);
  return field;
}

/**
 * Returns the picture's field with a large rock of a kind at {@link ROCK_X},
 * 30, and a comet crossing toward it, as far from it as it says once it has
 * flown a step.
 */
function cometAtRock(kind: RockKindId, apart: number): Field {
  const field = fieldFrom(PICTURE, { pool: ["spread"] });
  placeRock(field, "large", ROCK_X, 30, kind);
  placeComet(field, ROCK_X - apart - COMET_STEP, 30);
  return field;
}

/**
 * Returns whether a field holds a whole large rock at a place, as one laid
 * there and left whole does; a broken rock's slot may hold one of its
 * pieces, so its record can't say.
 */
function largeAt(field: Field, x: number, y: number): boolean {
  return field.rocks.some(
    (rock) =>
      rock.live &&
      rock.size === "large" &&
      Math.hypot(rock.x - x, rock.y - y) < 1,
  );
}

describe("a wave's strays", () => {
  it("sends none before its first is due", () => {
    const field = fieldFrom(PICTURE, { strays: 1 });

    stepTimes(field, stepsIn(STRAY_FIRST_MS) - 1);

    expect(field.strays.adrift.live).toBe(false);
  });

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
    ]).toEqual([
      [6, 5],
      1,
      field.steps + stepsIn(STRAY_NEXT_MS),
      "home",
      5,
      expect.closeTo(SHIP_X),
      expect.closeTo(SHIP_Y + STRAY_STEP),
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

describe("a wave's comets", () => {
  it("warns of none for a wave without comets", () => {
    const field = fieldFrom(PICTURE);
    field.steps = stepsIn(EVERY.most) * 3;

    stepField(field);

    expect(cometsOn(field)).toEqual([]);
  });

  it("draws its first comet's time from its span", () => {
    const firsts = SEEDS.map(
      (seed) => fieldFrom(PICTURE, { seed, cometEvery: EVERY }).comets.nextAt,
    );

    expect({
      apart: new Set(firsts).size > 1,
      outside: firsts.filter(
        (at) => at < stepsIn(EVERY.least) || at > stepsIn(EVERY.most),
      ),
    }).toEqual({ apart: true, outside: [] });
  });

  it.each([
    ["none a step before", -1, 0],
    ["one once", 0, 1],
  ])("warns of %s its time has come", (_, beyond, count) => {
    const field = cometDue();
    field.steps += beyond;

    stepField(field);

    expect(cometsOn(field)).toHaveLength(count);
  });

  it.each(SEEDS.slice(0, 8))(
    "logs its warning on the edge it will come in by, across its margin from it, from seed %d",
    (seed) => {
      const field = cometDue({ seed });

      stepField(field);

      const logged = loggedOn(field).at(-1);
      const place = edgePlaceOf(logged, onlyComet(field), field.torus);
      expect([logged?.kind, ...place]).toEqual([
        "warned",
        expect.closeTo(COMET_MARGIN),
        true,
      ]);
    },
  );

  it("warns of a comet off any edge, its head out of sight, heading across within its tilt", () => {
    const entries = SEEDS.map((seed) => {
      const field = cometDue({ seed });
      stepField(field);
      return entryOf(onlyComet(field), field.torus);
    });

    expect(entriesOf(entries, COMET_MARGIN, COMET_TILT)).toEqual({
      edges: 4,
      wrong: [],
    });
  });

  it("draws the next comet's time from its span after the last's warning", () => {
    const field = cometDue();

    stepField(field);

    const after = field.comets.nextAt - field.steps;
    expect([
      after >= stepsIn(EVERY.least),
      after <= stepsIn(EVERY.most),
    ]).toEqual([true, true]);
  });

  it("warns of none while every record is taken, and draws the next", () => {
    const field = cometDue();
    for (let i = 0; i < COMET_RECORDS; i++) placeComet(field, 10, 30 + i);

    stepField(field);

    expect([cometsOn(field).length, field.comets.nextAt > field.steps]).toEqual(
      [COMET_RECORDS, true],
    );
  });
});

describe("a comet", () => {
  it("holds still off its edge through its warning", () => {
    const field = cometDue();
    stepField(field);
    const comet = onlyComet(field);
    const { x, y } = comet;

    stepTimes(field, stepsIn(COMET_WARNING_MS) - 1);

    expect([comet.x, comet.y, comet.warnSteps]).toEqual([x, y, 0]);
  });

  it("crosses once its warning is over", () => {
    const field = cometDue();
    stepField(field);
    const comet = onlyComet(field);
    const { x, y } = comet;
    stepTimes(field, stepsIn(COMET_WARNING_MS) - 1);

    stepField(field);

    expect(Math.hypot(comet.x - x, comet.y - y)).toBeCloseTo(COMET_STEP);
  });

  it("crosses at its speed at the field's pace, in a straight line", () => {
    const field = fieldFrom(PICTURE, { pace: 1.2 });
    const comet = placeComet(field, 10, 30, 0.25);

    stepField(field);

    expect([comet.x, comet.y, comet.heading]).toEqual([
      expect.closeTo(10 + Math.cos(0.25) * COMET_STEP * 1.2),
      expect.closeTo(30 + Math.sin(0.25) * COMET_STEP * 1.2),
      0.25,
    ]);
  });

  it("crosses at a share of its speed while Slow is in effect", () => {
    const field = fieldFrom(PICTURE);
    catchOn(field, "slow");
    const comet = placeComet(field, 10, 30);

    stepField(field);

    expect(comet.x).toBeCloseTo(10 + COMET_STEP * PICKUPS.slow.effect.scale);
  });

  it.each([
    ["stays on its way just within", -SLIVER, true],
    ["leaves just past", SLIVER, false],
  ])("%s its margin off the field", (_, beyond, live) => {
    const field = fieldFrom(PICTURE);
    const comet = placeComet(
      field,
      WIDTH + COMET_MARGIN - COMET_STEP + beyond,
      30,
    );

    stepField(field);

    expect(comet.live).toBe(live);
  });

  it.each([
    ["breaks a rock just within", SLIVER, false],
    ["leaves whole a rock just past", -SLIVER, true],
  ])("%s its reach", (_, beyond, whole) => {
    const reach = COMET_RADIUS + rockHitRadius("large");
    const field = cometAtRock("stone", reach - beyond);

    stepField(field);

    expect(largeAt(field, ROCK_X, 30)).toBe(whole);
  });

  it("breaks a rock a size down, whatever its hits, logging the break", () => {
    const field = cometAtRock("iron", 1);

    stepField(field);

    const pieces = field.rocks.filter(
      (each) => each.live && each.laidAt === field.steps,
    );
    expect([
      largeAt(field, ROCK_X, 30),
      pieces.map((each) => each.size),
      loggedOn(field),
    ]).toEqual([
      false,
      ["medium", "medium"],
      [expect.objectContaining({ kind: "broken", rock: "iron" })],
    ]);
  });

  it("passes over the pieces of what it breaks", () => {
    const field = cometAtRock("stone", 2);

    stepTimes(field, 40);

    const sizes = field.rocks
      .filter((each) => each.live && each.laidAt > 0)
      .map((each) => each.size);
    expect(sizes).toEqual(["medium", "medium"]);
  });

  it("breaks a rock in its way once its warning is over", () => {
    const field = cometDue();
    const { x, y } = rockInComingWay(field);

    stepTimes(field, stepsIn(COMET_WARNING_MS) + 30);

    expect(largeAt(field, x, y)).toBe(false);
  });

  it("starts its breaks afresh, though its record held an earlier comet's", () => {
    const field = cometDue();
    const sentAt = field.steps + 1;
    for (const comet of field.comets.slots) comet.smashedAt.fill(sentAt);
    const { x, y } = rockInComingWay(field);

    stepTimes(field, stepsIn(COMET_WARNING_MS) + 30);

    expect(largeAt(field, x, y)).toBe(false);
  });

  it("pushes the pieces of what it breaks along its travel", () => {
    const struck = fieldFrom(PICTURE, { pool: ["spread"] });
    const rock = placeRock(struck, "large", ROCK_X, 30);
    hitRock(struck, rock, 1, 0, "smashes");
    const field = cometAtRock("stone", 1);

    stepField(field);

    expect(velocitiesOfMedium(field)).toEqual(velocitiesOfMedium(struck));
  });

  it("passes over the pieces of what it broke, breaking another between", () => {
    const field = cometAtRock("stone", 1);
    placeRock(field, "large", ROCK_X + 3, 30);

    stepTimes(field, 60);

    const sizes = field.rocks
      .filter((each) => each.live && each.laidAt > 0)
      .map((each) => each.size);
    expect(sizes).toEqual(["medium", "medium", "medium", "medium"]);
  });

  it("lets a volatile rock it breaks go off, what the blast breaks giving as any blast's does", () => {
    const field = fieldFrom(PICTURE, { pool: ["spread"] });
    placeRock(field, "large", ROCK_X, 30, "volatile");
    placeRock(field, "medium", ROCK_X, 35, "crystal");
    placeComet(field, ROCK_X - 1 - COMET_STEP, 30);

    stepTimes(field, 1 + stepsIn(ROCK_KINDS.volatile.traits[0].delayMs));

    expect(loggedOn(field).map((each) => [each.kind, each.rock])).toEqual([
      ["broken", "volatile"],
      ["blast", "volatile"],
      ["broken", "crystal"],
      ["scored", null],
      ["dropped", null],
    ]);
  });

  it("passes over the pieces of a row of rocks it breaks one after another", () => {
    const field = fieldFrom(PICTURE);
    for (let i = 0; i < 6; i++) placeRock(field, "large", ROCK_X + 1.5 * i, 30);
    placeComet(field, ROCK_X - 3, 30);

    stepTimes(field, 90);

    expect(piecesOf(field)).toEqual(Array(12).fill("medium"));
  });

  it("keeps the latest steps it broke rocks in, dropping the oldest", () => {
    const field = fieldFrom(PICTURE);
    for (let i = 0; i <= COMET_PASSES; i++) {
      placeRock(field, "small", 12 + i, 30);
    }
    const comet = placeComet(field, 10, 30);

    const broke = stepsBreaking(field, 60);

    expect([...comet.smashedAt].sort((a, b) => a - b)).toEqual(
      broke.slice(-COMET_PASSES),
    );
  });

  it("keeps a step it broke two rocks in once", () => {
    const field = fieldFrom(PICTURE);
    placeRock(field, "small", 11, 29);
    placeRock(field, "small", 11, 31);
    const comet = placeComet(field, 10, 30);

    stepField(field);

    expect([wholeRocks(field).length, comet.smashes]).toEqual([1, 1]);
  });

  it("breaks two rocks it meets in a step, passing over the pieces of both", () => {
    const field = fieldFrom(PICTURE);
    placeRock(field, "large", ROCK_X, 28);
    placeRock(field, "large", ROCK_X, 32);
    placeComet(field, ROCK_X - 1 - COMET_STEP, 30);

    stepTimes(field, 40);

    const sizes = field.rocks
      .filter((each) => each.live && each.laidAt > 0)
      .map((each) => each.size);
    expect(sizes).toEqual(["medium", "medium", "medium", "medium"]);
  });

  it("breaks the pieces of a rock the ship broke in its way", () => {
    const field = fieldFrom(PICTURE);
    placeComet(field, ROCK_X - 2, 30);
    field.steps = 5;
    placeRock(field, "large", ROCK_X, 30);

    stepField(field);

    expect(largeAt(field, ROCK_X, 30)).toBe(false);
  });

  it("breaks a rock across an edge", () => {
    const field = fieldFrom(PICTURE);
    placeRock(field, "large", 1, 30);
    placeComet(field, WIDTH - 1, 30, Math.PI / 2);

    stepField(field);

    expect(largeAt(field, 1, 30)).toBe(false);
  });

  it("breaks nothing across the wrap with its middle off the field", () => {
    const field = fieldFrom(PICTURE);
    placeRock(field, "large", WIDTH - 1, 30);
    placeComet(field, -1, 30, Math.PI);

    stepField(field);

    expect(largeAt(field, WIDTH - 1, 30)).toBe(true);
  });

  it.each([
    ["a crystal", "crystal", 0],
    ["a large rock once a drought has gone by", "stone", stepsIn(DROUGHT_MS)],
  ] as const)(
    "lets no pickup go from what it breaks, %s among them",
    (_, kind, steps) => {
      const field = fieldFrom(PICTURE, { pool: ["spread"] });
      field.steps = steps;
      placeRock(field, "large", ROCK_X, 30, kind);
      placeComet(field, ROCK_X - 1, 30);

      stepField(field);

      expect([largeAt(field, ROCK_X, 30), floatingPickups(field)]).toEqual([
        false,
        [],
      ]);
    },
  );

  it.each([
    ["takes a ship just within", SLIVER, true],
    ["leaves a ship just past", -SLIVER, false],
  ])("%s its reach", (_, beyond, lost) => {
    const field = fieldFrom(PICTURE);
    const reach = COMET_RADIUS + SHIP_HIT_RADIUS;
    placeComet(field, SHIP_X - reach - COMET_STEP + beyond, SHIP_Y);

    stepField(field);

    expect(field.ship === null).toBe(lost);
  });

  it("takes a ship, its pilot bailing out, logging it", () => {
    const field = fieldFrom(PICTURE);
    placeComet(field, SHIP_X - 1, SHIP_Y);

    stepField(field);

    expect([field.shipsLost, field.crew.flying, loggedOn(field)]).toEqual([
      1,
      [1, 2],
      [expect.objectContaining({ kind: "lost", pilot: 0 })],
    ]);
  });

  it("spares a guarded ship", () => {
    const field = fieldFrom(PICTURE);
    guardShip(shipOf(field), 500);
    placeComet(field, SHIP_X - 1, SHIP_Y);

    stepField(field);

    expect(field.shipsLost).toBe(0);
  });

  it("spends a shield, flying on", () => {
    const field = fieldFrom(PICTURE);
    catchOn(field, "shield");
    const comet = placeComet(field, SHIP_X - 1, SHIP_Y);

    stepField(field);

    expect([
      field.shipsLost,
      field.shielded,
      comet.live,
      loggedOn(field).at(-1),
    ]).toEqual([0, false, true, expect.objectContaining({ kind: "shielded" })]);
  });

  it("breaks and takes nothing while it is warned of", () => {
    const field = fieldFrom(PICTURE);
    placeRock(field, "large", ROCK_X, 30);
    placeComet(field, ROCK_X, 30).warnSteps = 10;
    placeComet(field, SHIP_X, SHIP_Y).warnSteps = 10;

    stepField(field);

    expect([largeAt(field, ROCK_X, 30), field.shipsLost]).toEqual([true, 0]);
  });
});
