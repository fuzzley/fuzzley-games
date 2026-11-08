import { RADIANS_PER_DEGREE } from "../angles";
import { WEAPONS, WEAPON_IDS, type WeaponId } from "../catalog/weapons";
import { rockHitRadius } from "../rocks/rocks";
import { STEP_MS, stepsIn } from "../stepper";
import { type Torus, wrap } from "../torus";
import {
  SHIP_LENGTH,
  SHOT_EVERY_MS,
  SHOT_LIFE_MS,
  SHOT_RADIUS,
  SHOT_SPEED,
  STEP_S,
  TOP_SPEED,
} from "../tuning";
import {
  type Flight,
  type Ship,
  STILL,
  TUNED_FLIGHT,
  createShip,
  flyShip,
} from "./ship";
import {
  type Gunnery,
  MISSED,
  type Shot,
  type ShotField,
  type Shots,
  TUNED_GUNNERY,
  createShots,
  landShot,
  stepShots,
  sweepShot,
} from "./shots";

// Every speed and time here is `tuning.ts`'s or the catalog's, as the
// ship's specs take theirs.

const FIELD: Torus = { width: 72, height: 40 };

/** How far ahead of the ship's middle its shots leave. */
const NOSE = SHIP_LENGTH / 2;

/** How far a shot flies in a step from a still ship. */
const SHOT_STEP = SHOT_SPEED * STEP_S;

/**
 * The fastest a shot goes: its own speed and the ship's top speed, which is
 * all a dashing ship's shots carry.
 */
const FASTEST = SHOT_SPEED + TOP_SPEED;

/** How far a shot at the fastest flies in a step. */
const FASTEST_STEP = FASTEST * STEP_S;

/** How far from its middle a small rock is hit. */
const SMALL_ROCK = rockHitRadius("small");

/** How near a small rock's middle a shot's middle comes to meet it. */
const REACH = SMALL_ROCK + SHOT_RADIUS;

/** A gunnery that pulls every weapon's trigger every step. */
const EVERY_STEP: Gunnery = { ...TUNED_GUNNERY, gunEveryMs: STEP_MS };

/** A gunnery whose shots carry the ship's velocity, whatever `tuning.ts` says. */
const CARRYING: Gunnery = { ...TUNED_GUNNERY, carryShip: true };

/** How many steps a shot fired a unit short of an edge takes to fly past it. */
const PAST_AN_EDGE = Math.ceil(1 / SHOT_STEP) + 1;

/**
 * Returns a ship that has stopped waiting, at a place, its nose at an angle in
 * radians, at a velocity.
 */
function flying(x: number, y: number, angle: number, vx = 0, vy = 0): Ship {
  return { ...createShip(x, y, STILL), angle, vx, vy, waiting: false };
}

/**
 * Returns what shots fly and fire by: the shots, a ship, the gun in hand,
 * on the specs' field, at `tuning.ts`'s numbers, changed as given.
 */
function shotField(
  shots: Shots,
  ship: Readonly<Ship> | null,
  change: Partial<ShotField> = {},
): ShotField {
  return {
    shots,
    ship,
    weapon: "gun",
    torus: FIELD,
    gunnery: TUNED_GUNNERY,
    flight: TUNED_FLIGHT,
    ...change,
  };
}

/** Returns the shots in flight. */
function inFlight(shots: Shots): Shot[] {
  return shots.slots.filter((shot) => shot.lifeSteps > 0);
}

/** Returns the one shot of a list, failing the spec if it holds any other number. */
function only(shots: readonly Shot[]): Shot {
  const [shot, ...others] = shots;
  if (!shot || others.length > 0) {
    throw new Error(`Expected one shot, not ${shots.length}.`);
  }
  return shot;
}

/** Returns the first shot in flight, failing the spec if none is. */
function firstInFlight(shots: Shots): Shot {
  const shot = shots.slots.find((each) => each.lifeSteps > 0);
  if (!shot) throw new Error("Expected a shot in flight.");
  return shot;
}

