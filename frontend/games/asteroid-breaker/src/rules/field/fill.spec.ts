import {
  KEEPER,
  fieldFrom,
  placeComet,
  placePickup,
  placeRock,
  placeStray,
  shipOf,
} from "../../testing/field_picture";
import { TURN } from "../angles";
import { STILL, type Steer, createShip } from "../ship/ship";
import type { Torus } from "../torus";
import {
  COMET_MARGIN,
  PICKUPS_AT_ONCE,
  ROCK_CAP,
  STRAY_FIRST_MS,
} from "../tuning";
import type { Wave } from "../waves/waves";
import { type Field, steerField, stepField } from "./field";
import { type Fill, areaShare, fillFor, stretchField } from "./fill";

/** A wave of three large stones and a medium ice, a stray and comets every 9 to 12 s, as written. */
const WAVE: Wave = {
  rocks: [
    { kind: "stone", size: "large", count: 3 },
    { kind: "ice", size: "medium", count: 1 },
  ],
  formation: "scatter",
  pace: 1,
  waveKind: "stone",
  drops: 0.05,
  pool: [],
  strays: 1,
  cometEvery: { least: 9000, most: 12_000 },
};

/** A desktop's field, 73 by 40. */
const DESKTOP: Torus = { width: 73, height: 40 };

/** The widest field, upright. */
const WIDEST: Torus = { width: 40, height: 88 };

/** Returns how a wave of the spec's, changed as given, fills a field. */
function filled(torus: Torus, changes: Partial<Wave> = {}): Fill {
  return fillFor({ ...WAVE, ...changes }, torus);
}

/** Steps a field once by a steering. */
function stepBy(field: Field, steer: Readonly<Steer>): void {
  steerField(field, steer);
  stepField(field);
}

describe("areaShare", () => {
  it.each([
    ["40 by 40", { width: 40, height: 40 }, 1],
    ["73 by 40", DESKTOP, 1.825],
    ["40 by 88", WIDEST, 2.2],
  ])("is how many times 40 by 40 a field of %s is", (_, torus, share) => {
    expect(areaShare(torus)).toBeCloseTo(share);
  });
});

describe("fillFor", () => {
  it("keeps a wave's counts as written on a field of 40 by 40", () => {
    expect(filled({ width: 40, height: 40 })).toEqual({
      rocks: WAVE.rocks,
      cap: ROCK_CAP,
      pickupsAtOnce: PICKUPS_AT_ONCE,
      strays: 1,
      strayFirstMs: STRAY_FIRST_MS,
      cometEvery: WAVE.cometEvery,
    });
  });

  it.each([
    ["on its side", WIDEST],
    ["upright", { width: 40, height: 88 }],
  ])(
    "brings the first stray later on the widest field %s, by its area",
    (_, torus) => {
      expect(filled(torus).strayFirstMs).toBeCloseTo(STRAY_FIRST_MS * 2.2);
    },
  );

  it("grows each count by the field's area, to the nearest: 3 large stone is 5 on a desktop's 73 by 40", () => {
    const fill = filled(DESKTOP);

    expect([
      fill.rocks.map((each) => each.count),
      fill.pickupsAtOnce,
      fill.strays,
    ]).toEqual([[5, 2], 4, 2]);
  });

  it("caps the widest field at 105 rocks", () => {
    expect(filled(WIDEST).cap).toBe(105);
  });

  it("caps a field at the rocks it lays at least, as rounding may grow them past the cap", () => {
    const rocks = [{ kind: "stone", size: "small", count: ROCK_CAP }] as const;

    const fill = filled(DESKTOP, { rocks });

    expect([fill.rocks[0]?.count, fill.cap]).toEqual([88, 88]);
  });

  it("sends comets more often by the square root of the field's area", () => {
    const sooner = Math.sqrt(2.2);

    const every = filled(WIDEST).cometEvery;

    expect([every?.least, every?.most]).toEqual([
      expect.closeTo(9000 / sooner, 6),
      expect.closeTo(12_000 / sooner, 6),
    ]);
  });

  it("sends no comets for a wave without them", () => {
    expect(filled(WIDEST, { cometEvery: null }).cometEvery).toBeNull();
  });
});

