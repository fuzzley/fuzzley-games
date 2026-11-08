import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ENDLESS_PLAYED, FIELDS } from "../../testing/autopilot";
import { LAYOUT_SEEDS, nearness, startOn } from "../../testing/every_layout";
import {
  fieldFrom,
  placeRock,
  speedOf,
  wholeRocks,
} from "../../testing/field_picture";
import { TURN } from "../angles";
import type { Rock } from "../rocks/rocks";
import { createCrew } from "../ship/pilots";
import { SPEEDS, SPEED_INFO } from "../speed";
import { type Place, type Torus, across, distance, middleOf } from "../torus";
import {
  FAIR_COURSE,
  FAIR_COURSE_MS,
  FAIR_DISTANCE,
  FIRST_SHIP_POINTS,
  ROCK_CAP,
  ROCK_RADIUS,
  ROCK_SPEED,
  SAFE_MIDDLE,
  STRAY_FIRST_MS,
} from "../tuning";
import { endlessWave } from "../waves/endless";
import {
  FORMATIONS,
  type Formation,
  WAVES,
  type Wave,
  parseWave,
} from "../waves/waves";
import { type Field, type FieldSetup, createField, fieldFor } from "./field";
import { layOut, liesFairly, safestPlace } from "./spawn";

/** The narrowest field. */
const NARROWEST: Torus = { width: 40, height: 40 };

/** Endless's waves the autopilot is held to, by number. */
const ENDLESS_NUMBERS = ENDLESS_PLAYED.map((entry) => entry.number);

/** The middle of a field of 40 by 40, where its ship waits. */
const MIDDLE: Place = { x: 20, y: 20 };

/** The rocks of a wave of the spec's: two large stones and two small ice. */
const ROCKS = [
  { kind: "stone", size: "large", count: 2 },
  { kind: "ice", size: "small", count: 2 },
] as const;

/**
 * How the spec's fields are played but for their shape, their pace and their
 * seed: no pickups, strays or comets, and a run's first crew.
 */
const SETUP: FieldSetup = {
  torus: NARROWEST,
  cap: ROCK_CAP,
  seed: 1,
  pace: 1,
  waveKind: "stone",
  drops: 0,
  pool: [],
  pickupsAtOnce: 2,
  strays: 0,
  strayFirstMs: STRAY_FIRST_MS,
  cometEvery: null,
  crew: createCrew(),
  banked: 0,
  nextShipAt: FIRST_SHIP_POINTS,
};

/**
 * Returns a field of a shape at a pace, from a seed, its ship waiting in the
 * middle and no rock laid yet.
 */
function waitingField(torus: Torus, pace = 1, seed = 1): Field {
  return createField({ ...SETUP, torus, pace, seed });
}

/**
 * Returns a field of a shape, 40 by 40 unless given, with the spec's rocks laid
 * out in a formation as written.
 */
function laidOut(formation: Formation, torus: Torus = NARROWEST): Field {
  const field = waitingField(torus);
  layOut(field, ROCKS, formation, middleOf(torus));
  return field;
}

/** Returns the first wave, parsed. */
function parsedFirst(): Wave {
  const [first] = WAVES;
  if (!first) throw new Error("The game has a wave.");
  return parseWave(first);
}

/**
 * Returns which way round the middle of a field of 40 by 40 a rock flies: 1 one
 * way, −1 the other.
 */
function wayRound(rock: Readonly<Rock>): number {
  return Math.sign(
    across(20, rock.x, 40) * rock.vy - across(20, rock.y, 40) * rock.vx,
  );
}

/**
 * Returns how far it is along an ellipse of two half-axes from one angle it
 * is drawn by to another, summed over fine steps.
 */