/** Steps shots a number of steps from a ship where it is, fire held or not. */
function stepFor(
  shots: Shots,
  ship: Ship,
  steps: number,
  fire: boolean,
  weapon: WeaponId = "gun",
  gunnery: Gunnery = TUNED_GUNNERY,
): void {
  for (let step = 0; step < steps; step++) {
    stepShots(shotField(shots, ship, { weapon, gunnery }), fire);
  }
}

/**
 * Returns the steps between the pulls of a weapon whose trigger is held, over a
 * number of steps.
 */
function gapsBetweenPulls(weapon: WeaponId, steps: number): number[] {
  const shots = createShots();
  const ship = flying(36, 20, 0);
  const gaps: number[] = [];
  let last = 0;
  for (let step = 1; step <= steps; step++) {
    stepShots(shotField(shots, ship, { weapon }), true);
    const pulled = shots.slots.some(
      (shot) => shot.lifeSteps === stepsIn(SHOT_LIFE_MS),
    );
    if (pulled && last > 0) gaps.push(step - last);
    if (pulled) last = step;
  }
  return gaps;
}

/** Returns the shots a ship fires in one step, fire pressed. */
function pulled(
  ship: Ship,
  weapon: WeaponId = "gun",
  gunnery: Gunnery = TUNED_GUNNERY,
  flight: Flight = TUNED_FLIGHT,
): Shot[] {
  const shots = createShots();
  stepShots(shotField(shots, ship, { weapon, gunnery, flight }), true);
  return inFlight(shots);
}

/** Returns a shot that flew its last step from a place along a heading at a speed. */
function shotFrom(
  x: number,
  y: number,
  angle: number,
  speed = SHOT_SPEED,
): Shot {
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const lastX = wrap(x, FIELD.width);
  const lastY = wrap(y, FIELD.height);
  return {
    x: wrap(lastX + vx * STEP_S, FIELD.width),
    y: wrap(lastY + vy * STEP_S, FIELD.height),
    vx,
    vy,
    lastX,
    lastY,
    lifeSteps: 1,
    weapon: "gun",
    breaksLeft: 1,
    passedAt: [],
  };
}

/**
 * Returns a shot at the fastest whose last step grazed a small rock at a
 * place, on a chord half the step long, so that neither of the step's ends
 * came within its reach: one side of the rock or the other, as it flew.
 */
function grazing(x: number, y: number, angle: number, side: 1 | -1): Shot {
  const alongX = Math.cos(angle);
  const alongY = Math.sin(angle);
  const aside = side * Math.sqrt(REACH ** 2 - (FASTEST_STEP / 4) ** 2);
  return shotFrom(
    x - alongY * aside - (alongX * FASTEST_STEP) / 2,
    y + alongX * aside - (alongY * FASTEST_STEP) / 2,
    angle,
    FASTEST,
  );
}

