import {
  fieldFrom,
  floatingPickups,
  loggedOn,
  placePickup,
  speedOf,
  wholeRocks,
} from "../../testing/field_picture";
import type { PickupId } from "../catalog/pickups";
import type { Field } from "../field/field";
import { stepsIn } from "../stepper";
import {
  DROUGHT_MS,
  PICKUP_BLINK_MS,
  PICKUP_DRIFT,
  PICKUP_LIFE_MS,
} from "../tuning";
import { type Floating, PICKUP_RECORDS, blinks } from "./drops";
import { hitRock } from "./rocks";

/** Breaks each of a field's whole rocks, as many hits as each takes. */
function breakAll(field: Field): void {
  for (const rock of wholeRocks(field)) hitRock(field, rock, 0, 0, "breaks");
}

/** Returns a field's one floating pickup, failing the spec if it has another number. */
function onlyPickup(field: Field): Floating {
  const [floating, ...others] = floatingPickups(field);
  if (!floating || others.length > 0) throw new Error("Expected one pickup.");
  return floating;
}

/**
 * Returns the pickups a broken small stone lets go on a field from a seed, by a
 * chance, from a pool.
 */
function droppedFrom(seed: number, drops = 1): PickupId[] {
  const field = fieldFrom(["S"], { seed, drops, pool: ["spread", "ship"] });
  breakAll(field);
  return floatingPickups(field).map((floating) => floating.id);
}

describe("a broken rock", () => {
  it("lets a pickup go from its place, drifting at a pickup's speed for a pickup's life", () => {
    const field = fieldFrom(["", "", ".S"], { drops: 1, pool: ["rapid"] });

    breakAll(field);

    const floating = onlyPickup(field);
    expect([
      floating.id,
      floating.x,
      floating.y,
      floating.lastX,
      floating.lastY,
      speedOf(floating),
      floating.lifeSteps,
    ]).toEqual([
      "rapid",
      6,
      10,
      6,
      10,
      expect.closeTo(PICKUP_DRIFT),
      stepsIn(PICKUP_LIFE_MS),
    ]);
  });

  it("logs the pickup let go at its place, with the pickup, after it broke", () => {
    const field = fieldFrom(["", "", ".S"], { drops: 1, pool: ["rapid"] });

    breakAll(field);

    expect(loggedOn(field).at(-1)).toMatchObject({
      kind: "dropped",
      x: 6,
      y: 10,
      pickup: "rapid",
    });
  });

  it("lets none go when the wave gives no chance", () => {
    const field = fieldFrom(["S"], { pool: ["spread"] });

    breakAll(field);

    expect(floatingPickups(field)).toEqual([]);
  });

  // A wave that can let none go draws as if it had no pickups at all.
  it.each([
    ["no chance", { drops: 0, pool: ["spread"] }],
    ["an empty pool", { drops: 1, pool: [] }],
  ] as const)("draws nothing for a drop when the wave gives %s", (_, setup) => {
    const dropping = fieldFrom(["L"], setup);
    const without = fieldFrom(["L"]);

    breakAll(dropping);
    breakAll(without);

    expect(dropping.draws).toBe(without.draws);
  });

  it("lets one go only by the wave's chance", () => {
    const dropped = Array.from(
      { length: 200 },
      (_, seed) => droppedFrom(seed, 0.25).length,
    );

    const count = dropped.filter((each) => each > 0).length;

    // About 50 of 200.
    expect(count).toBeGreaterThan(30);
    expect(count).toBeLessThan(70);
  });

  it("lets none go by chance once the wave's most at once float", () => {
    const field = fieldFrom(["SSS"], {
      drops: 1,
      pool: ["spread"],
      pickupsAtOnce: 2,
    });

    breakAll(field);

    expect(floatingPickups(field)).toHaveLength(2);
  });

  it("lets none go while the wave's pool is empty, from a crystal either", () => {
    const field = fieldFrom(["ML"], { kind: "crystal", drops: 1 });

    breakAll(field);

    expect(floatingPickups(field)).toEqual([]);
  });

  it("lets none go once every record floats one", () => {
    const field = fieldFrom(["M".repeat(PICKUP_RECORDS + 1)], {
      kind: "crystal",
      pool: ["spread"],
    });

    breakAll(field);

    expect(floatingPickups(field)).toHaveLength(PICKUP_RECORDS);
  });

  it("draws the pickups by their weight", () => {
    const drawn = Array.from({ length: 1100 }, (_, seed) => droppedFrom(seed));

    const ships = drawn.filter(([id]) => id === "ship").length;

    // The extra ship weighs 1 against Spread's 10: about 100 of 1,100.
    expect(ships).toBeGreaterThan(70);
    expect(ships).toBeLessThan(130);
  });

  it("lets the same pickups go the same way from the same seed", () => {
    const first = fieldFrom(["SSS"], {
      seed: 3,
      drops: 0.5,
      pool: ["spread", "nova"],
    });
    const second = fieldFrom(["SSS"], {
      seed: 3,
      drops: 0.5,
      pool: ["spread", "nova"],
    });

    breakAll(first);
    breakAll(second);

    expect(floatingPickups(second)).toEqual(floatingPickups(first));
  });

  it("lets pickups go other ways from other seeds", () => {
    const ways = Array.from({ length: 4 }, (_, seed) => {
      const field = fieldFrom(["S"], { seed, drops: 1, pool: ["spread"] });
      breakAll(field);
      return onlyPickup(field).vx;
    });

    expect(new Set(ways).size).toBe(ways.length);
  });
});

