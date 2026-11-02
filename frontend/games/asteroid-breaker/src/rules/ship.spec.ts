import {
  type Flight,
  type Ship,
  type Steer,
  STILL,
  TUNED_FLIGHT,
  createShip,
  flyShip,
  guardShip,
  isGuarded,
  rechargeShare,
  thrustOf,
  waitOn,
} from "./ship";
import { STEP_MS, stepsIn } from "./stepper";
import { type Torus, across } from "./torus";
import {
  COAST_HALF_LIFE_MS,
  DASH_CARRY,
  DASH_GUARD_MS,
  DASH_MS,
  DASH_RECHARGE_MS,
  DASH_SPEED,
  HEADING_EASE,
  HEADING_TURN_RATE,
  KEY_TURN_RAMP_MS,
  KEY_TURN_RATE,
  NEW_SHIP_GUARD_MS,
  STEP_S,
  STICK_SLACK,
  THRUST,
  TOP_SPEED,
} from "./tuning";

// The numbers are `tuning.ts`'s, which playing tunes, so every speed, time
// and turn here is taken from them; these hold what the flight does with
// them, and `tuning.spec.ts` what tuning must keep.

const FIELD: Torus = { width: 72, height: 40 };

/** The share of its speed a coasting ship keeps each step. */
const COAST_STEP = 0.5 ** (STEP_MS / COAST_HALF_LIFE_MS);

/** How far full keys turn the ship in a step, in degrees. */
const KEY_STEP_TURN = KEY_TURN_RATE * STEP_S;

/** How far the keys turn the ship in the first step of their ramp, in degrees. */
const FIRST_KEY_TURN = KEY_STEP_TURN * Math.min(1, STEP_MS / KEY_TURN_RAMP_MS);

/** How far a far heading turns the ship in a step, in degrees. */
const HEADING_STEP_TURN = HEADING_TURN_RATE * STEP_S;

/** Returns a steering of what is given, and nothing else. */
function steer(given: Partial<Steer>): Steer {
  return { ...STILL, ...given };
}

/** Returns a ship that has stopped waiting, in the middle of the field, its nose at an angle in degrees. */
function flying(angle: number, vx = 0, vy = 0): Ship {
  return {
    ...createShip(36, 20, STILL),
    angle: radians(angle),
    vx,
    vy,
    waiting: false,
  };
}

/** Flies a ship a number of steps by one steering. */
function flySteps(
  ship: Ship,
  by: Readonly<Steer>,
  steps: number,
  flight?: Flight,
): void {
  for (let step = 0; step < steps; step++) flyShip(ship, by, FIELD, flight);
}

/** Flies a ship for a time by one steering. */
function fly(
  ship: Ship,
  by: Readonly<Steer>,
  ms: number,
  flight?: Flight,
): void {
  flySteps(ship, by, stepsIn(ms), flight);
}

/** Returns an angle in degrees in radians. */
function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Returns how far a ship has turned from an angle in radians, in degrees, clockwise above 0. */
function turnedFrom(angle: number, ship: Ship): number {
  return (across(angle, ship.angle, 2 * Math.PI) * 180) / Math.PI;
}

/** Returns how fast a ship flies. */
function speedOf(ship: Ship): number {
  return Math.hypot(ship.vx, ship.vy);
}

describe("createShip", () => {
  it("waits still and guarded where it was, its nose up and its dash charged", () => {
    const ship = createShip(10, 20, STILL);

    expect({
      place: [ship.x, ship.y, ship.lastX, ship.lastY],
      velocity: [ship.vx, ship.vy],
      nose: [ship.angle, ship.lastAngle],
      guarded: isGuarded(ship),
      recharge: ship.rechargeSteps,
    }).toEqual({
      place: [10, 20, 10, 20],
      velocity: [0, 0],
      nose: [radians(270), radians(270)],
      guarded: true,
      recharge: 0,
    });
  });
});

