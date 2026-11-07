import { edgePlaceOf, entriesOf, entryOf } from "../../testing/crossings";
import {
  type PictureOptions,
  catchOn,
  fieldFrom,
  floatingPickups,
  loggedOn,
  placeComet,
  placeRock,
  shipOf,
  stepTimes,
  wholeRocks,
} from "../../testing/field_picture";
import { PICKUPS } from "../catalog/pickups";
import { ROCK_KINDS, type RockKindId } from "../catalog/rocks";
import { type Field, stepField } from "../field/field";
import { hitRock, rockHitRadius } from "../rocks/rocks";
import { guardShip } from "../ship/ship";
import { stepsIn } from "../stepper";
import type { Place } from "../torus";
import {
  COMET_FIRST_SHARE,
  COMET_MARGIN,
  COMET_RADIUS,
  COMET_SPEED,
  COMET_TILT,
  COMET_WARNING_MS,
  DROUGHT_MS,
  SHIP_HIT_RADIUS,
  STEP_S,
  type Span,
} from "../tuning";
import { COMET_PASSES, COMET_RECORDS, type Comet } from "./comets";

/** A rock in the field's corner, which keeps the wave from clearing, and the ship, far off it. */
const PICTURE = ["L", "", "", "", "........^"];

/** Where the picture's ship is. */
const SHIP_X = 34;
const SHIP_Y = 18;

/** The picture's field's width. */
const WIDTH = 72;

/** Comets every 14 to 18 seconds. */
const EVERY: Span = { least: 14_000, most: 18_000 };

/** How far a comet crosses in a step, at a pace of 1. */
const COMET_STEP = COMET_SPEED * STEP_S;

/** Where the specs lay a rock for a comet to meet, across the field. */
const ROCK_X = 50;

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/** The seeds the specs of what is drawn try. */
const SEEDS = Array.from({ length: 40 }, (_, seed) => seed + 1);

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

/** Returns the velocities of a field's whole medium rocks, in their slots' order. */
function velocitiesOfMedium(field: Field): number[][] {
  return field.rocks
    .filter((rock) => rock.live && rock.size === "medium")
    .map((rock) => [rock.vx, rock.vy]);
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

describe("a wave's comets", () => {
  it("warns of none for a wave without comets", () => {
    const field = fieldFrom(PICTURE);
    field.steps = stepsIn(EVERY.most) * 3;

    stepField(field);

    expect(cometsOn(field)).toEqual([]);
  });

  it("draws its first comet's time from a share of its span, so a wave cleared quickly meets one", () => {
    const firsts = SEEDS.map(
      (seed) => fieldFrom(PICTURE, { seed, cometEvery: EVERY }).comets.nextAt,
    );

    expect({
      apart: new Set(firsts).size > 1,
      outside: firsts.filter(
        (at) =>
          at < stepsIn(EVERY.least * COMET_FIRST_SHARE) ||
          at > stepsIn(EVERY.most * COMET_FIRST_SHARE),
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