describe("a broken crystal", () => {
  it("lets a pickup go whatever the chance and however many float", () => {
    const field = fieldFrom(["MLM"], {
      kind: "crystal",
      pool: ["spread"],
      pickupsAtOnce: 1,
    });

    breakAll(field);

    expect(floatingPickups(field)).toHaveLength(3);
  });
});

describe("a drought", () => {
  it("lets a pickup go from the first large rock broken once it has gone by, whatever the chance", () => {
    const field = fieldFrom(["LL"], { pool: ["spread"] });
    field.steps = stepsIn(DROUGHT_MS);

    breakAll(field);

    expect(floatingPickups(field)).toHaveLength(1);
  });

  it.each([
    ["none just before", -1, 0],
    ["one once", 0, 1],
  ])(
    "lets %s it has gone by since the last pickup let go",
    (_, beyond, count) => {
      // The pickup the small one lets go keeps chance from letting another.
      const field = fieldFrom(["S", "", "L"], {
        drops: 1,
        pool: ["spread"],
        pickupsAtOnce: 1,
      });
      const [small, large] = wholeRocks(field);
      if (!small || !large) throw new Error("The picture has two rocks.");
      field.steps = 100;
      hitRock(field, small, 0, 0);
      field.steps = 100 + stepsIn(DROUGHT_MS) + beyond;

      hitRock(field, large, 0, 0);

      expect(floatingPickups(field)).toHaveLength(1 + count);
    },
  );

  it.each([
    ["a medium", "M"],
    ["a small", "S"],
    ["the boulder", "B"],
  ])("lets none go from %s rock", (_, picture) => {
    const field = fieldFrom([picture], { pool: ["spread"] });
    field.steps = stepsIn(DROUGHT_MS);

    breakAll(field);

    expect(floatingPickups(field)).toEqual([]);
  });
});

describe("blinks", () => {
  it.each([
    ["blinks", stepsIn(PICKUP_BLINK_MS), true],
    ["doesn't blink", stepsIn(PICKUP_BLINK_MS) + 1, false],
  ])("%s a pickup with %d steps left", (_, lifeSteps, blinking) => {
    const floating = placePickup(fieldFrom([]), "spread", 10, 10);
    floating.lifeSteps = lifeSteps;

    expect(blinks(floating)).toBe(blinking);
  });
});
