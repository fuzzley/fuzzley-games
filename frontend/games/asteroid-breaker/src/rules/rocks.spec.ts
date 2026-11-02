import { RADIANS_PER_DEGREE, TURN } from "./angles";
import type { PickupId } from "./catalog/pickups";
import {
  ROCK_KINDS,
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
} from "./catalog/rocks";
import { createPickups } from "./drops";
import { type FieldEvent, type FieldEventKind, FieldEventLog } from "./events";
import { createCrew } from "./pilots";
import {
  ROCK_OUTLINES,
  type Rock,
  type RockField,
  addRock,
  createRocks,
  hitRock,
  rockHitRadius,
  rocksLeft,
  setOffBlasts,
  stepRocks,
  tuneRockSpeed,
} from "./rocks";
import { stepsIn } from "./stepper";
import type { Place, Torus } from "./torus";
import {
  CHAIN_MS,
  PIECE_PUSH,
  PIECE_TURN,
  ROCK_RADIUS,
  ROCK_SPEED,
  ROCK_SPIN,
  STEP_S,
  type Span,
} from "./tuning";

// Every speed, span and setting here is `tuning.ts`'s or the catalog's, as
// the ship's and the shots' specs take theirs.

const FIELD: Torus = { width: 72, height: 40 };

/** Enough seeds that what a rock draws spans its spans. */
const SEEDS = Array.from({ length: 100 }, (_, n) => n + 1);

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/** The volatile rock's blast. */
const BLAST = ROCK_KINDS.volatile.traits[0];

/** The lodestone's pull toward the ship. */
const PULL = ROCK_KINDS.lodestone.traits[0].pull;

/** Describes a field of rocks that a spec steps and moves the ship on by hand. */
interface SpecField extends RockField {
  steps: number;
  ship: Place | null;
  pace: number;
  rockSpeed: number;
}

/** Describes the field a spec starts from. */
interface FieldOptions {
  readonly cap?: number;
  readonly seed?: number;
  readonly waveKind?: RockKindId;
  readonly ship?: Place | null;
  /** The pickups its rocks may let go, none by default. */
  readonly pool?: readonly PickupId[];
  readonly rockSpeed?: number;
}

/** Returns a field of free rock slots, no step taken, no chance of a pickup and, unless given one, no ship. */
function fieldOf({
  cap = 8,
  seed = 1,
  waveKind = "stone",
  ship = null,
  pool = [],
  rockSpeed = 1,
}: FieldOptions = {}): SpecField {
  return {
    setup: { drops: 0, pool, pickupsAtOnce: 2 },
    torus: FIELD,
    rocks: createRocks(cap),
    waveKind,
    ship,
    pace: 1,
    rockSpeed,
    steps: 0,
    seed,
    draws: 0,
    pickups: createPickups(),
    lastDropAt: 0,
    score: 0,
    chain: 0,
    lastBreakAt: 0,
    chainPoints: 0,
    crew: createCrew(),
    shipsLost: 0,
    events: new FieldEventLog(),
  };
}

/** Lays a rock on a field, failing the spec if no slot is free. */
function lay(
  field: SpecField,
  kind: RockKindId,
  size: RockSize,
  x = 36,
  y = 20,
  heading = 0,
): Rock {
  const rock = addRock(field, kind, size, x, y, heading);
  if (rock === null) throw new Error("No slot was free for the rock.");
  return rock;
}

/** Returns the whole rocks on a field, in their slots' order. */
function wholeOf(field: SpecField): Rock[] {
  return field.rocks.filter((rock) => rock.live);
}

/** Returns a field's events, oldest first, each a copy. */
function eventsOf(field: SpecField): FieldEvent[] {
  const events: FieldEvent[] = [];
  field.events.forEachSince(0, (event) => events.push({ ...event }));
  return events;
}

/** Returns the kinds of a field's events, oldest first. */
function logged(field: SpecField): FieldEventKind[] {
  return eventsOf(field).map((event) => event.kind);
}

/** Steps a field at a pace as the field does its rocks: the step counted, blasts due set off, then the rocks flown. */
function stepFor(field: SpecField, steps: number, pace = 1): void {
  field.pace = pace;
  for (let step = 0; step < steps; step++) {
    field.steps += 1;
    setOffBlasts(field);
    stepRocks(field);
  }
}

/** Returns the steps, counted from now, that a field's blasts go off in, over a number of steps. */
function blastSteps(field: SpecField, steps: number): number[] {
  const at: number[] = [];
  for (let step = 1; step <= steps; step++) {
    const before = logged(field).length;
    stepFor(field, 1);
    if (logged(field).slice(before).includes("blast")) at.push(step);
  }
  return at;
}

/** Returns how fast a rock flies at a pace of 1. */
function speedOf(rock: Readonly<Rock>): number {
  return Math.hypot(rock.vx, rock.vy);
}

