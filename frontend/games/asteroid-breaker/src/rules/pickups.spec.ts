import {
  type PictureOptions,
  catchOn,
  fieldFrom,
  floatingPickups,
  placePickup,
  placeRock,
  shipOf,
  stepTimes,
} from "../testing/field_picture";
import { PICKUPS } from "./catalog/pickups";
import { ROCK_KINDS } from "./catalog/rocks";
import type { Floating } from "./drops";
import type { FieldEvent } from "./events";
import { type Field, steerField, stepField } from "./field";
import { EFFECT_KINDS } from "./pickups";
import { rockHitRadius } from "./rocks";
import { STILL } from "./ship";
import { stepsIn } from "./stepper";
import {
  PICKUP_CATCH_REACH,
  PICKUP_LIFE_MS,
  PICKUP_PULL_REACH,
  PICKUP_PULL_SPEED,
  STEP_S,
} from "./tuning";

/** A rock in the field's corner, which keeps the wave from clearing, and the ship, far off it. */
const PICTURE = ["L", "", "", "", ".........^"];

/** Where the picture's ship is. */
const SHIP_X = 38;
const SHIP_Y = 18;

/** How far a pickup is drawn in to the ship in a step. */
const PULLED = PICKUP_PULL_SPEED * STEP_S;

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/** Returns the picture's field, with a rock in its corner and the ship. */
function fieldOf(options?: PictureOptions): Field {
  return fieldFrom(PICTURE, options);
}

/** Returns how many steps a pickup's effect lasts. */
function stepsOf(id: "spread" | "magnet" | "slow"): number {
  return stepsIn(PICKUPS[id].effect.ms);
}

/**
 * Returns a field just after the step a shot broke a rock in, letting a
 * pickup go, and the pickup; the ship is taken off, so it catches nothing.
 */
function droppedByShot(): { field: Field; floating: Floating } {
  const field = fieldFrom(["S", "", "^", "", "", "", "........L"], {
    drops: 1,
    pool: ["nova"],
  });
  steerField(field, { ...STILL, fire: true });
  for (let step = 0; step < 120; step++) {
    stepField(field);
    const [floating] = floatingPickups(field);
    if (floating) {
      field.ship = null;
      return { field, floating };
    }
  }
  throw new Error("The shot let no pickup go.");
}

/** Returns copies of the events a field's log holds, oldest first. */
function loggedOn(field: Field): FieldEvent[] {
  const events: FieldEvent[] = [];
  field.events.forEachSince(0, (event) => events.push({ ...event }));
  return events;
}