function lengthAlong(
  halfAcross: number,
  halfDown: number,
  from: number,
  to: number,
): number {
  const steps = 10_000;
  let length = 0;
  for (let step = 0; step < steps; step++) {
    const before = from + ((to - from) * step) / steps;
    const after = from + ((to - from) * (step + 1)) / steps;
    length += Math.hypot(
      halfAcross * (Math.cos(after) - Math.cos(before)),
      halfDown * (Math.sin(after) - Math.sin(before)),
    );
  }
  return length;
}

/**
 * Returns how near any two of a field's rocks come, outline to outline: below 0
 * where they lie over each other.
 */
function tightestGap(field: Field): number {
  const rocks = wholeRocks(field);
  return Math.min(
    ...rocks.flatMap((rock, i) =>
      rocks
        .slice(i + 1)
        .map(
          (other) =>
            distance(field.torus, rock.x, rock.y, other.x, other.y) -
            ROCK_RADIUS[rock.size] -
            ROCK_RADIUS[other.size],
        ),
    ),
  );
}

/** Returns an empty field of 40 by 40, at a pace, its ship gone. */
function emptyField(pace = 1): Field {
  return fieldFrom([], { torus: NARROWEST, pace });
}

describe("layOut", () => {
  // Every wave in every formation on every field, from many seeds, is laid
  // out at each speed by the specs in `every_layout/`, a file for each.
  it("lays every wave out at each speed in a file of its own, and only those", () => {
    const files = readdirSync(join(import.meta.dirname, "every_layout"));

    expect(new Set(files)).toEqual(
      new Set(SPEEDS.map((speed) => `${speed}.spec.ts`)),
    );
  });

  it.each(FORMATIONS)(
    "lays the last wave out fairly as a %s, every rock, at twice the rocks' speed the debug menu tunes",
    (formation) => {
      const entry = WAVES.at(-1);
      if (!entry) throw new Error("No waves");
      const wave = { ...parseWave(entry), formation };
      const unfair: number[] = [];

      for (const seed of LAYOUT_SEEDS) {
        const setup = startOn(NARROWEST, "normal", seed);
        const field = fieldFor(wave, { ...setup, rockSpeed: 2 });
        const { off, flown } = nearness(field);
        if (off < FAIR_DISTANCE || flown < FAIR_COURSE) unfair.push(seed);
      }

      expect(unfair).toEqual([]);
    },
  );

  it("lays a ring evenly round the ship, as far off as a large rock sits inside the field's short side, every rock flying along it one way", () => {
    const field = laidOut("ring");
    const radius = 20 - ROCK_RADIUS.large - 1;

    const rocks = wholeRocks(field);
    const offs = rocks.map((rock) =>
      distance(field.torus, 20, 20, rock.x, rock.y),
    );
    const along = rocks.map((rock) => {
      const outX = across(20, rock.x, 40);
      const outY = across(20, rock.y, 40);
      return (outX * rock.vy - outY * rock.vx) / (radius * speedOf(rock));
    });

    expect([
      offs,
      along.map(Math.abs),
      new Set(along.map(Math.sign)).size,
    ]).toEqual([
      rocks.map((): unknown => expect.closeTo(radius, 9)),
      rocks.map((): unknown => expect.closeTo(1, 9)),
      1,
    ]);
  });

  it("lays a ring on a long field along an ellipse as long and as wide as the field leaves a large rock inside it, every rock flying along it", () => {
    const field = laidOut("ring", { width: 88, height: 40 });
    const halfAcross = 44 - ROCK_RADIUS.large - 1;
    const halfDown = 20 - ROCK_RADIUS.large - 1;

    const rocks = wholeRocks(field);
    const on = rocks.map(
      (rock) =>
        (across(44, rock.x, 88) / halfAcross) ** 2 +
        (across(20, rock.y, 40) / halfDown) ** 2,
    );
    // The way out of an ellipse at a place on it, at right angles to the
    // way along it.
    const out = rocks.map((rock) => {
      const outX = across(44, rock.x, 88) / halfAcross ** 2;
      const outY = across(20, rock.y, 40) / halfDown ** 2;
      return (
        (outX * rock.vx + outY * rock.vy) /
        (Math.hypot(outX, outY) * speedOf(rock))
      );
    });

    expect([on, out]).toEqual([
      rocks.map((): unknown => expect.closeTo(1, 9)),
      rocks.map((): unknown => expect.closeTo(0, 9)),
    ]);
  });

  it.each(FIELDS)(
    "keeps every ring's rocks apart, written or Endless's, on a field of %o, at the count it grows to",
    (torus) => {
      const written = WAVES.map((entry) => ({
        wave: parseWave(entry),
        seed: 1,
      }));
      const endless = ENDLESS_NUMBERS.flatMap((number) =>
        LAYOUT_SEEDS.map((seed) => ({ wave: endlessWave(seed, number), seed })),
      );
      const rings = [...written, ...endless].filter(
        ({ wave }) => wave.formation === "ring",
      );

      const gaps = rings.map(({ wave, seed }) =>
        tightestGap(fieldFor(wave, startOn(torus, "normal", seed))),
      );

      expect(Math.min(...gaps)).toBeGreaterThan(0);
    },
  );

  it("flies a ring either way, as drawn", () => {
    const ways = new Set(
      LAYOUT_SEEDS.map((seed) => {
        const field = waitingField(NARROWEST, 1, seed);
        layOut(field, ROCKS, "ring", MIDDLE);
        const [rock] = wholeRocks(field);
        if (!rock) throw new Error("The ring has a rock.");
        return wayRound(rock);
      }),
    );

    expect(ways).toEqual(new Set([-1, 1]));
  });

  // So fast that some of a ring's rocks come round the wrap at the ship
  // and are turned to keep clear of it.
  it("flies a ring one way though some of its rocks were turned to keep clear", () => {
    const ways = LAYOUT_SEEDS.map((seed) => {
      const field = waitingField(NARROWEST, 1.5, seed);
      layOut(field, ROCKS, "ring", MIDDLE);
      return new Set(wholeRocks(field).map(wayRound)).size;
    });

    expect(ways).toEqual(LAYOUT_SEEDS.map(() => 1));
  });

  it("spaces a ring's rocks evenly", () => {
    const field = laidOut("ring");

    const angles = wholeRocks(field)
      .map((rock) => Math.atan2(across(20, rock.y, 40), across(20, rock.x, 40)))
      .sort((a, b) => a - b);
    const [first = 0] = angles;
    const gaps = angles.map(
      (angle, i) => (angles[i + 1] ?? first + 2 * Math.PI) - angle,
    );

    expect(gaps).toEqual(
      gaps.map((): unknown => expect.closeTo(Math.PI / 2, 9)),
    );
  });

  it("spaces a ring's rocks evenly along its ellipse on a long field", () => {
    const torus = { width: 88, height: 40 };
    const field = waitingField(torus);
    const halfAcross = 44 - ROCK_RADIUS.large - 1;
    const halfDown = 20 - ROCK_RADIUS.large - 1;
    const rocks = [{ kind: "stone", size: "large", count: 7 }] as const;

    layOut(field, rocks, "ring", middleOf(torus));

    const angles = wholeRocks(field)
      .map((rock) =>
        Math.atan2(
          across(20, rock.y, 40) / halfDown,
          across(44, rock.x, 88) / halfAcross,
        ),
      )
      .sort((a, b) => a - b);
    const [first = 0] = angles;
    const gaps = angles.map((angle, i) =>
      lengthAlong(halfAcross, halfDown, angle, angles[i + 1] ?? first + TURN),
    );
    const whole = lengthAlong(halfAcross, halfDown, 0, TURN);

    expect(gaps).toEqual(gaps.map((): unknown => expect.closeTo(whole / 7, 2)));
  });

  it.each([
    [
      "across a field wider than tall, at its left and right edge",
      { width: 88, height: 40 },
      "x",
      0,
      "y",
    ],
    [
      "across a field taller than wide, at its top and bottom edge",
      { width: 40, height: 88 },
      "y",
      0,
      "x",
    ],
  ] as const)(
    "lays a wall %s, half the long side from the ship, evenly",
    (_, torus, at, edge, along) => {
      const field = laidOut("wall", torus);

      const rocks = wholeRocks(field);
      const short = Math.min(torus.width, torus.height);

      expect([
        rocks.map((rock) => rock[at]),
        rocks.map((rock) => rock[along]).sort((a, b) => a - b),
      ]).toEqual([
        rocks.map(() => edge),
        [1, 3, 5, 7].map((eighth): unknown =>
          expect.closeTo((eighth * short) / 8, 9),
        ),
      ]);
    },
  );

  it("flies a wall's rocks along the long side at one speed", () => {
    const field = laidOut("wall", { width: 88, height: 40 });

    const rocks = wholeRocks(field);
    const [first] = rocks;

    expect(rocks.map((rock) => [rock.vx, rock.vy])).toEqual(
      rocks.map((): unknown[] => [first?.vx, expect.closeTo(0, 9)]),
    );
  });

  it("flies a wall at the slowest speed drawn, a large stone's behind small ice, while that is fair", () => {
    const torus = { width: 88, height: 40 };
    const rocks = [
      { kind: "ice", size: "small", count: 2 },
      { kind: "stone", size: "large", count: 2 },
    ] as const;
    const field = waitingField(torus);

    layOut(field, rocks, "wall", middleOf(torus));

    const [rock] = wholeRocks(field);
    if (!rock) throw new Error("The wall has a rock.");
    expect(speedOf(rock)).toBeGreaterThanOrEqual(ROCK_SPEED.large.least);
    expect(speedOf(rock)).toBeLessThanOrEqual(ROCK_SPEED.large.most);
  });

  it.each([
    [
      "of four at the fastest pace, none quite in line with the ship",
      4,
      NARROWEST,
      1.4 * SPEED_INFO.fast.motion,
    ],
    ["of three, one in line with it", 3, { width: 41.4, height: 40 }, 1],
  ] as const)(
    "slows a wall %s no faster than keeps a rock in line with the ship clear of it",
    (_, count, torus, pace) => {
      const rocks = [{ kind: "ice", size: "small", count }] as const;
      const field = waitingField(torus, pace);

      layOut(field, rocks, "wall", middleOf(torus));

      const fairest =
        (torus.width / 2 - FAIR_COURSE) / ((FAIR_COURSE_MS / 1000) * pace);
      expect(wholeRocks(field).map(speedOf)).toEqual(
        Array.from({ length: count }, (): unknown =>
          expect.closeTo(fairest, 6),
        ),
      );
    },
  );

  it("gathers a cluster about a middle half the long side from the ship", () => {
    const field = laidOut("cluster", { width: 88, height: 40 });

    const offs = wholeRocks(field).map((rock) =>
      distance(field.torus, 0, 20, rock.x, rock.y),
    );

    expect(
      offs.filter((off) => off > ROCK_RADIUS.large * Math.sqrt(3) + 1e-9),
    ).toEqual([]);
  });

  it("flies a cluster's rocks one way", () => {
    const field = laidOut("cluster", { width: 88, height: 40 });

    const headings = wholeRocks(field).map((rock) =>
      Math.atan2(rock.vy, rock.vx),
    );

    expect(headings).toEqual(
      headings.map((): unknown => expect.closeTo(headings[0] ?? 0, 9)),
    );
  });

  // So fast that no way but at right angles to the way to the ship keeps
  // clear of it.
  it.each([
    ["down a field wider than tall", NARROWEST, "vx"],
    ["across a field taller than wide", { width: 40, height: 41 }, "vy"],
  ] as const)(
    "turns a cluster whose way isn't fair at right angles to the way to the ship, %s",
    (_, torus, still) => {
      const field = fieldFrom([], { torus, pace: 50 });
      const rocks = [{ kind: "ice", size: "small", count: 3 }] as const;

      layOut(field, rocks, "cluster", middleOf(torus));

      expect(wholeRocks(field).map((rock) => rock[still])).toEqual(
        [0, 1, 2].map((): unknown => expect.closeTo(0, 9)),
      );
    },
  );

  /**
   * Returns a field of 40 by 40 with two dozen large stones laid out on it in a
   * formation, scattered unless it says, so many that a cluster crowds and
   * flying so fast that hardly a course they are drawn on keeps clear of the
   * ship.
   */
  function laidFast(formation: Formation = "scatter"): Field {
    const field = waitingField(NARROWEST, 50, 3);
    const rocks = [{ kind: "stone", size: "large", count: 24 }] as const;
    layOut(field, rocks, formation, MIDDLE);
    return field;
  }

  it.each(FORMATIONS)(
    "lays every rock of a crowded %s far enough off the ship, on a course clear of it however far round the wrap it would take it",
    (formation) => {
      const field = laidFast(formation);

      const { off, flown } = nearness(field);
      expect(off).toBeGreaterThanOrEqual(FAIR_DISTANCE);
      expect(flown).toBeGreaterThanOrEqual(FAIR_COURSE);
    },
  );

  const drawnCases = FORMATIONS.flatMap((formation) =>
    FIELDS.map(
      (torus) =>
        [
          `${formation}, ${String(torus.width)} by ${String(torus.height)}`,
          formation,
          torus,
        ] as const,
    ),
  );

  it.each(drawnCases)(
    "lays rocks drawn to the ship out fairly at the fastest pace, as a %s",
    (_, formation, torus) => {
      const rocks = [{ kind: "lodestone", size: "large", count: 6 }] as const;
      const wave = { ...parsedFirst(), rocks, formation, pace: 1.4 };

      const unfair = LAYOUT_SEEDS.filter((seed) => {
        const field = fieldFor(wave, startOn(torus, "fast", seed));
        const { off, flown } = nearness(field);
        return off < FAIR_DISTANCE || flown < FAIR_COURSE;
      });

      expect(unfair).toEqual([]);
    },
  );

  // A ring on a field under 31.6 units across is laid nearer the ship than
  // fair, so no course of its rocks lies fairly.
  it("leaves a rock no course keeps clear all but still, rather than slowing it for ever", () => {
    const field = fieldFrom([], { torus: { width: 24, height: 24 } });

    layOut(field, ROCKS, "ring", { x: 12, y: 12 });

    expect(wholeRocks(field).map(speedOf)).toEqual(
      [0, 1, 2, 3].map((): unknown => expect.closeTo(0, 4)),
    );
  });

  // A course drawn at right angles to the way to the ship is all but
  // impossible, so one at right angles was turned.
  it("turns a rock whose course isn't fair at right angles to the way from the ship, to either side", () => {
    const field = laidFast();

    const sides = wholeRocks(field).flatMap((rock) => {
      const awayX = across(20, rock.x, 40);
      const awayY = across(20, rock.y, 40);
      const along = (awayX * rock.vx + awayY * rock.vy) / speedOf(rock);
      return Math.abs(along) < 1e-9
        ? [Math.sign(awayX * rock.vy - awayY * rock.vx)]
        : [];
    });

    expect(new Set(sides)).toEqual(new Set([-1, 1]));
  });

  it.each(FORMATIONS)(
    "lays as many rocks as the field holds as a %s",
    (formation) => {
      const field = fieldFrom([], { torus: NARROWEST, cap: 3 });

      layOut(field, ROCKS, formation, MIDDLE);

      expect(wholeRocks(field)).toHaveLength(3);
    },
  );
});