describe("stretchField", () => {
  /** Returns a field of 72 by 40 with something of every kind on it, moving and not where it was a step ago. */
  function fieldOfAll(): Field {
    const field = fieldFrom(["", "", ".........^"]);
    const ship = shipOf(field);
    Object.assign(ship, { lastX: 30, lastY: 8, vx: 3, vy: -2 });
    const rock = placeRock(field, "large", 54, 20);
    Object.assign(rock, { lastX: 53, lastY: 21, vx: 4, vy: 1 });
    placePickup(field, "spread", 18, 32);
    placeStray(field, 36, 4);
    placeComet(field, 6, 20);
    const [shot] = field.shots.slots;
    if (shot) Object.assign(shot, { x: 9, y: 36, lastX: 8, lastY: 35 });
    return field;
  }

  it("moves every place to the same share of the way across and down", () => {
    const field = fieldOfAll();

    stretchField(field, { width: 36, height: 80 });

    const [rock] = field.rocks;
    const [pickup] = field.pickups;
    const [comet] = field.comets.slots;
    const [shot] = field.shots.slots;
    expect([
      [field.ship?.x, field.ship?.y, field.ship?.lastX, field.ship?.lastY],
      [rock?.x, rock?.y, rock?.lastX, rock?.lastY],
      [pickup?.x, pickup?.y],
      [field.strays.adrift.x, field.strays.adrift.y],
      [comet?.x, comet?.y],
      [shot?.x, shot?.y, shot?.lastX, shot?.lastY],
    ]).toEqual([
      [19, 20, 15, 16],
      [27, 40, 26.5, 42],
      [9, 64],
      [18, 8],
      [3, 40],
      [4.5, 72, 4, 70],
    ]);
  });

  it("keeps a stray or a comet off the field as far off it, beyond either edge", () => {
    const field = fieldFrom([], { torus: { width: 40, height: 40 } });
    const stray = placeStray(field, -1, 10);
    Object.assign(stray, { lastX: -1.5, lastY: 10 });
    const comet = placeComet(field, 43, 50);

    stretchField(field, { width: 54, height: 60 });

    expect([
      [stray.x, stray.y, stray.lastX, stray.lastY],
      [comet.x, comet.y],
    ]).toEqual([
      [-1, 15, -1.5, 15],
      [57, 70],
    ]);
  });

  it.each([
    ["the left edge, the field widening", -COMET_MARGIN, 20, 0, 54, 40],
    ["the top, the field growing taller", 20, -COMET_MARGIN, TURN / 4, 40, 54],
  ])(
    "lets a comet crossing in from off %s come in as it would have",
    (_, x, y, heading, width, height) => {
      const field = fieldFrom(KEEPER, { torus: { width: 40, height: 40 } });
      const comet = placeComet(field, x, y, heading);
      stretchField(field, { width, height });

      stepField(field);

      expect(comet.live).toBe(true);
    },
  );

  it("leaves a still mouse's aim as it is, so the ship it aims at waits on", () => {
    const field = fieldFrom(KEEPER);
    const aiming = { ...STILL, aim: { x: 60, y: 30 } };
    field.ship = createShip(36, 20, aiming);
    stretchField(field, { width: 36, height: 80 });

    stepBy(field, aiming);

    expect(shipOf(field).waiting).toBe(true);
  });

  it("takes the new shape, and keeps every speed", () => {
    const field = fieldOfAll();
    const torus = { width: 36, height: 80 };

    stretchField(field, torus);

    const [rock] = field.rocks;
    expect([
      field.torus,
      field.ship?.vx,
      field.ship?.vy,
      rock?.vx,
      rock?.vy,
    ]).toEqual([torus, 3, -2, 4, 1]);
  });

  // A place a hair short of the far edge, the float just below 40.1, can
  // stretch onto it.
  it("wraps a place the stretch takes onto the far edge back to the near one", () => {
    const field = fieldFrom([], { torus: { width: 40.1, height: 40 } });
    const rock = placeRock(field, "large", 40.1 - 2 ** -47, 20);

    stretchField(field, { width: 72, height: 40 });

    expect([rock.x, rock.lastX]).toEqual([0, 0]);
  });
});