/** Returns how far a rock's travel turns off a heading, in degrees, from −180 to 180. */
function degreesOff(heading: number, rock: Readonly<Rock>): number {
  const off = Math.atan2(rock.vy, rock.vx) - heading;
  return Math.atan2(Math.sin(off), Math.cos(off)) / RADIANS_PER_DEGREE;
}

/** Returns the numbers of a list that fall outside a span, times a factor. */
function outside(values: readonly number[], span: Span, times = 1): number[] {
  return values.filter(
    (value) => value < span.least * times || value > span.most * times,
  );
}

/** Returns how much of a span a list's numbers cover, from the least of them to the most. */
function coverOf(values: readonly number[], span: Span, times = 1): number {
  const covered = Math.max(...values) - Math.min(...values);
  return covered / ((span.most - span.least) * times);
}

/** Returns the pieces a large stone flying a heading of 1 breaks into, hit with no push, on a field from a seed. */
function piecesFrom(seed: number): Rock[] {
  const field = fieldOf({ seed });
  hitRock(field, lay(field, "stone", "large", 36, 20, 1), 0, 0);
  return wholeOf(field);
}

/** Returns the velocities of the pieces a large ice rock breaks into, hit along a way. */
function iceSplitAlong(alongX: number, alongY: number): number[][] {
  const field = fieldOf({ seed: 3 });
  hitRock(field, lay(field, "ice", "large"), alongX, alongY);
  return wholeOf(field).map((piece) => [piece.vx, piece.vy]);
}

/** Returns a field with a large stone beside a large volatile rock, nothing moving while a spec steps it at a pace of 0. */
function stoneBesideVolatile(): {
  field: SpecField;
  volatile: Rock;
  stone: Rock;
} {
  const field = fieldOf({ seed: 5 });
  const volatile = lay(field, "volatile", "large", 20, 20);
  const stone = lay(field, "stone", "large", 23, 24);
  return { field, volatile, stone };
}

/**
 * Returns a field with two large volatile rocks, broken in the same step,
 * and a large stone between them, whose pieces only the nearer one's blast
 * would reach, laid in an order.
 */
function blastsAround(order: "nearer first" | "farther first"): SpecField {
  const field = fieldOf();
  const nearer = { x: 20, y: 20 };
  const farther = { x: 35, y: 20 };
  const [first, second] =
    order === "nearer first" ? [nearer, farther] : [farther, nearer];
  const volatiles = [first, second].map((at) =>
    lay(field, "volatile", "large", at.x, at.y),
  );
  lay(field, "stone", "large", 27, 20);
  for (const volatile of volatiles) hitRock(field, volatile, 1, 0);
  return field;
}

/**
 * Returns a field at its cap with two large volatile rocks, broken in the
 * same step, each with a large rock in its reach alone, laid in an order:
 * an ice rock by one and a stone by the other.
 */
function blastsAtTheCap(order: "ice's first" | "stone's first"): SpecField {
  const field = fieldOf({ cap: 4 });
  const byIce = { x: 10, y: 20 };
  const byStone = { x: 40, y: 20 };
  const [first, second] =
    order === "ice's first" ? [byIce, byStone] : [byStone, byIce];
  const volatiles = [first, second].map((at) =>
    lay(field, "volatile", "large", at.x, at.y),
  );
  lay(field, "ice", "large", byIce.x + 4, byIce.y);
  lay(field, "stone", "large", byStone.x + 4, byStone.y);
  for (const volatile of volatiles) hitRock(field, volatile, 1, 0);
  return field;
}

/** Returns where a drawn rock is and how it flies after a second of its own time at a pace. */
function driftedAt(pace: number): number[] {
  const field = fieldOf({ ship: { x: 40, y: 30 } });
  const rock = lay(field, "lodestone", "large", 20, 20, 2);
  stepFor(field, 120 / pace, pace);
  return [rock.x, rock.y, rock.vx, rock.vy];
}

/** Returns the velocities of a field's whole stones. */
function stonesFlying(field: SpecField): number[][] {
  return wholeOf(field)
    .filter((rock) => rock.kind === "stone")
    .map((rock) => [rock.vx, rock.vy]);
}