describe("flyShip", () => {
  describe("waiting", () => {
    /** The mouse's place, away from where the waiting ships wait. */
    const POINTER = { x: 60, y: 30 };

    it("holds a waiting ship where it is, guarded, while nothing steers it", () => {
      const ship = createShip(10, 20, STILL);

      fly(ship, STILL, 3000);

      expect([ship.x, ship.y, isGuarded(ship)]).toEqual([10, 20, true]);
    });

    it.each([
      ["a turn", { turn: -1 }],
      ["a stick's heading", { heading: 0 }],
      ["the mouse", { aim: POINTER }],
      ["a push", { thrust: 0.2 }],
      ["fire", { fire: true }],
      ["a dash", { dash: true }],
    ])("lets a waiting ship go at %s", (_, given) => {
      const ship = createShip(10, 20, STILL);

      flyShip(ship, steer(given), FIELD);

      expect(ship.waiting).toBe(false);
    });

    it.each([
      ["a turn", { turn: 1 }],
      ["a stick's heading", { heading: 1 }],
      ["the mouse, where it stays", { aim: POINTER }],
      ["a push", { thrust: 1 }],
      ["fire", { fire: true }],
      ["a dash", { dash: true }],
    ])("keeps a ship waiting, still, under %s held as it came", (_, given) => {
      const ship = createShip(10, 20, steer(given));

      fly(ship, steer(given), 1000);

      expect({
        waiting: ship.waiting,
        held: [ship.x, ship.y, speedOf(ship), ship.angle],
      }).toEqual({ waiting: true, held: [10, 20, 0, radians(270)] });
    });

    it.each([
      ["a turn", { turn: 1 }],
      ["a stick's heading", { heading: 1 }],
      ["the mouse", { aim: POINTER }],
      ["a push", { thrust: 1 }],
      ["fire", { fire: true }],
      ["a dash", { dash: true }],
    ])(
      "lets a ship that came under %s go once it is let go and given again",
      (_, given) => {
        const ship = createShip(10, 20, steer(given));
        fly(ship, steer(given), 500);
        flyShip(ship, STILL, FIELD);

        flyShip(ship, steer(given), FIELD);

        expect(ship.waiting).toBe(false);
      },
    );

    it.each([
      ["across", { x: 60.5, y: 30 }],
      ["down", { x: 60, y: 30.5 }],
    ])(
      "lets a ship that came under the mouse go once the mouse moves %s",
      (_, moved) => {
        const ship = createShip(10, 20, steer({ aim: POINTER }));
        fly(ship, steer({ aim: POINTER }), 500);

        flyShip(ship, steer({ aim: moved }), FIELD);

        expect(ship.waiting).toBe(false);
      },
    );

    it.each([
      [
        "either side of where it pointed",
        1,
        1 + radians((3 * STICK_SLACK) / 4),
        1 - radians((3 * STICK_SLACK) / 4),
      ],
      [
        "pointing left, either side of a half turn",
        Math.PI,
        Math.PI - radians(STICK_SLACK / 4),
        -Math.PI + radians(STICK_SLACK / 4),
      ],
    ])(
      "keeps a ship that came under a stick waiting while the stick trembles within its slack, %s",
      (_, came, one, other) => {
        const ship = createShip(10, 20, steer({ heading: came }));

        for (let step = 0; step < stepsIn(500); step++) {
          const heading = step % 2 === 0 ? other : one;
          flyShip(ship, steer({ heading }), FIELD);
        }

        expect(ship.waiting).toBe(true);
      },
    );

    it("lets a ship that came under a stick go once the stick turns past its slack, however slowly", () => {
      const ship = createShip(10, 20, steer({ heading: 1 }));

      for (let degrees = 1; degrees <= STICK_SLACK + 1; degrees++) {
        flyShip(ship, steer({ heading: 1 + radians(degrees) }), FIELD);
      }

      expect(ship.waiting).toBe(false);
    });

    it("lets a ship that came under a turn go once the turn turns round", () => {
      const ship = createShip(10, 20, steer({ turn: 1 }));
      fly(ship, steer({ turn: 1 }), 500);

      flyShip(ship, steer({ turn: -1 }), FIELD);

      expect(ship.waiting).toBe(false);
    });

    it("throws a waiting ship at once when a dash ends its wait", () => {
      const ship = createShip(10, 20, STILL);

      flyShip(ship, steer({ dash: true }), FIELD);

      expect(speedOf(ship)).toBeCloseTo(DASH_SPEED);
    });

    it.each([
      ["a turn", { turn: 1 }, stepsIn(NEW_SHIP_GUARD_MS)],
      [
        "a dash",
        { dash: true },
        Math.max(stepsIn(NEW_SHIP_GUARD_MS), stepsIn(DASH_GUARD_MS)),
      ],
    ])(
      "guards a ship that first moves by %s for the longer of its guards, and no longer",
      (_, given, steps) => {
        const ship = createShip(10, 20, STILL);
        const guarded: boolean[] = [];

        flyShip(ship, steer(given), FIELD);
        flySteps(ship, STILL, steps - 1);
        guarded.push(isGuarded(ship));
        flyShip(ship, STILL, FIELD);
        guarded.push(isGuarded(ship));

        expect(guarded).toEqual([true, false]);
      },
    );
  });

  describe("turning by keys", () => {
    it("turns at the keys' full rate once they have ramped in", () => {
      const ship = flying(0);
      fly(ship, steer({ turn: 1 }), 2 * KEY_TURN_RAMP_MS);
      const angle = ship.angle;

      fly(ship, steer({ turn: 1 }), 100);

      expect(turnedFrom(angle, ship)).toBeCloseTo(stepsIn(100) * KEY_STEP_TURN);
    });

    it("turns a tap shorter than the ramp under half what the full rate would", () => {
      const ship = flying(0);
      const tapMs = KEY_TURN_RAMP_MS / 2;

      fly(ship, steer({ turn: 1 }), tapMs);

      expect(turnedFrom(0, ship)).toBeGreaterThan(0);
      expect(turnedFrom(0, ship)).toBeLessThan(
        (stepsIn(tapMs) * KEY_STEP_TURN) / 2,
      );
    });

    it("turns anticlockwise at −1, its angle kept within a turn", () => {
      const ship = flying(KEY_STEP_TURN / 2);

      fly(ship, steer({ turn: -1 }), 100);

      expect(turnedFrom(radians(KEY_STEP_TURN / 2), ship)).toBeLessThan(0);
      expect(ship.angle).toBeGreaterThanOrEqual(Math.PI);
      expect(ship.angle).toBeLessThan(2 * Math.PI);
    });

    it.each([
      ["the keys let go", STILL],
      ["a stick turned the ship", steer({ heading: 0 })],
    ])("ramps the keys' turn in again after %s", (_, between) => {
      const ship = flying(0);
      fly(ship, steer({ turn: 1 }), 2 * KEY_TURN_RAMP_MS);
      flyShip(ship, between, FIELD);
      const angle = ship.angle;

      flyShip(ship, steer({ turn: 1 }), FIELD);

      expect(turnedFrom(angle, ship)).toBeCloseTo(FIRST_KEY_TURN);
    });

    it("ramps the keys' turn in again as it turns round", () => {
      const ship = flying(0);
      fly(ship, steer({ turn: 1 }), 2 * KEY_TURN_RAMP_MS);
      const angle = ship.angle;

      flyShip(ship, steer({ turn: -1 }), FIELD);

      expect(turnedFrom(angle, ship)).toBeCloseTo(-FIRST_KEY_TURN);
    });
  });

  describe("turning toward a stick's heading", () => {
    it.each([
      ["clockwise", 90, 1],
      ["anticlockwise", -90, -1],
    ])(
      "turns %s at its full rate while far from the heading",
      (_, toward, way) => {
        const ship = flying(0);

        flyShip(ship, steer({ heading: radians(toward) }), FIELD);

        expect(turnedFrom(0, ship)).toBeCloseTo(way * HEADING_STEP_TURN);
      },
    );

    it("slows as it nears the heading: halfway into the ease, at half its rate", () => {
      const ship = flying(0);

      flyShip(ship, steer({ heading: radians(HEADING_EASE / 2) }), FIELD);

      expect(turnedFrom(0, ship)).toBeCloseTo(HEADING_STEP_TURN / 2);
    });

    it("comes to a heading without passing it", () => {
      const ship = flying(270);
      const turned: number[] = [];
      const steps = stepsIn((1000 * 90) / HEADING_TURN_RATE + 1000);

      for (let step = 0; step < steps; step++) {
        flyShip(ship, steer({ heading: 0 }), FIELD);
        turned.push(turnedFrom(radians(270), ship));
      }

      expect(Math.max(...turned)).toBeLessThanOrEqual(90);
      expect(turned.at(-1)).toBeCloseTo(90);
    });

    it("turns the short way round, across 0, its angle kept within a turn", () => {
      const start = HEADING_STEP_TURN / 2;
      const ship = flying(start);

      flyShip(ship, steer({ heading: radians(start - 90) }), FIELD);

      expect(ship.angle).toBeCloseTo(radians(360 - HEADING_STEP_TURN / 2));
      expect(ship.angle).toBeLessThan(2 * Math.PI);
    });
  });

  describe("turning toward the mouse", () => {
    it("turns toward the mouse's place at the heading's rate", () => {
      const ship = flying(0);

      flyShip(ship, steer({ aim: { x: ship.x, y: ship.y + 10 } }), FIELD);

      expect(turnedFrom(0, ship)).toBeCloseTo(HEADING_STEP_TURN);
    });

    it("turns toward the mouse as the player sees it, not the shorter way across an edge", () => {
      const ship = flying(90);
      ship.x = 10;

      flyShip(ship, steer({ aim: { x: 60, y: ship.y } }), FIELD);

      expect(turnedFrom(radians(90), ship)).toBeLessThan(0);
    });

    it("doesn't turn toward the mouse on the ship's own place", () => {
      const ship = flying(30);

      flyShip(ship, steer({ aim: { x: ship.x, y: ship.y } }), FIELD);

      expect(ship.angle).toBeCloseTo(radians(30));
    });
  });

  describe("thrust", () => {
    it.each([
      [0, 1, 0],
      [90, 0, 1],
    ])(
      "pushes a ship with its nose at %d° along its heading",
      (angle, x, y) => {
        const ship = flying(angle);

        fly(ship, steer({ thrust: 1 }), 250);

        expect([ship.vx / speedOf(ship), ship.vy / speedOf(ship)]).toEqual([
          expect.closeTo(x),
          expect.closeTo(y),
        ]);
      },
    );

    it("pushes half as hard at half thrust", () => {
      const full = flying(0);
      const half = flying(0);
      const ms = (1000 * TOP_SPEED) / (4 * THRUST);

      fly(full, steer({ thrust: 1 }), ms);
      fly(half, steer({ thrust: 0.5 }), ms);

      expect(speedOf(half) / speedOf(full)).toBeCloseTo(0.5);
    });

    it("coasts while it thrusts too", () => {
      const ship = flying(0);

      flyShip(ship, steer({ thrust: 1 }), FIELD);

      expect(speedOf(ship)).toBeCloseTo(THRUST * STEP_S * COAST_STEP);
    });

    it("holds a ship at its top speed while it thrusts", () => {
      const ship = flying(0);

      fly(ship, steer({ thrust: 1 }), 10_000);

      expect(speedOf(ship)).toBeCloseTo(TOP_SPEED);
    });

    it("halves a ship's speed in the coasting's half-life", () => {
      const ship = flying(0, TOP_SPEED, 0);

      fly(ship, STILL, COAST_HALF_LIFE_MS);

      expect(speedOf(ship)).toBeCloseTo(TOP_SPEED / 2);
    });

    it("stops a ship turned round and thrusting back, then flies it back", () => {
      const ship = flying(180, TOP_SPEED, 0);

      fly(ship, steer({ thrust: 1 }), (2000 * TOP_SPEED) / THRUST);

      expect(ship.vx).toBeLessThan(0);
    });
  });

  describe("a flight of its own, as the debug menu hands it", () => {
    it("keeps a ship under the flight's top speed", () => {
      const ship = flying(0);

      fly(ship, steer({ thrust: 1 }), 10_000, {
        ...TUNED_FLIGHT,
        topSpeed: TOP_SPEED / 2,
      });

      expect(speedOf(ship)).toBeCloseTo(TOP_SPEED / 2);
    });

    it("pushes a ship by the flight's thrust", () => {
      const tuned = flying(0);
      const doubled = flying(0);
      const ms = (1000 * TOP_SPEED) / (8 * THRUST);

      fly(tuned, steer({ thrust: 1 }), ms);
      fly(doubled, steer({ thrust: 1 }), ms, {
        ...TUNED_FLIGHT,
        thrust: 2 * THRUST,
      });

      expect(speedOf(doubled) / speedOf(tuned)).toBeCloseTo(2);
    });

    it("halves a ship's speed in the flight's half-life", () => {
      const ship = flying(0, TOP_SPEED, 0);
      const halfLife = COAST_HALF_LIFE_MS / 2;

      fly(ship, STILL, halfLife, {
        ...TUNED_FLIGHT,
        coastHalfLifeMs: halfLife,
      });

      expect(speedOf(ship)).toBeCloseTo(TOP_SPEED / 2);
    });

    it("turns a ship by keys at the flight's rate", () => {
      const flight = { ...TUNED_FLIGHT, keyTurnRate: KEY_TURN_RATE / 2 };
      const ship = flying(0);
      fly(ship, steer({ turn: 1 }), 2 * KEY_TURN_RAMP_MS, flight);
      const angle = ship.angle;

      fly(ship, steer({ turn: 1 }), 100, flight);

      expect(turnedFrom(angle, ship)).toBeCloseTo(
        (stepsIn(100) * KEY_STEP_TURN) / 2,
      );
    });

    it("turns a ship toward a heading at the flight's rate", () => {
      const ship = flying(0);

      flyShip(ship, steer({ heading: radians(90) }), FIELD, {
        ...TUNED_FLIGHT,
        headingTurnRate: HEADING_TURN_RATE / 2,
      });

      expect(turnedFrom(0, ship)).toBeCloseTo(HEADING_STEP_TURN / 2);
    });
  });

  describe("the wrap", () => {
    it("brings a ship off one edge in at the other", () => {
      const ship = flying(0, TOP_SPEED / 2, -TOP_SPEED / 2);
      ship.x = FIELD.width - 0.01;
      ship.y = 0.01;

      flyShip(ship, STILL, FIELD);

      expect(ship.x).toBeLessThan(1);
      expect(ship.y).toBeGreaterThan(FIELD.height - 1);
      expect(ship.y).toBeLessThan(FIELD.height);
    });
  });

  describe("where it was", () => {
    it("keeps where a ship was and where its nose pointed before each step, for the scene to draw between", () => {
      const ship = flying(30, TOP_SPEED / 2, TOP_SPEED / 2);
      flyShip(ship, steer({ turn: 1, thrust: 1 }), FIELD);
      const before = [ship.x, ship.y, ship.angle];

      flyShip(ship, steer({ turn: 1, thrust: 1 }), FIELD);

      expect([ship.lastX, ship.lastY, ship.lastAngle]).toEqual(before);
    });
  });

  describe("the dash", () => {
    it("says a dash started in the step it starts, and in no other", () => {
      const ship = flying(270);

      const started = [
        flyShip(ship, steer({ dash: true }), FIELD),
        flyShip(ship, steer({ dash: true }), FIELD),
        flyShip(ship, STILL, FIELD),
      ];

      expect(started).toEqual([true, false, false]);
    });

    it("throws a ship along its heading at the dash's speed for the dash's time", () => {
      const ship = flying(270);
      const speeds: number[] = [];

      flyShip(ship, steer({ dash: true }), FIELD);
      speeds.push(speedOf(ship));
      flySteps(ship, STILL, stepsIn(DASH_MS) - 1);
      speeds.push(speedOf(ship), ship.vy);
      flyShip(ship, STILL, FIELD);
      speeds.push(speedOf(ship));

      expect(speeds).toEqual([
        expect.closeTo(DASH_SPEED),
        expect.closeTo(DASH_SPEED),
        expect.closeTo(-DASH_SPEED),
        expect.closeTo(DASH_CARRY * COAST_STEP),
      ]);
    });

    it("throws a ship on along the heading it dashed at while it turns", () => {
      const ship = flying(270);
      const turning = steer({ dash: true, turn: 1 });
      flyShip(ship, turning, FIELD);
      const dashedAt = ship.angle;

      flySteps(ship, turning, stepsIn(DASH_MS) - 1);

      expect({
        turned: turnedFrom(dashedAt, ship) > 0,
        velocity: [ship.vx, ship.vy],
      }).toEqual({
        turned: true,
        velocity: [
          expect.closeTo(Math.cos(dashedAt) * DASH_SPEED),
          expect.closeTo(Math.sin(dashedAt) * DASH_SPEED),
        ],
      });
    });

    it("carries a ship on along the heading the dash ends on", () => {
      const ship = flying(270);
      fly(ship, steer({ dash: true, turn: 1 }), DASH_MS);

      flyShip(ship, STILL, FIELD);

      expect([ship.vx, ship.vy]).toEqual([
        expect.closeTo(Math.cos(ship.angle) * DASH_CARRY * COAST_STEP),
        expect.closeTo(Math.sin(ship.angle) * DASH_CARRY * COAST_STEP),
      ]);
    });

    it("leaves a ship what it flew at, and a little more along its heading", () => {
      const ship = flying(270, TOP_SPEED / 3, 0);

      fly(ship, steer({ dash: true }), DASH_MS);
      flyShip(ship, STILL, FIELD);

      expect([ship.vx, ship.vy]).toEqual([
        expect.closeTo((TOP_SPEED / 3) * COAST_STEP),
        expect.closeTo(-DASH_CARRY * COAST_STEP),
      ]);
    });

    it("keeps a ship under its top speed once a dash ends", () => {
      const ship = flying(0, TOP_SPEED, 0);

      fly(ship, steer({ dash: true }), DASH_MS);
      flyShip(ship, STILL, FIELD);

      expect(speedOf(ship)).toBeCloseTo(
        Math.min(TOP_SPEED, (TOP_SPEED + DASH_CARRY) * COAST_STEP),
      );
    });

    it("guards a ship from a dash's start for the dash's guard, and no longer", () => {
      const ship = flying(0);
      const guarded: boolean[] = [];

      flySteps(ship, steer({ dash: true }), stepsIn(DASH_GUARD_MS));
      guarded.push(isGuarded(ship));
      flyShip(ship, STILL, FIELD);
      guarded.push(isGuarded(ship));

      expect(guarded).toEqual([true, false]);
    });

    it("dashes once while the dash is held, not again once it has charged", () => {
      const ship = flying(0);

      flySteps(ship, steer({ dash: true }), stepsIn(DASH_RECHARGE_MS) + 1);

      expect(ship.dashSteps).toBe(0);
    });

    it("won't dash again before the dash has charged", () => {
      const ship = flying(0);
      flyShip(ship, steer({ dash: true }), FIELD);
      flySteps(ship, STILL, stepsIn(DASH_RECHARGE_MS) - 2);

      flyShip(ship, steer({ dash: true }), FIELD);

      expect(ship.dashSteps).toBe(0);
    });

    it("dashes again once the dash has charged", () => {
      const ship = flying(0);
      flyShip(ship, steer({ dash: true }), FIELD);
      flySteps(ship, STILL, stepsIn(DASH_RECHARGE_MS) - 1);

      flyShip(ship, steer({ dash: true }), FIELD);

      expect(ship.dashSteps).toBeGreaterThan(0);
    });
  });
});