describe("stepShots", () => {
  describe("firing", () => {
    it("says whether each step fired a pull", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);

      const fired = [true, true, false].map((fire) =>
        stepShots(shotField(shots, ship), fire),
      );

      expect(fired).toEqual([true, false, false]);
    });

    it("flies the shots in flight on while there is no ship, and fires none", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);
      stepShots(shotField(shots, ship, { gunnery: EVERY_STEP }), true);
      const { x } = only(inFlight(shots));

      const fired = stepShots(
        shotField(shots, null, { gunnery: EVERY_STEP }),
        true,
      );

      expect([fired, only(inFlight(shots)).x]).toEqual([
        false,
        expect.closeTo(x + SHOT_STEP),
      ]);
    });

    it("fires a shot from the ship's nose", () => {
      const shot = only(pulled(flying(36, 20, 1)));

      expect([shot.lastX, shot.lastY]).toEqual([
        expect.closeTo(36 + Math.cos(1) * NOSE),
        expect.closeTo(20 + Math.sin(1) * NOSE),
      ]);
    });

    it("fires a shot along the ship's heading at the shot speed, the ship's velocity added", () => {
      const shot = only(pulled(flying(36, 20, 1, 5, -3), "gun", CARRYING));

      expect([shot.vx, shot.vy]).toEqual([
        expect.closeTo(Math.cos(1) * SHOT_SPEED + 5),
        expect.closeTo(Math.sin(1) * SHOT_SPEED - 3),
      ]);
    });

    it("fires at the gunnery's shot speed", () => {
      const gunnery = { ...TUNED_GUNNERY, shotSpeed: 2 * SHOT_SPEED };

      const shot = only(pulled(flying(36, 20, 0), "gun", gunnery));

      expect([shot.vx, shot.vy]).toEqual([
        expect.closeTo(2 * SHOT_SPEED),
        expect.closeTo(0),
      ]);
    });

    it("leaves the ship's velocity out of a shot when the gunnery says to", () => {
      const gunnery = { ...TUNED_GUNNERY, carryShip: false };

      const shot = only(pulled(flying(36, 20, 0, 5, -3), "gun", gunnery));

      expect([shot.vx, shot.vy]).toEqual([
        expect.closeTo(SHOT_SPEED),
        expect.closeTo(0),
      ]);
    });

    it("carries a ship's velocity only up to its flight's top speed", () => {
      const flight = { ...TUNED_FLIGHT, topSpeed: TOP_SPEED / 2 };
      const ship = flying(36, 20, 0, TOP_SPEED, 0);

      const shot = only(pulled(ship, "gun", CARRYING, flight));

      expect([shot.vx, shot.vy]).toEqual([
        expect.closeTo(SHOT_SPEED + TOP_SPEED / 2),
        expect.closeTo(0),
      ]);
    });

    it("fires a shot from a dashing ship with only the ship's top speed added, the fastest a shot goes", () => {
      const ship = createShip(36, 20, STILL);
      flyShip(ship, { ...STILL, dash: true }, FIELD);

      const shot = only(pulled(ship, "gun", CARRYING));

      expect(Math.hypot(shot.vx, shot.vy)).toBeCloseTo(FASTEST);
    });

    it("fires from where the ship's nose is once the ship has flown its step", () => {
      const ship = flying(36, 20, 0, TOP_SPEED / 2, TOP_SPEED / 2);
      flyShip(ship, STILL, FIELD);

      const shot = only(pulled(ship));

      expect([shot.lastX, shot.lastY]).toEqual([
        expect.closeTo(ship.x + NOSE),
        expect.closeTo(ship.y),
      ]);
    });

    it("flies a shot its first step as it is fired", () => {
      const shot = only(pulled(flying(36, 20, 1)));

      expect([shot.x, shot.y]).toEqual([
        expect.closeTo(shot.lastX + shot.vx * STEP_S),
        expect.closeTo(shot.lastY + shot.vy * STEP_S),
      ]);
    });

    it.each([
      ["side", FIELD.width - 0.1, 20, 0, NOSE - 0.1, 20],
      ["bottom", 36, FIELD.height - 0.1, Math.PI / 2, 36, NOSE - 0.1],
    ])(
      "fires from a ship at the field's %s onto the field, across the edge",
      (_, x, y, angle, nearX, nearY) => {
        const shot = only(pulled(flying(x, y, angle)));

        expect([shot.lastX, shot.lastY]).toEqual([
          expect.closeTo(nearX),
          expect.closeTo(nearY),
        ]);
      },
    );

    it("fires nothing while fire isn't held", () => {
      const shots = createShots();

      stepShots(shotField(shots, flying(36, 20, 0)), false);

      expect(inFlight(shots)).toEqual([]);
    });

    it("fires nothing while the ship waits for its first move", () => {
      expect(pulled(createShip(36, 20, STILL))).toEqual([]);
    });

    it.each(WEAPON_IDS)(
      "fires %s's next pull its time after the last, fire held",
      (id) => {
        const shots = createShots();
        const ship = flying(36, 20, 0);
        stepFor(shots, ship, stepsIn(WEAPONS[id].everyMs), true, id);
        const early = inFlight(shots).length;

        stepFor(shots, ship, 1, true, id);

        expect([early, inFlight(shots).length]).toEqual([
          WEAPONS[id].count,
          2 * WEAPONS[id].count,
        ]);
      },
    );

    it("scales every weapon's time with the gun's, as the debug menu sets it", () => {
      const gunnery = { ...TUNED_GUNNERY, gunEveryMs: 2 * SHOT_EVERY_MS };
      const shots = createShots();
      const ship = flying(36, 20, 0);
      const steps = stepsIn(2 * WEAPONS.rapid.everyMs);
      stepFor(shots, ship, steps, true, "rapid", gunnery);
      const early = inFlight(shots).length;

      stepFor(shots, ship, 1, true, "rapid", gunnery);

      expect([early, inFlight(shots).length]).toEqual([1, 2]);
    });

    it.each(WEAPON_IDS)(
      "fires %s steadily while fire is held, through its first shots' fading",
      (id) => {
        const gaps = gapsBetweenPulls(id, 2 * stepsIn(SHOT_LIFE_MS));

        expect(new Set(gaps)).toEqual(new Set([stepsIn(WEAPONS[id].everyMs)]));
      },
    );

    it("keeps the time since the last pull through a change of weapon", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);
      stepFor(shots, ship, 1, true, "gun");
      stepFor(shots, ship, stepsIn(SHOT_EVERY_MS) - 1, true, "rapid");
      const early = inFlight(shots).length;

      stepFor(shots, ship, 1, true, "rapid");

      expect([early, inFlight(shots).length]).toEqual([1, 2]);
    });

    it("readies the weapon while fire isn't held", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);
      stepFor(shots, ship, 1, true);
      stepFor(shots, ship, stepsIn(SHOT_EVERY_MS) - 1, false);

      stepFor(shots, ship, 1, true);

      expect(inFlight(shots)).toHaveLength(2);
    });

    it("fires no faster for fire pressed again than for fire held", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);
      stepFor(shots, ship, 1, true);
      stepFor(shots, ship, 1, false);

      stepFor(shots, ship, 1, true);

      expect(inFlight(shots)).toHaveLength(1);
    });

    it("fans a spread's shots evenly about the heading, its angle apart", () => {
      const apart = WEAPONS.spread.spreadDeg * RADIANS_PER_DEGREE;

      const angles = pulled(flying(36, 20, 1), "spread")
        .map((shot) => Math.atan2(shot.vy, shot.vx))
        .sort((one, other) => one - other);

      expect(angles).toEqual([
        expect.closeTo(1 - apart),
        expect.closeTo(1),
        expect.closeTo(1 + apart),
      ]);
    });

    it.each(WEAPON_IDS)(
      "keeps %s's shots in flight to its most, however fast it fires",
      (id) => {
        const shots = createShots();

        stepFor(
          shots,
          flying(36, 20, 0),
          WEAPONS[id].inFlight + 1,
          true,
          id,
          EVERY_STEP,
        );

        expect(inFlight(shots)).toHaveLength(WEAPONS[id].inFlight);
      },
    );

    it("fires again as soon as a shot fades, keeping its most in flight", () => {
      const shots = createShots();

      stepFor(
        shots,
        flying(36, 20, 0),
        stepsIn(SHOT_LIFE_MS) + 1,
        true,
        "gun",
        EVERY_STEP,
      );

      expect(inFlight(shots)).toHaveLength(WEAPONS.gun.inFlight);
    });

    it("keeps a weapon's own shots to its most, beside those another left in flight", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);
      const pulls = WEAPONS.spread.inFlight / WEAPONS.spread.count;
      stepFor(shots, ship, pulls, true, "spread", EVERY_STEP);

      stepFor(shots, ship, WEAPONS.gun.inFlight + 1, true, "gun", EVERY_STEP);

      expect(inFlight(shots)).toHaveLength(
        WEAPONS.spread.inFlight + WEAPONS.gun.inFlight,
      );
    });

    it("holds a pull back until all of it fits in flight", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);
      const pulls = WEAPONS.spread.inFlight / WEAPONS.spread.count;
      stepFor(shots, ship, pulls, true, "spread", EVERY_STEP);
      landShot(firstInFlight(shots), false, 1);

      stepFor(shots, ship, 1, true, "spread", EVERY_STEP);

      expect(inFlight(shots)).toHaveLength(WEAPONS.spread.inFlight - 1);
    });

    it("gives each shot its weapon's breaks", () => {
      const shot = only(pulled(flying(36, 20, 0), "lance"));

      expect(shot.breaksLeft).toBe(WEAPONS.lance.breaks);
    });
  });

  describe("flight", () => {
    it("flies a shot on at its velocity, keeping where it was", () => {
      const shots = createShots();
      const ship = flying(36, 20, 1);
      stepFor(shots, ship, 1, true);
      const shot = only(inFlight(shots));
      const { x, y } = shot;

      stepFor(shots, ship, 1, false);

      expect([shot.lastX, shot.lastY, shot.x, shot.y]).toEqual([
        x,
        y,
        expect.closeTo(x + shot.vx * STEP_S),
        expect.closeTo(y + shot.vy * STEP_S),
      ]);
    });

    it.each([
      ["side", FIELD.width - 1 - NOSE, 20, 0, PAST_AN_EDGE * SHOT_STEP - 1, 20],
      [
        "bottom",
        36,
        FIELD.height - 1 - NOSE,
        Math.PI / 2,
        36,
        PAST_AN_EDGE * SHOT_STEP - 1,
      ],
    ])(
      "wraps a shot that flies past the field's %s",
      (_, x, y, angle, wrappedX, wrappedY) => {
        const shots = createShots();
        const ship = flying(x, y, angle);
        stepFor(shots, ship, 1, true);

        stepFor(shots, ship, PAST_AN_EDGE - 1, false);

        const shot = only(inFlight(shots));
        expect([shot.x, shot.y]).toEqual([
          expect.closeTo(wrappedX),
          expect.closeTo(wrappedY),
        ]);
      },
    );

    it("flies a shot for its time, the step it is fired in among them", () => {
      const shots = createShots();
      const ship = flying(10, 20, 0);
      const steps = stepsIn(SHOT_LIFE_MS);
      stepFor(shots, ship, 1, true);

      stepFor(shots, ship, steps - 1, false);

      expect(only(inFlight(shots)).x).toBeCloseTo(
        wrap(10 + NOSE + steps * SHOT_STEP, FIELD.width),
      );
    });

    it("fades a shot once its time is up, where it last flew", () => {
      const shots = createShots();
      const ship = flying(10, 20, 0);
      stepFor(shots, ship, 1, true);
      stepFor(shots, ship, stepsIn(SHOT_LIFE_MS) - 1, false);
      const shot = only(inFlight(shots));
      const { x } = shot;

      stepFor(shots, ship, 1, false);

      expect([inFlight(shots).length, shot.x]).toEqual([0, x]);
    });

    it("flies a spent shot no more", () => {
      const shots = createShots();
      const ship = flying(36, 20, 0);
      stepFor(shots, ship, 1, true);
      const shot = only(inFlight(shots));
      const { x } = shot;
      landShot(shot, false, 1);

      stepFor(shots, ship, 1, false);

      expect([inFlight(shots).length, shot.x]).toEqual([0, x]);
    });
  });
});