describe("createRocks", () => {
  it("numbers each slot by its place", () => {
    expect(createRocks(3).map((rock) => rock.slot)).toEqual([0, 1, 2]);
  });

  it("makes a free slot for each rock the cap holds", () => {
    const rocks = createRocks(5);

    expect(rocks.map((rock) => rock.live)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("rocksLeft", () => {
  it("counts the rocks a field holds, one waiting to go off among them", () => {
    const field = fieldOf();
    lay(field, "stone", "large");
    hitRock(field, lay(field, "volatile", "large", 60, 20), 1, 0);

    const left = rocksLeft(field);

    expect(left).toBe(2);
  });

  it("counts none once the last has gone off", () => {
    const field = fieldOf();
    hitRock(field, lay(field, "volatile", "large"), 1, 0);
    stepFor(field, stepsIn(BLAST.delayMs));

    const left = rocksLeft(field);

    expect(left).toBe(0);
  });
});

describe("rockHitRadius", () => {
  it.each(ROCK_SIZES)(
    "hits a %s rock within the radius it is drawn at, so a graze misses",
    (size) => {
      expect(rockHitRadius(size)).toBeLessThan(ROCK_RADIUS[size]);
    },
  );
});

describe("addRock", () => {
  it("lays a whole rock of a kind and size at a place, as a step ago, in the field's step", () => {
    const field = fieldOf();
    field.steps = 5;

    const rock = lay(field, "iron", "medium", 10, 30);

    expect(rock).toMatchObject({
      live: true,
      kind: "iron",
      size: "medium",
      x: 10,
      y: 30,
      lastX: 10,
      lastY: 30,
      hits: ROCK_KINDS.iron.hits.medium,
      laidAt: 5,
      goesOffAt: 0,
    });
  });

  it("flies a rock along its heading", () => {
    const field = fieldOf();

    const rock = lay(field, "stone", "large", 36, 20, 2);

    expect(Math.atan2(rock.vy, rock.vx)).toBeCloseTo(2);
  });

  it("flies a rock at its size's speed, times its kind's", () => {
    const speeds = SEEDS.map((seed) =>
      speedOf(lay(fieldOf({ seed }), "ice", "large")),
    );

    expect(outside(speeds, ROCK_SPEED.large, ROCK_KINDS.ice.speed)).toEqual([]);
  });

  it("flies a rock at the field's rocks' speed too, as the debug menu tunes it", () => {
    const speeds = SEEDS.map((seed) =>
      speedOf(lay(fieldOf({ seed, rockSpeed: 1.5 }), "ice", "large")),
    );

    expect(
      outside(speeds, ROCK_SPEED.large, ROCK_KINDS.ice.speed * 1.5),
    ).toEqual([]);
  });

  it("draws a rock's speed from across its size's", () => {
    const speeds = SEEDS.map((seed) =>
      speedOf(lay(fieldOf({ seed }), "stone", "medium")),
    );

    expect(coverOf(speeds, ROCK_SPEED.medium)).toBeGreaterThan(0.9);
  });

  it("draws each of its kind and size's outlines", () => {
    const outlines = SEEDS.map(
      (seed) => lay(fieldOf({ seed }), "stone", "small").outline,
    );

    expect([...new Set(outlines)].sort()).toEqual(
      Array.from({ length: ROCK_OUTLINES }, (_, outline) => outline),
    );
  });

  it("turns a rock to a place within a turn", () => {
    const angles = SEEDS.map(
      (seed) => lay(fieldOf({ seed }), "stone", "small").angle,
    );

    expect(outside(angles, { least: 0, most: TURN })).toEqual([]);
    expect(coverOf(angles, { least: 0, most: TURN })).toBeGreaterThan(0.9);
  });

  it("spins a rock either way, at a speed from its span", () => {
    const spins = SEEDS.map(
      (seed) => lay(fieldOf({ seed }), "stone", "small").spin,
    );

    expect(outside(spins.map(Math.abs), ROCK_SPIN, RADIANS_PER_DEGREE)).toEqual(
      [],
    );
    expect(new Set(spins.map(Math.sign))).toEqual(new Set([-1, 1]));
  });

  it("lays a rock in the first free slot", () => {
    const field = fieldOf();
    hitRock(field, lay(field, "stone", "small"), 0, 0);

    const rock = lay(field, "stone", "large");

    expect(field.rocks.indexOf(rock)).toBe(0);
  });

  it("lays nothing once every slot is taken", () => {
    const field = fieldOf({ cap: 1 });
    lay(field, "stone", "large");

    expect(addRock(field, "stone", "large", 36, 20, 0)).toBeNull();
  });

  it("lays the same rock from the same seed and draws", () => {
    const rocks = [fieldOf({ seed: 7 }), fieldOf({ seed: 7 })].map((field) =>
      lay(field, "ice", "medium", 5, 6, 1),
    );

    expect(rocks[0]).toEqual(rocks[1]);
  });

  it("throws for a size the rock's kind doesn't come in", () => {
    const field = fieldOf();

    expect(() => addRock(field, "crystal", "small", 36, 20, 0)).toThrow(
      RangeError,
    );
  });
});

describe("tuneRockSpeed", () => {
  it("speeds the rocks in flight to a new speed at once", () => {
    const field = fieldOf();
    const rock = lay(field, "stone", "large", 36, 20, Math.PI / 3);
    const { vx, vy } = rock;

    tuneRockSpeed(field, 2);

    expect({ vx: rock.vx, vy: rock.vy, rockSpeed: field.rockSpeed }).toEqual({
      vx: vx * 2,
      vy: vy * 2,
      rockSpeed: 2,
    });
  });

  it("speeds them by the change from the speed in use", () => {
    const field = fieldOf({ rockSpeed: 2 });
    const rock = lay(field, "stone", "large");
    const { vx } = rock;

    tuneRockSpeed(field, 1);

    expect(rock.vx).toBeCloseTo(vx / 2);
  });
});

describe("hitRock", () => {
  it("takes a hit off a rock, which holds and flashes", () => {
    const field = fieldOf();
    const rock = lay(field, "lodestone", "large");

    const broke = hitRock(field, rock, 1, 0);

    expect([broke, rock.live, rock.hits, logged(field)]).toEqual([
      false,
      true,
      ROCK_KINDS.lodestone.hits.large - 1,
      ["hit"],
    ]);
  });

  it("breaks a rock with its last hit", () => {
    const field = fieldOf();
    const rock = lay(field, "stone", "small");

    const broke = hitRock(field, rock, 1, 0);

    expect([broke, rock.live, logged(field)]).toEqual([
      true,
      false,
      ["broken", "scored"],
    ]);
  });

  it("breaks a rock with hits to spare by a blow that breaks", () => {
    const field = fieldOf();
    const rock = lay(field, "iron", "small");
    rock.hits = 3;

    expect(hitRock(field, rock, 1, 0, "breaks")).toBe(true);
  });

  it("breaks a rock with hits to spare by a blow that smashes", () => {
    const field = fieldOf();
    const rock = lay(field, "iron", "small");
    rock.hits = 3;

    expect(hitRock(field, rock, 1, 0, "smashes")).toBe(true);
  });

  it("takes nothing from a rock that isn't whole", () => {
    const field = fieldOf();
    const rock = lay(field, "stone", "small");
    hitRock(field, rock, 1, 0);

    const broke = hitRock(field, rock, 1, 0);

    expect([broke, logged(field)]).toEqual([false, ["broken", "scored"]]);
  });

  it("logs a hit at the rock's place, with its kind and size", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "iron", "large", 10, 30), 1, 0);

    expect(eventsOf(field)[0]).toMatchObject({
      kind: "hit",
      x: 10,
      y: 30,
      rock: "iron",
      size: "large",
    });
  });

  it("logs a hit with the slot of the rock that holds it, where it flashes", () => {
    const field = fieldOf();
    lay(field, "stone", "large", 30, 30);
    const rock = lay(field, "lodestone", "large", 10, 30);

    hitRock(field, rock, 1, 0);

    expect(eventsOf(field)[0]).toMatchObject({ kind: "hit", slot: rock.slot });
  });

  it("logs a break with the way the blow came, a share along each axis", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "stone", "small", 10, 30), -3, 4);

    expect(eventsOf(field)[0]).toMatchObject({
      kind: "broken",
      wayX: -0.6,
      wayY: 0.8,
    });
  });

  it("logs each break with the count it is in its chain", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "stone", "small", 10, 30), 1, 0);
    hitRock(field, lay(field, "stone", "small", 20, 30), 1, 0);

    expect(
      eventsOf(field)
        .filter((event) => event.kind === "broken")
        .map((event) => event.chain),
    ).toEqual([1, 2]);
  });

  it("logs a break past the chain's time as the first of a new one", () => {
    const field = fieldOf();
    hitRock(field, lay(field, "stone", "small", 10, 30), 1, 0);
    field.steps += stepsIn(CHAIN_MS) + 1;

    hitRock(field, lay(field, "stone", "small", 20, 30), 1, 0);

    expect(
      eventsOf(field)
        .filter((event) => event.kind === "broken")
        .at(-1),
    ).toMatchObject({ chain: 1 });
  });

  it("logs a smashed rock's break as counting in no chain", () => {
    const field = fieldOf();
    hitRock(field, lay(field, "stone", "small", 10, 30), 1, 0);

    hitRock(field, lay(field, "stone", "small", 20, 30), 1, 0, "smashes");

    expect(eventsOf(field).at(-1)).toMatchObject({ kind: "broken", chain: 0 });
  });

  it("logs a break at the rock's place, with its kind and size", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "ice", "small", 10, 30), 1, 0);

    expect(eventsOf(field)[0]).toMatchObject({
      kind: "broken",
      x: 10,
      y: 30,
      rock: "ice",
      size: "small",
    });
  });
});

