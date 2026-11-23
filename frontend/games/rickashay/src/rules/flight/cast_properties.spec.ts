import { AIMS } from "@fz/brick-wall/rules/aims";
import { COLUMNS, RADIUS } from "@fz/brick-wall/rules/field";
import { createRandom } from "@fz/core/random";
import {
  castByScan,
  castOf,
  randomField,
  randomShot,
} from "../../testing/cast_reference";
import {
  type Flight,
  type Leg,
  type Point,
  clearance,
  flownByCast,
} from "../../testing/random_flights";
import { cast, castField, createContacts } from "./cast";
import { facesOf } from "./faces";

/** The seeds of the property specs' sources of numbers, one a batch. */
const SEEDS = [20261123, 20261124, 20261125, 20261126];

/** How many moves each random flight makes. */
const MOVES = 40;

/** The flights flown for each seed, kept once flown so each property reads the same ones. */
const FLIGHTS = new Map<number, readonly Flight[]>();

/** Returns the flights of a seed's batch: 100 random fields, each flown twice from its floor at a random aim. */
function flightsOf(seed: number): readonly Flight[] {
  const kept = FLIGHTS.get(seed);
  if (kept !== undefined) {
    return kept;
  }
  const random = createRandom(seed);
  const flights = Array.from({ length: 100 }, () =>
    randomField(random),
  ).flatMap((field) =>
    Array.from({ length: 2 }, () =>
      flownByCast(
        field,
        RADIUS + random() * (COLUMNS - 2 * RADIUS),
        AIMS[Math.floor(random() * AIMS.length)]!,
        MOVES,
      ),
    ),
  );
  FLIGHTS.set(seed, flights);
  return flights;
}

/** Returns whether a move of more than a hair flies along one of an aim's eight headings, as near as a sum rounds: its speeds, or each the other's, with either sign. */
function keepsToAim([aimX, aimY]: Point, { from, to }: Leg): boolean {
  const [x, y] = [to[0] - from[0], to[1] - from[1]];
  const length = Math.hypot(x, y);
  const across = Math.abs(x / length);
  const up = Math.abs(y / length);
  const [ax, ay] = [Math.abs(aimX), Math.abs(aimY)];
  const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
  return (
    (near(across, ax) && near(up, ay)) || (near(across, ay) && near(up, ax))
  );
}

/**
 * The squared distance a fuzzball's middle keeps from any brick, less a
 * hair: a radius over the square root of 2, at a cut corner, the nearest
 * any face lies to its brick.
 */
const CLEAR = (RADIUS * Math.SQRT1_2 - 1e-6) ** 2;

describe("cast, against a scan of every face", () => {
  // Seeded random fields of every kind of brick, and four shots at each,
  // anywhere a middle may be, a third of them on quarter units, touching
  // faces, seams and corners: 1,000 fields in four batches.
  it.each(SEEDS)(
    "meets what the scan meets, at the same moments, on 250 fields (seed %i)",
    (seed) => {
      const random = createRandom(seed);
      const shots = Array.from({ length: 250 }, () =>
        randomField(random),
      ).flatMap((field) =>
        Array.from({ length: 4 }, () => ({
          field,
          ...randomShot(field, random),
        })),
      );
      const contacts = createContacts();

      const casts = shots.map(
        ({ field: { wall, depth }, x, y, dx, dy, eyes }) =>
          castOf(cast(castField(wall, depth), x, y, dx, dy, eyes, contacts)),
      );

      expect(casts).toEqual(
        shots.map(({ field: { wall, depth }, x, y, dx, dy, eyes }) =>
          castByScan(facesOf(castField(wall, depth)), x, y, dx, dy, eyes),
        ),
      );
    },
  );
});

describe("cast, along random flights", () => {
  // Seeded random fields, each flown twice from its floor for 40 moves by
  // cast() and C3's turns, breaking bricks, opening hatches and passing
  // portals: 800 flights and 32,000 casts in four batches. A move's
  // heading is read from where cast() put the middle, so it holds cast()'s
  // place along the heading, as well as the turns.
  it.each(SEEDS)(
    "meets what the scan meets as the bricks break and the hatches open (seed %i)",
    (seed) => {
      const flights = flightsOf(seed);

      expect(flights.flatMap(({ casts }) => casts)).toEqual(
        flights.flatMap(({ scans }) => scans),
      );
    },
  );

  it.each(SEEDS)(
    "keeps the middle a radius from the walls, the ceiling and the floor (seed %i)",
    (seed) => {
      const ends = flightsOf(seed).flatMap(({ depth, legs }) =>
        legs.flatMap(({ from, to }) =>
          [from, to].map((end) => ({ depth, end })),
        ),
      );

      expect(
        ends.filter(
          ({ depth, end: [x, y] }) =>
            x < RADIUS - 1e-9 ||
            x > COLUMNS - RADIUS + 1e-9 ||
            y < RADIUS - 1e-9 ||
            y > depth - RADIUS + 1e-9,
        ),
      ).toEqual([]);
    },
  );

  it.each(SEEDS)(
    "keeps every move clear of the bricks standing as it flies (seed %i)",
    (seed) => {
      const legs = flightsOf(seed).flatMap(({ legs }) => legs);

      expect(
        legs.filter(({ from, to, solids }) =>
          solids.some((solid) => clearance(from, to, solid) < CLEAR),
        ),
      ).toEqual([]);
    },
  );

  it.each(SEEDS)(
    "flies every move along one of its aim's eight headings (seed %i)",
    (seed) => {
      const strays = flightsOf(seed).flatMap(({ aim, legs }) =>
        legs
          .filter(
            ({ from, to }) =>
              Math.hypot(to[0] - from[0], to[1] - from[1]) > 1e-3,
          )
          .filter((leg) => !keepsToAim(aim, leg)),
      );

      expect(strays).toEqual([]);
    },
  );
});