describe("landShot", () => {
  it.each([
    ["a gun's shot that breaks its rock", "gun", [true]],
    ["any shot that doesn't break its rock", "lance", [false]],
    [
      "a lance's shot on the last rock it may break",
      "lance",
      Array<boolean>(WEAPONS.lance.breaks).fill(true),
    ],
  ] as const)("spends %s", (_, id, hits) => {
    const shot = only(pulled(flying(36, 20, 0), id));

    for (const broke of hits) landShot(shot, broke, 1);

    expect(shot.lifeSteps).toBe(0);
  });

  it("lets a lance's shot fly on through each rock it breaks before its last", () => {
    const shot = only(pulled(flying(36, 20, 0), "lance"));
    const lifeSteps = shot.lifeSteps;

    for (let rock = 1; rock < WEAPONS.lance.breaks; rock++) {
      landShot(shot, true, rock);
    }

    expect([shot.lifeSteps, shot.breaksLeft]).toEqual([lifeSteps, 1]);
  });

  it("keeps each step a shot flew on through a rock in", () => {
    const shot = only(pulled(flying(36, 20, 0), "lance"));

    landShot(shot, true, 7);
    landShot(shot, true, 9);

    expect(shot.passedAt).toEqual([7, 9]);
  });

  it("leaves a shot that has flown on through nothing passing nothing", () => {
    const shot = only(pulled(flying(36, 20, 0), "lance"));

    landShot(shot, false, 7);

    expect(shot.passedAt).toEqual([-1, -1]);
  });

  it("fires a shot from a slot passing nothing, whatever it passed before", () => {
    const shots = createShots();
    const lanceField = shotField(shots, flying(36, 20, 0), {
      weapon: "lance",
      gunnery: EVERY_STEP,
    });
    stepShots(lanceField, true);
    const first = only(inFlight(shots));
    landShot(first, true, 1);
    first.lifeSteps = 0;

    stepShots(lanceField, true);

    expect(only(inFlight(shots)).passedAt).toEqual([-1, -1]);
  });
});