describe("a broken rock's split", () => {
  it.each<[RockKindId, RockSize, RockKindId, RockSize, number]>([
    ["stone", "large", "stone", "medium", 2],
    ["crystal", "large", "stone", "medium", 2],
    ["ice", "medium", "ice", "small", 3],
    ["iron", "medium", "iron", "small", 2],
    ["lodestone", "large", "lodestone", "medium", 2],
    ["boulder", "boulder", "ice", "large", 3],
  ])(
    "breaks a %s %s rock into %s %s pieces",
    (kind, size, pieceKind, pieceSize, count) => {
      const field = fieldOf({ waveKind: "ice" });

      hitRock(field, lay(field, kind, size), 1, 0, "breaks");

      expect(wholeOf(field).map((piece) => [piece.kind, piece.size])).toEqual(
        Array.from({ length: count }, () => [pieceKind, pieceSize]),
      );
    },
  );

  it.each(["stone", "ice", "iron", "lodestone"] as const)(
    "breaks a small %s rock into nothing",
    (kind) => {
      const field = fieldOf();

      hitRock(field, lay(field, kind, "small"), 1, 0, "breaks");

      expect(wholeOf(field)).toEqual([]);
    },
  );

  it("breaks a large rock that splits into nothing into nothing", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "volatile", "large"), 1, 0);

    expect(wholeOf(field)).toEqual([]);
  });

  it("sends the pieces from where the rock broke", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "ice", "large", 10, 30), 1, 0);

    expect(wholeOf(field).map((piece) => [piece.x, piece.y])).toEqual([
      [10, 30],
      [10, 30],
      [10, 30],
    ]);
  });

  it("turns each piece off the rock's travel by its span", () => {
    const offs = SEEDS.flatMap((seed) =>
      piecesFrom(seed).map((piece) => Math.abs(degreesOff(1, piece))),
    );

    expect(outside(offs, PIECE_TURN)).toEqual([]);
    expect(coverOf(offs, PIECE_TURN)).toBeGreaterThan(0.9);
  });

  it("turns two pieces to either side of the rock's travel", () => {
    const sides = SEEDS.map((seed) =>
      piecesFrom(seed).map((piece) => Math.sign(degreesOff(1, piece))),
    );

    expect(sides.filter(([first, second]) => first === second)).toEqual([]);
  });

  it("turns the first piece to either side, by the draw", () => {
    const firsts = SEEDS.map(
      (seed) =>
        piecesFrom(seed).map((piece) => Math.sign(degreesOff(1, piece)))[0],
    );

    expect(new Set(firsts)).toEqual(new Set([-1, 1]));
  });

  it("turns three pieces to one side, the other, then the first", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "ice", "large", 36, 20, 1), 0, 0);

    const sides = wholeOf(field).map((piece) =>
      Math.sign(degreesOff(1, piece)),
    );
    expect(sides).toEqual([sides[0], -(sides[0] ?? 0), sides[0]]);
  });

  it("flies the pieces at their size's speed, times their kind's", () => {
    const speeds = SEEDS.flatMap((seed) => {
      const field = fieldOf({ seed });
      hitRock(field, lay(field, "ice", "large"), 0, 0);
      return wholeOf(field).map(speedOf);
    });

    expect(outside(speeds, ROCK_SPEED.medium, ROCK_KINDS.ice.speed)).toEqual(
      [],
    );
  });

  it.each([
    [3, 4],
    [30, 40],
  ])(
    "pushes the pieces along a hit that came along %d, %d",
    (alongX, alongY) => {
      const still = iceSplitAlong(0, 0);

      const pushed = iceSplitAlong(alongX, alongY);

      expect(pushed).toEqual(
        still.map(([vx = 0, vy = 0]): unknown[] => [
          expect.closeTo(vx + 0.6 * PIECE_PUSH),
          expect.closeTo(vy + 0.8 * PIECE_PUSH),
        ]),
      );
    },
  );

  it("splits a rock at the cap into one piece, in its own slot", () => {
    const field = fieldOf({ cap: 3 });
    const rock = lay(field, "stone", "large");
    lay(field, "iron", "large");
    lay(field, "iron", "large");

    hitRock(field, rock, 1, 0);

    expect(wholeOf(field).map((piece) => [piece.kind, piece.size])).toEqual([
      ["stone", "medium"],
      ["iron", "large"],
      ["iron", "large"],
    ]);
  });

  it("splits a rock into as many pieces as the free slots hold, its own among them", () => {
    const field = fieldOf({ cap: 3 });
    const rock = lay(field, "ice", "large");
    lay(field, "iron", "large");

    hitRock(field, rock, 1, 0);

    expect(wholeOf(field).map((piece) => [piece.kind, piece.size])).toEqual([
      ["ice", "medium"],
      ["iron", "large"],
      ["ice", "medium"],
    ]);
  });

  it("lays a broken rock's first piece in its own slot, the first free", () => {
    const field = fieldOf();
    const rock = lay(field, "crystal", "large");

    hitRock(field, rock, 1, 0);

    expect([rock.live, rock.kind, rock.size]).toEqual([
      true,
      "stone",
      "medium",
    ]);
  });

  it("splits the same way from the same seed", () => {
    const [first, second] = [fieldOf({ seed: 9 }), fieldOf({ seed: 9 })].map(
      (field) => {
        hitRock(field, lay(field, "ice", "large"), 2, 1);
        return field.rocks;
      },
    );

    expect(first).toEqual(second);
  });
});