describe("guardShip", () => {
  it("guards a ship from the next step for the time, and no longer", () => {
    const ship = flying(0);
    const guarded: boolean[] = [];

    guardShip(ship, 1000);
    flySteps(ship, STILL, stepsIn(1000));
    guarded.push(isGuarded(ship));
    flyShip(ship, STILL, FIELD);
    guarded.push(isGuarded(ship));

    expect(guarded).toEqual([true, false]);
  });

  it("leaves a longer guard as it is", () => {
    const ship = flying(0);
    guardShip(ship, 2000);
    const longer = ship.guardSteps;

    guardShip(ship, 500);

    expect(ship.guardSteps).toBe(longer);
  });
});

describe("thrustOf", () => {
  it("finds a flying ship pushed as hard as its thrust was held", () => {
    const ship = flying(0);

    flyShip(ship, steer({ thrust: 0.5 }), FIELD);

    expect(thrustOf(ship)).toBe(0.5);
  });

  it("finds a waiting ship pushed by no thrust held as it came", () => {
    const ship = createShip(36, 20, steer({ thrust: 1 }));

    expect(thrustOf(ship)).toBe(0);
  });

  it("finds a ship a dash throws pushed by no thrust", () => {
    const ship = flying(0);

    flyShip(ship, steer({ thrust: 1, dash: true }), FIELD);

    expect(thrustOf(ship)).toBe(0);
  });
});