describe("a floating pickup", () => {
  it("drifts at its velocity", () => {
    const field = fieldOf();
    const floating = placePickup(field, "spread", 60, 30);
    floating.vx = 2;
    floating.vy = -1;

    stepTimes(field, 120);

    expect([floating.x, floating.y]).toEqual([
      expect.closeTo(62),
      expect.closeTo(29),
    ]);
  });

  it("drifts across the wrap", () => {
    const field = fieldOf();
    const floating = placePickup(field, "spread", 71.9, 30);
    floating.vx = 3;

    stepTimes(field, 40);

    expect(floating.x).toBeCloseTo(0.9);
  });

  it("drifts on with no ship", () => {
    const field = fieldFrom(["L"]);
    const floating = placePickup(field, "spread", 40, 20);
    floating.vx = 3;

    stepTimes(field, 40);

    expect(floating.x).toBeCloseTo(41);
  });

  it("floats as many steps as its life, the one a shot lets it go in among them", () => {
    const { field, floating } = droppedByShot();

    stepTimes(field, stepsIn(PICKUP_LIFE_MS) - 1);

    expect(floating.live).toBe(true);
  });

  it("then fades, logging it at its place", () => {
    const { field, floating } = droppedByShot();

    stepTimes(field, stepsIn(PICKUP_LIFE_MS));

    expect([floating.live, loggedOn(field).at(-1)]).toEqual([
      false,
      expect.objectContaining({
        kind: "faded",
        x: floating.x,
        y: floating.y,
        pickup: "nova",
      }),
    ]);
  });

  it.each([
    ["is drawn in toward the ship from", -SLIVER, -PULLED],
    ["drifts on from", SLIVER, 1 * STEP_S],
  ])("%s its reach", (_, beyond, moved) => {
    const field = fieldOf();
    const start = SHIP_X + PICKUP_PULL_REACH + beyond;
    const floating = placePickup(field, "spread", start, SHIP_Y);
    floating.vx = 1;

    stepField(field);

    expect(floating.x).toBeCloseTo(start + moved);
  });

  it("is drawn in toward the ship the shortest way, across the wrap", () => {
    const field = fieldFrom(["^", "", "", "", "", "", "........L"]);
    shipOf(field).x = 2.5;
    const floating = placePickup(field, "spread", 71.95, 2);

    stepField(field);

    expect(floating.x).toBeCloseTo(71.95 + PULLED - 72);
  });

  it("keeps where it was a step ago, for the scene to draw between", () => {
    const field = fieldOf();
    const floating = placePickup(field, "spread", 60, 30);
    floating.vx = 2;
    floating.vy = 1;
    stepField(field);
    const { x, y } = floating;

    stepField(field);

    expect([floating.lastX, floating.lastY]).toEqual([x, y]);
  });

  it("keeps its drift while it is drawn in, and drifts on with it out of reach", () => {
    const field = fieldOf();
    const floating = placePickup(field, "spread", SHIP_X + 2.5, SHIP_Y);
    floating.vx = 1;
    stepField(field);
    shipOf(field).x = 10;

    stepField(field);

    expect([floating.vx, floating.x]).toEqual([
      1,
      expect.closeTo(SHIP_X + 2.5 - PULLED + STEP_S),
    ]);
  });

  it.each([
    ["is caught by", -SLIVER, false],
    ["floats on beside", SLIVER, true],
  ])("%s the ship once it is drawn within its reach", (_, beyond, live) => {
    const field = fieldOf();
    const start = SHIP_X + PICKUP_CATCH_REACH + PULLED + beyond;
    const floating = placePickup(field, "spread", start, SHIP_Y);

    stepField(field);

    expect(floating.live).toBe(live);
  });

  it("is caught across the wrap", () => {
    const field = fieldFrom(["^", "", "", "", "", "", "........L"]);
    shipOf(field).x = 1;
    const floating = placePickup(field, "spread", 71.5, 2);

    stepField(field);

    expect(floating.live).toBe(false);
  });

  it("logs its catch at its place, with the pickup", () => {
    const field = fieldOf();
    placePickup(field, "lance", SHIP_X + 1, SHIP_Y);

    stepField(field);

    expect(loggedOn(field).at(-1)).toEqual(
      expect.objectContaining({
        kind: "caught",
        x: SHIP_X + 1 - PULLED,
        y: SHIP_Y,
        pickup: "lance",
      }),
    );
  });
});

describe("an effect", () => {
  it("lasts its time", () => {
    const field = fieldOf();
    catchOn(field, "spread");

    stepTimes(field, stepsOf("spread") - 1);

    expect(field.weapon).toBe("spread");
  });

  it("then ends", () => {
    const field = fieldOf();
    catchOn(field, "spread");

    stepTimes(field, stepsOf("spread"));

    expect([field.weapon, field.effects.weapon]).toEqual([
      "gun",
      { pickup: null, endsAt: 0 },
    ]);
  });

  it("gives way to the next of its group", () => {
    const field = fieldOf();
    catchOn(field, "spread");

    catchOn(field, "rapid");

    expect([field.weapon, field.effects.weapon.pickup]).toEqual([
      "rapid",
      "rapid",
    ]);
  });

  it("starts its time over as the same is caught again", () => {
    const field = fieldOf();
    catchOn(field, "spread");
    stepTimes(field, 600);
    catchOn(field, "spread");

    stepTimes(field, stepsOf("spread") - 1);

    expect(field.weapon).toBe("spread");
  });

  it("runs beside one of another group", () => {
    const field = fieldOf();
    catchOn(field, "spread");

    catchOn(field, "slow");

    expect([field.effects.weapon.pickup, field.effects.pace.pickup]).toEqual([
      "spread",
      "slow",
    ]);
  });

  it("names every group, in the order the field shows their tags", () => {
    expect(EFFECT_KINDS).toEqual([
      "weapon",
      "guard",
      "pull",
      "pace",
      "nova",
      "ship",
    ]);
  });
});