describe("stepRocks", () => {
  it("flies each whole rock along its velocity", () => {
    const field = fieldOf();
    const rock = lay(field, "stone", "large", 20, 10, 0.5);
    const { vx, vy } = rock;

    stepFor(field, 120);

    expect([rock.x, rock.y]).toEqual([
      expect.closeTo(20 + vx),
      expect.closeTo(10 + vy),
    ]);
  });

  it("scales a rock's flight and turn by the pace", () => {
    const field = fieldOf();
    const rock = lay(field, "stone", "large", 20, 10, 0.5);
    const { vx, vy, angle, spin } = rock;

    stepFor(field, 120, 0.5);

    expect([rock.x, rock.y, rock.angle]).toEqual([
      expect.closeTo(20 + vx / 2),
      expect.closeTo(10 + vy / 2),
      expect.closeTo((angle + spin / 2 + TURN) % TURN),
    ]);
  });

  it("keeps where a rock was a step ago", () => {
    const field = fieldOf();
    const rock = lay(field, "stone", "large", 20, 10, 0.5);
    stepFor(field, 5);
    const { x, y } = rock;

    stepFor(field, 1);

    expect([rock.lastX, rock.lastY]).toEqual([x, y]);
  });

  it.each([
    ["the right", 71.99, 20, 0, -72, 0],
    ["the left", 0.01, 20, Math.PI, 72, 0],
    ["the bottom", 36, 39.99, Math.PI / 2, 0, -40],
    ["the top", 36, 0.01, -Math.PI / 2, 0, 40],
  ])("wraps a rock across %s edge", (_, x, y, heading, shiftX, shiftY) => {
    const field = fieldOf();
    const rock = lay(field, "stone", "small", x, y, heading);

    stepFor(field, 1);

    expect([rock.x, rock.y]).toEqual([
      expect.closeTo(x + rock.vx * STEP_S + shiftX),
      expect.closeTo(y + rock.vy * STEP_S + shiftY),
    ]);
  });

  it("turns a rock by its spin, kept within a turn", () => {
    const angles = SEEDS.map((seed) => {
      const field = fieldOf({ seed });
      const rock = lay(field, "stone", "large");
      stepFor(field, 600);
      return rock.angle;
    });

    expect(outside(angles, { least: 0, most: TURN })).toEqual([]);
  });

  it("leaves a broken rock waiting to go off where it broke", () => {
    const field = fieldOf();
    const rock = lay(field, "volatile", "large", 20, 10, 0.5);
    hitRock(field, rock, 1, 0);

    stepFor(field, 3);

    expect([rock.x, rock.y]).toEqual([20, 10]);
  });
});