describe("rechargeShare", () => {
  it("finds a ship that never dashed charged", () => {
    expect(rechargeShare(flying(0))).toBe(1);
  });

  it("finds a ship's dash recharging over its time, from nothing as it dashes", () => {
    const ship = flying(0);
    const shares: number[] = [];

    flyShip(ship, steer({ dash: true }), FIELD);
    shares.push(rechargeShare(ship));
    fly(ship, STILL, DASH_RECHARGE_MS / 2);
    shares.push(rechargeShare(ship));
    fly(ship, STILL, DASH_RECHARGE_MS / 2);
    shares.push(rechargeShare(ship));

    expect(shares).toEqual([0, 0.5, 1]);
  });
});

describe("waitOn", () => {
  it("waits on through steering that doesn't move a waiting ship, its guard kept", () => {
    const ship = createShip(36, 20, STILL);
    guardShip(ship, 500);
    const guard = ship.guardSteps;

    const waits = waitOn(ship, STILL);

    expect([waits, ship.waiting, ship.guardSteps]).toEqual([true, true, guard]);
  });

  it("waits no more through a fresh move, leaving it for the ship's flight", () => {
    const ship = createShip(36, 20, STILL);

    const waits = waitOn(ship, steer({ thrust: 1 }));

    expect([waits, ship.waiting]).toEqual([false, true]);
  });

  it("takes what it waits through as held, so a push let go and given again moves it", () => {
    const ship = createShip(36, 20, steer({ thrust: 1 }));
    waitOn(ship, STILL);

    const waits = waitOn(ship, steer({ thrust: 1 }));

    expect(waits).toBe(false);
  });

  it("finds a ship flying waits for nothing", () => {
    expect(waitOn(flying(0), STILL)).toBe(false);
  });
});