describe("liesFairly", () => {
  it.each([
    ["a still rock as far off as fair", FAIR_DISTANCE, true],
    ["a still rock any nearer", FAIR_DISTANCE - 0.01, false],
  ])("finds %s", (_, off, fair) => {
    const field = emptyField();
    const rock = placeRock(field, "small", MIDDLE.x + off, MIDDLE.y);

    expect(liesFairly(field, rock, MIDDLE)).toBe(fair);
  });

  it("measures how far off a rock is across the wrap", () => {
    const field = emptyField();
    const rock = placeRock(field, "small", 39, 20);

    expect(liesFairly(field, rock, { x: 2, y: 20 })).toBe(false);
  });

  it.each([
    ["clear of it by its time's end", FAIR_COURSE + 0.01, true],
    ["any nearer within its time", FAIR_COURSE - 0.01, false],
  ])("finds a rock flying straight at the ship %s", (_, by, fair) => {
    const field = emptyField();
    const rock = placeRock(field, "small", MIDDLE.x + 15, MIDDLE.y);
    rock.vx = -(15 - by) / (FAIR_COURSE_MS / 1000);

    expect(liesFairly(field, rock, MIDDLE)).toBe(fair);
  });

  it("flies a rock's course at the field's pace", () => {
    const field = emptyField(2);
    const rock = placeRock(field, "small", MIDDLE.x + 15, MIDDLE.y);
    rock.vx = -(15 - FAIR_COURSE - 1) / (FAIR_COURSE_MS / 1000);

    expect(liesFairly(field, rock, MIDDLE)).toBe(false);
  });

  it("follows a rock's course across the wrap, though it starts flying away", () => {
    const field = emptyField();
    const rock = placeRock(field, "small", 20, 38);
    rock.vy = 18 / (FAIR_COURSE_MS / 1000);

    expect(liesFairly(field, rock, MIDDLE)).toBe(false);
  });

  it.each([
    ["fair at a pace its pull can't bring it near the ship at", 1, true],
    ["unfair at one it can", 1.4 * SPEED_INFO.fast.motion, false],
  ])("finds a still lodestone as far off as fair %s", (_, pace, fair) => {
    const field = emptyField(pace);
    const rock = placeRock(
      field,
      "large",
      MIDDLE.x + FAIR_DISTANCE,
      MIDDLE.y,
      "lodestone",
    );

    expect(liesFairly(field, rock, MIDDLE)).toBe(fair);
  });

  it("leaves the rock it judges as it lies", () => {
    const field = emptyField();
    const rock = placeRock(field, "large", 35, 20, "lodestone");
    rock.vx = -3;
    const before = { ...rock };

    liesFairly(field, rock, MIDDLE);

    expect(rock).toEqual(before);
  });
});

describe("safestPlace", () => {
  it("is the middle of a field with no rocks", () => {
    expect(safestPlace(emptyField())).toEqual(MIDDLE);
  });

  it("is the middle while no rock is nearer it than safe", () => {
    const field = emptyField();
    placeRock(field, "large", MIDDLE.x + SAFE_MIDDLE, MIDDLE.y);

    expect(safestPlace(field)).toEqual(MIDDLE);
  });

  it("leaves the middle for a rock any nearer it now, though it flies away", () => {
    const field = emptyField();
    placeRock(field, "large", MIDDLE.x + SAFE_MIDDLE - 0.01, MIDDLE.y).vx = 5;

    expect(safestPlace(field)).not.toEqual(MIDDLE);
  });

  it("is the place of a grid five across and down farthest from the rock, the first of those as far", () => {
    const field = emptyField();
    placeRock(field, "large", MIDDLE.x, MIDDLE.y);

    expect(safestPlace(field)).toEqual({ x: 4, y: 4 });
  });

  it("judges the grid by where the rocks will be a second ahead", () => {
    const field = emptyField();
    placeRock(field, "large", 20, 20).vx = -8;

    expect(safestPlace(field)).toEqual({ x: 28, y: 4 });
  });
});