describe("a rock that blasts", () => {
  it("goes off its beat after it breaks", () => {
    const field = fieldOf();
    hitRock(field, lay(field, "volatile", "large"), 1, 0);

    expect(blastSteps(field, 40)).toEqual([stepsIn(BLAST.delayMs)]);
  });

  it("keeps its slot while it waits to go off", () => {
    const field = fieldOf({ cap: 1 });
    hitRock(field, lay(field, "volatile", "large"), 1, 0);
    stepFor(field, stepsIn(BLAST.delayMs) - 1);

    const waiting = addRock(field, "stone", "large", 36, 20, 0);

    expect(waiting).toBeNull();
  });

  it("frees its slot as it goes off", () => {
    const field = fieldOf({ cap: 1 });
    hitRock(field, lay(field, "volatile", "large"), 1, 0);
    stepFor(field, stepsIn(BLAST.delayMs));

    const laid = addRock(field, "stone", "large", 36, 20, 0);

    expect(laid).not.toBeNull();
  });

  it("logs its blast at its place, with its reach", () => {
    const field = fieldOf();
    hitRock(field, lay(field, "volatile", "medium", 10, 30), 1, 0);

    stepFor(field, stepsIn(BLAST.delayMs));

    expect(eventsOf(field).at(-1)).toMatchObject({
      kind: "blast",
      x: 10,
      y: 30,
      rock: "volatile",
      size: "medium",
      reach: BLAST.reach.medium,
    });
  });

  it.each(["large", "medium"] as const)(
    "hits each whole rock its reach from a %s one touches, and no other",
    (size) => {
      const field = fieldOf();
      const touch = BLAST.reach[size] + rockHitRadius("large");
      const volatile = lay(field, "volatile", size, 20, 20);
      const near = lay(field, "lodestone", "large", 20 + touch - SLIVER, 20);
      const far = lay(field, "lodestone", "large", 20, 20 + touch + SLIVER);
      hitRock(field, volatile, 1, 0);

      stepFor(field, stepsIn(BLAST.delayMs), 0);

      expect([near.hits, far.hits]).toEqual([
        ROCK_KINDS.lodestone.hits.large - 1,
        ROCK_KINDS.lodestone.hits.large,
      ]);
    },
  );

  it("reaches across the wrap", () => {
    const field = fieldOf();
    const volatile = lay(field, "volatile", "large", 1, 20);
    const across = lay(field, "lodestone", "large", 71, 20);
    hitRock(field, volatile, 1, 0);

    stepFor(field, stepsIn(BLAST.delayMs), 0);

    expect(across.hits).toBe(ROCK_KINDS.lodestone.hits.large - 1);
  });

  it("reaches the pieces a hit laid the step before it goes off", () => {
    const field = fieldOf();
    const volatile = lay(field, "volatile", "large", 20, 20);
    const stone = lay(field, "stone", "large", 22, 20);
    hitRock(field, volatile, 1, 0);
    stepFor(field, stepsIn(BLAST.delayMs) - 1, 0);
    hitRock(field, stone, 1, 0);

    stepFor(field, 1, 0);

    expect(wholeOf(field).map((piece) => piece.size)).toEqual([
      "small",
      "small",
      "small",
      "small",
    ]);
  });

  it("hits the rocks it reaches, not the pieces it breaks them into", () => {
    const field = fieldOf();
    const volatile = lay(field, "volatile", "large", 20, 20);
    lay(field, "stone", "large", 22, 20);
    hitRock(field, volatile, 1, 0);

    stepFor(field, stepsIn(BLAST.delayMs), 0);

    expect(wholeOf(field).map((piece) => piece.size)).toEqual([
      "medium",
      "medium",
    ]);
  });

  it("pushes what it breaks away from it, as a hit from its side would", () => {
    const struck = stoneBesideVolatile();
    hitRock(struck.field, struck.stone, 3, 4);
    const blasted = stoneBesideVolatile();
    hitRock(blasted.field, blasted.volatile, 1, 0);

    stepFor(blasted.field, stepsIn(BLAST.delayMs), 0);

    expect(stonesFlying(blasted.field)).toEqual(stonesFlying(struck.field));
  });

  it("sets off another, which goes off a beat later", () => {
    const field = fieldOf();
    const first = lay(field, "volatile", "large", 20, 20);
    lay(field, "volatile", "large", 24, 20);
    hitRock(field, first, 1, 0);
    const beat = stepsIn(BLAST.delayMs);

    const steps = blastSteps(field, 3 * beat);

    expect(steps).toEqual([beat, 2 * beat]);
  });

  it("hits only what its own reach touches, whatever a blast before it reached", () => {
    const field = fieldOf();
    const first = lay(field, "volatile", "large", 20, 20);
    lay(field, "volatile", "large", 27, 20);
    lay(field, "lodestone", "large", 14, 20);
    hitRock(field, first, 1, 0);

    stepFor(field, 2 * stepsIn(BLAST.delayMs), 0);

    expect(
      wholeOf(field).map((rock) => [rock.kind, rock.size, rock.hits]),
    ).toEqual([["lodestone", "large", ROCK_KINDS.lodestone.hits.large - 1]]);
  });

  it("holds its slot through its blast, so what it breaks at the cap splits into fewer", () => {
    const field = fieldOf({ cap: 2 });
    const volatile = lay(field, "volatile", "large", 20, 20);
    lay(field, "stone", "large", 22, 20);
    hitRock(field, volatile, 1, 0);

    stepFor(field, stepsIn(BLAST.delayMs), 0);

    expect(wholeOf(field).map((piece) => piece.size)).toEqual(["medium"]);
  });

  it.each(["nearer first", "farther first"] as const)(
    "hits the same rocks from blasts in one step, laid %s",
    (order) => {
      const field = blastsAround(order);

      stepFor(field, stepsIn(BLAST.delayMs), 0);

      expect(wholeOf(field).map((piece) => piece.size)).toEqual([
        "medium",
        "medium",
      ]);
    },
  );
});