describe("each effect", () => {
  it.each(["spread", "rapid", "lance"] as const)(
    "hands the ship %s's weapon",
    (id) => {
      const field = fieldOf();

      catchOn(field, id);

      expect(field.weapon).toBe(PICKUPS[id].effect.weapon);
    },
  );

  it("shields the ship until a rock touches it, however long", () => {
    const field = fieldOf();
    catchOn(field, "shield");

    stepTimes(field, 10_000);

    expect([field.shielded, field.effects.guard]).toEqual([
      true,
      { pickup: "shield", endsAt: 0 },
    ]);
  });

  it("draws pickups in from the Magnet's reach", () => {
    const field = fieldOf();
    catchOn(field, "magnet");
    const start = SHIP_X + PICKUPS.magnet.effect.reach - SLIVER;
    const floating = placePickup(field, "spread", start, SHIP_Y);

    stepField(field);

    expect(floating.x).toBeCloseTo(start - PULLED);
  });

  it("draws them in from the near reach again once the Magnet's time is up", () => {
    const field = fieldOf();
    catchOn(field, "magnet");

    stepTimes(field, stepsOf("magnet"));

    expect(field.pullReach).toBe(PICKUP_PULL_REACH);
  });

  it("slows the rocks to the Slow's share of the wave's pace", () => {
    const field = fieldOf({ pace: 1.2 });

    catchOn(field, "slow");

    expect(field.pace).toBeCloseTo(1.2 * PICKUPS.slow.effect.scale);
  });

  it("brings the rocks back to the wave's pace once the Slow's time is up", () => {
    const field = fieldOf({ pace: 1.2 });
    catchOn(field, "slow");

    stepTimes(field, stepsOf("slow"));

    expect(field.pace).toBe(1.2);
  });

  it("hits each whole rock the Nova's reach from the ship touches, and no other", () => {
    const field = fieldOf();
    const touch = PICKUPS.nova.effect.reach + rockHitRadius("large");
    const near = placeRock(
      field,
      "large",
      SHIP_X + touch - SLIVER,
      SHIP_Y,
      "iron",
    );
    const far = placeRock(
      field,
      "large",
      SHIP_X,
      SHIP_Y + touch + SLIVER,
      "iron",
    );

    catchOn(field, "nova");

    expect([near.hits, far.hits]).toEqual([
      ROCK_KINDS.iron.hits.large - 1,
      ROCK_KINDS.iron.hits.large,
    ]);
  });

  it("logs the Nova's ring at the ship, with its reach, after the catch and before what it hits", () => {
    const field = fieldOf();
    placeRock(field, "small", SHIP_X + 5, SHIP_Y);

    catchOn(field, "nova");

    expect(loggedOn(field)).toEqual([
      expect.objectContaining({ kind: "caught" }),
      expect.objectContaining({
        kind: "nova",
        x: SHIP_X,
        y: SHIP_Y,
        reach: PICKUPS.nova.effect.reach,
      }),
      expect.objectContaining({ kind: "broken" }),
    ]);
  });

  it("gives a ship, for the run to add, and nothing to end", () => {
    const field = fieldOf();

    catchOn(field, "ship");

    expect([field.shipsGained, field.effects.ship]).toEqual([
      1,
      { pickup: null, endsAt: 0 },
    ]);
  });
});