describe("sweepShot", () => {
  it("meets a circle ahead where the shot first comes within reach of it", () => {
    const shot = shotFrom(10, 20, 0);

    const met = sweepShot(
      shot,
      10 + SHOT_STEP / 2 + REACH,
      20,
      SMALL_ROCK,
      FIELD,
    );

    expect(met).toBeCloseTo(0.5);
  });

  it("meets a circle the shot reaches only as its step ends", () => {
    const shot = shotFrom(10, 20, 0);
    const short = SHOT_STEP / 10;

    const met = sweepShot(
      shot,
      10 + SHOT_STEP + REACH - short,
      20,
      SMALL_ROCK,
      FIELD,
    );

    expect(met).toBeCloseTo(0.9);
  });

  it("meets a circle the shot began within its own radius of, at once", () => {
    const shot = shotFrom(10, 20, 0);

    const met = sweepShot(
      shot,
      10,
      20 + SMALL_ROCK + SHOT_RADIUS / 2,
      SMALL_ROCK,
      FIELD,
    );

    expect(met).toBe(0);
  });

  it.each([
    [
      "beside its path, just out of reach",
      10 + SHOT_STEP / 2,
      20 + REACH * 1.01,
    ],
    ["behind it", 10 - REACH * 1.01, 20],
    ["ahead, past its step", 10 + SHOT_STEP + REACH * 1.01, 20],
  ])("misses a circle %s", (_, x, y) => {
    const shot = shotFrom(10, 20, 0);

    expect(sweepShot(shot, x, y, SMALL_ROCK, FIELD)).toBe(MISSED);
  });

  // The rows' rock and the shot's start lie across the edges they name.
  it.each([
    ["in the open", 36, 20, Math.PI / 6, 1],
    ["across the side edges", FIELD.width - FASTEST_STEP / 4, 20, Math.PI, 1],
    [
      "across the top and bottom",
      36,
      FIELD.height - FASTEST_STEP / 4,
      -Math.PI / 2,
      1,
    ],
    [
      "at a corner",
      FIELD.width - FASTEST_STEP / 4,
      FIELD.height - FASTEST_STEP / 4,
      Math.PI,
      -1,
    ],
  ] as const)(
    "meets a small rock that a shot at the fastest grazes between its step's ends, %s",
    (_, x, y, angle, side) => {
      const shot = grazing(x, y, angle, side);

      expect(sweepShot(shot, x, y, SMALL_ROCK, FIELD)).toBeCloseTo(0.25);
    },
  );
});