describe("blasts going off together", () => {
  it.each(["ice's first", "stone's first"] as const)(
    "hold their slots through each other's, laid %s",
    (order) => {
      const field = blastsAtTheCap(order);

      stepFor(field, stepsIn(BLAST.delayMs), 0);

      expect(
        wholeOf(field)
          .map((piece) => `${piece.kind} ${piece.size}`)
          .sort(),
      ).toEqual(["ice medium", "stone medium"]);
    },
  );
});

describe("a rock that is drawn", () => {
  it("speeds toward the ship by its pull each second", () => {
    const field = fieldOf({ ship: { x: 40, y: 20 } });
    const rock = lay(field, "lodestone", "large", 20, 20, Math.PI);
    const { vx } = rock;

    stepFor(field, 120);

    expect([rock.vx, rock.vy]).toEqual([
      expect.closeTo(vx + PULL),
      expect.closeTo(0),
    ]);
  });

  it.each([
    ["x", { x: 2, y: 20 }, Math.PI / 2, { x: 70, y: 20 }, [-1, 0]],
    ["y", { x: 36, y: 2 }, 0, { x: 36, y: 38 }, [0, -1]],
  ])(
    "speeds toward the ship the shortest way along %s, across the wrap",
    (_, from, heading, ship, [wayX = 0, wayY = 0]) => {
      const field = fieldOf({ ship });
      const rock = lay(field, "lodestone", "large", from.x, from.y, heading);
      const { vx, vy } = rock;

      stepFor(field, 1);

      expect([rock.vx - vx, rock.vy - vy]).toEqual([
        expect.closeTo(wayX * PULL * STEP_S),
        expect.closeTo(wayY * PULL * STEP_S),
      ]);
    },
  );

  it("turns toward the ship at its size's most speed, times its kind's, and no faster", () => {
    const top = ROCK_SPEED.large.most * ROCK_KINDS.lodestone.speed;
    const field = fieldOf({ ship: { x: 36, y: 20 } });
    const rock = lay(field, "lodestone", "large", 0, 20, Math.PI / 2);
    rock.vx = 0;
    rock.vy = top;
    const speeds: number[] = [];

    for (let step = 0; step < 600; step++) {
      stepFor(field, 1);
      speeds.push(speedOf(rock));
    }

    expect([Math.min(...speeds), Math.max(...speeds), rock.vx > 0]).toEqual([
      expect.closeTo(top, 6),
      expect.closeTo(top, 6),
      true,
    ]);
  });

  it("speeds toward the ship past its most speed, to that at the field's rocks' speed and no faster", () => {
    const most = ROCK_SPEED.large.most * ROCK_KINDS.lodestone.speed;
    const field = fieldOf({ ship: { x: 36, y: 20 }, rockSpeed: 1.25 });
    const rock = lay(field, "lodestone", "large", 0, 20, Math.PI / 2);
    rock.vx = 0;
    rock.vy = most;
    const speeds: number[] = [];

    for (let step = 0; step < 600; step++) {
      stepFor(field, 1);
      speeds.push(speedOf(rock));
    }

    expect(Math.max(...speeds)).toBeCloseTo(most * 1.25, 6);
  });

  it("turns a rock already past its most speed without slowing it", () => {
    const top = ROCK_SPEED.large.most * ROCK_KINDS.lodestone.speed;
    const field = fieldOf({ ship: { x: 36, y: 20 } });
    const rock = lay(field, "lodestone", "large", 0, 20, Math.PI / 2);
    rock.vx = 0;
    rock.vy = top + 1;

    stepFor(field, 1);

    expect([speedOf(rock), rock.vx > 0]).toEqual([
      expect.closeTo(top + 1, 6),
      true,
    ]);
  });

  it("pulls by the field's pace, so its course is the same at any pace", () => {
    const atFull = driftedAt(1);

    const atHalf = driftedAt(0.5);

    expect(atHalf).toEqual(
      atFull.map((value): unknown => expect.closeTo(value, 2)),
    );
  });

  it("keeps its course while there is no ship", () => {
    const field = fieldOf();
    const rock = lay(field, "lodestone", "large", 20, 20, 1);
    const { vx, vy } = rock;

    stepFor(field, 120);

    expect([rock.vx, rock.vy]).toEqual([vx, vy]);
  });

  it("keeps its course on the ship's own place", () => {
    const field = fieldOf({ ship: { x: 20, y: 20 } });
    const rock = lay(field, "lodestone", "large", 20, 20, 1);
    const { vx, vy } = rock;

    stepRocks(field);

    expect([rock.vx, rock.vy]).toEqual([vx, vy]);
  });

  it("leaves a rock that isn't drawn on its course", () => {
    const field = fieldOf({ ship: { x: 40, y: 20 } });
    const rock = lay(field, "stone", "large", 20, 20, 1);
    const { vx, vy } = rock;

    stepFor(field, 120);

    expect([rock.vx, rock.vy]).toEqual([vx, vy]);
  });
});

describe("a rock that rings", () => {
  it("rings as it holds a hit", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "iron", "large"), 1, 0);

    expect(logged(field)).toEqual(["hit", "rung"]);
  });

  it("doesn't ring as it breaks", () => {
    const field = fieldOf();

    hitRock(field, lay(field, "iron", "small"), 1, 0);

    expect(logged(field)).toEqual(["broken", "scored"]);
  });

  it("logs its ring at its place, with its kind, size and slot", () => {
    const field = fieldOf();
    lay(field, "stone", "large", 30, 30);
    const rock = lay(field, "iron", "medium", 10, 30);

    hitRock(field, rock, 1, 0);

    expect(eventsOf(field).at(-1)).toMatchObject({
      kind: "rung",
      x: 10,
      y: 30,
      rock: "iron",
      size: "medium",
      slot: rock.slot,
    });
  });
});

describe("a rock that gives", () => {
  it("lets a pickup go as it breaks, whatever the chance", () => {
    const field = fieldOf({ pool: ["spread"] });

    hitRock(field, lay(field, "crystal", "medium"), 1, 0);

    expect([logged(field), wholeOf(field).length]).toEqual([
      ["broken", "scored", "dropped"],
      ROCK_KINDS.crystal.splits.count,
    ]);
  });

  it("lets none go as a blow that smashes breaks it, its pieces flying as ever", () => {
    const field = fieldOf({ pool: ["spread"] });

    hitRock(field, lay(field, "crystal", "medium"), 1, 0, "smashes");

    expect([logged(field), wholeOf(field).length]).toEqual([
      ["broken"],
      ROCK_KINDS.crystal.splits.count,
    ]);
  });
});
