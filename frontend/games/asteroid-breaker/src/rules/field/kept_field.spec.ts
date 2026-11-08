import { stepTimes } from "../../testing/field_picture";
import {
  type Spoil,
  UNDER_WAY_TORUS as TORUS,
  playedField,
  runUnderWay,
  waveOf,
  waveSetupOf,
} from "../../testing/run_under_way";
import { type RockKindId, rockKind } from "../catalog/rocks";
import { nextStrayAfter } from "../hazards/strays";
import { ROCK_OUTLINES, rocksLeft } from "../rocks/rocks";
import { stepsIn } from "../stepper";
import { type Torus, middleOf } from "../torus";
import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE, STRAY_POINTS } from "../tuning";
import type { Field } from "./field";
import { fillFor, stretchField } from "./fill";
import {
  type SavedField,
  type SavedRock,
  type WaveSoFar,
  fitsItsKind,
  fitsItsRun,
  fitsItsWave,
  hasDroppedInTime,
  hasKeptCounts,
  hasMoved,
  isKeptRock,
  isSoundRock,
  layOutKeptField,
  readField,
  readTorus,
  rockPointsKept,
  savedField,
} from "./kept_field";
import { safestPlace } from "./spawn";

/** The short side's square, which a pause may stretch the specs' field to. */
const SQUARE: Torus = { width: 40, height: 40 };

/** The steps the specs' field is kept at: a second's. */
const STEPS = 120;

/** What the specs' run has scored on its wave: 300 points, and no stray brought home. */
const SO_FAR: WaveSoFar = { points: 300, straysHome: 0 };

/** The strays the specs' wave sends at the size its field is laid out at. */
const WAVE_STRAYS = fillFor(waveOf(runUnderWay()), TORUS).strays;

/**
 * The steps a volatile's blast waits after it breaks: the most a fuse kept
 * may have left.
 */
const BEAT = stepsIn(blastDelayOf("volatile"));

/**
 * A large volatile broken a step before the specs' field was kept, its
 * blast still to go off.
 */
const FUSE_LIT: Partial<SavedRock> = {
  kind: "volatile",
  size: "large",
  hits: 0,
  live: false,
  goesOffAt: STEPS + 5,
};

/**
 * Sizes no board lays a field out at, as storage might hold them, each
 * dropped by `readTorus()`.
 */
const SIZE_SPOILS: readonly Spoil<unknown>[] = [
  ["no size", undefined],
  ["something that isn't a size", 5],
  ["a width that isn't a number", { width: "72", height: 40 }],
  ["a height that isn't a number", { width: 72, height: "40" }],
  [
    "a short side no board lays out",
    { width: 72, height: FIELD_SHORT_SIDE - 1 },
  ],
  [
    "a long side longer than any",
    { width: FIELD_LONGEST_SIDE + 1, height: FIELD_SHORT_SIDE },
  ],
];

/** Counts a field kept may hold that aren't counts, each failing `hasKeptCounts()`. */
const COUNT_SPOILS: readonly Spoil[] = [
  ["steps that aren't a count", { steps: 120.5 }],
  ["draws below nothing", { draws: -1 }],
  ["strays sent that aren't a count", { straysSent: 0.5 }],
  ["a next stray's step that isn't a count", { nextStrayAt: -1 }],
  ["a next comet's step that isn't a count", { nextCometAt: -1 }],
  ["a pickup let go at a step that isn't a count", { lastDropAt: -1 }],
  ["chain points that aren't a count", { chainPoints: -1 }],
  ["rocks' points that aren't a count", { rockPoints: 0.5 }],
  ["ships lost that aren't a count", { shipsLost: -1 }],
];

/** Steps a field kept may hold that a field kept never has, each failing `hasMoved()`. */
const MOVE_SPOILS: readonly Spoil<Partial<SavedField>>[] = [
  ["no steps, as one not yet moved", { steps: 0, lastDropAt: 0 }],
];

/**
 * Steps a pickup was let go at that a field kept hasn't come to, each
 * failing `hasDroppedInTime()`.
 */
const DROP_SPOILS: readonly Spoil<Partial<SavedField>>[] = [
  ["a pickup let go after its last step", { lastDropAt: STEPS + 1 }],
];

/** What a field kept may hold that its wave doesn't, each failing `fitsItsWave()`. */
const WAVE_FIT_SPOILS: readonly Spoil<Partial<SavedField>>[] = [
  ["no rocks", { rocks: [] }],
  ["more strays sent than its wave sends", { straysSent: WAVE_STRAYS + 1 }],
  [
    "more rocks than its wave holds at the size it was laid out at",
    { rocks: [...fullRocks(), firstRock()] },
  ],
];

/**
 * What a field kept may hold that what its run has scored on its wave
 * doesn't agree with, each failing `fitsItsRun()`.
 */
const RUN_FIT_SPOILS: readonly (readonly [
  string,
  Partial<SavedField>,
  WaveSoFar,
])[] = [
  [
    "a stray brought home that it never sent",
    {},
    { points: 300 + STRAY_POINTS, straysHome: 1 },
  ],
  [
    "fewer points than a stray brought home on it scores",
    { straysSent: 1 },
    { points: 300, straysHome: 1 },
  ],
  [
    "more points from the chain than its wave has",
    { chainPoints: 301 },
    SO_FAR,
  ],
  ["more points from the rocks than its wave has", { rockPoints: 301 }, SO_FAR],
  [
    "fewer points from the rocks than its wave has",
    { rockPoints: 299 },
    SO_FAR,
  ],
  [
    "more points from the rocks and the chain together than its wave has",
    { rockPoints: 200, chainPoints: 101 },
    SO_FAR,
  ],
  [
    "more points from the chain than its wave has, kept before the rocks' were counted",
    { chainPoints: 301, rockPoints: undefined },
    SO_FAR,
  ],
];

/** Values a rock kept may hold that aren't of their keys' kinds, each failing `isKeptRock()`. */
const VALUE_SPOILS: readonly Spoil[] = [
  ["a rock of a kind there is none of", { kind: "glass" }],
  ["a rock of a size there is none of", { size: "huge" }],
  ["a rock of a size named as any object's key", { size: "constructor" }],
  ["a rock off the field", { x: TORUS.width }],
  ["a rock below the field", { y: TORUS.height }],
  ["a rock whose speed isn't a number", { vx: "fast" }],
  ["a rock whose speed down isn't a number", { vy: null }],
  ["a rock whose angle isn't a number", { angle: "up" }],
  ["a rock whose turn isn't a number", { spin: Infinity }],
  ["a rock of an outline that isn't whole", { outline: 1.5 }],
  ["a rock of an outline below the first", { outline: -1 }],
  ["a rock of an outline there is none of", { outline: ROCK_OUTLINES }],
  ["a rock whose hits aren't a count", { hits: "1" }],
  ["a rock neither whole nor broken", { live: "yes" }],
  ["a rock whose blast's step isn't a count", { goesOffAt: -1 }],
  ["a blast whose step isn't a number", { ...FUSE_LIT, goesOffAt: "125" }],
];

/** Rocks kept that their kind doesn't come to, each failing `fitsItsKind()`. */
const KIND_SPOILS: readonly Spoil<Partial<SavedRock>>[] = [
  [
    "a rock of a size its kind doesn't come in",
    { kind: "crystal", size: "small" },
  ],
  ["a rock with more hits than it starts with", { hits: 99 }],
];

/** Rocks kept in a state their kind never comes to, each failing `isSoundRock()`. */
const STATE_SPOILS: readonly Spoil<Partial<SavedRock>>[] = [
  ["a whole rock with no hits left", { hits: 0 }],
  ["a whole rock waiting to go off", { goesOffAt: STEPS + 5 }],
  ["a broken rock with hits left", { ...FUSE_LIT, hits: 1 }],
  [
    "a broken rock of a kind that doesn't blast",
    { ...FUSE_LIT, kind: "stone" },
  ],
  ["a blast due by the field's last step", { ...FUSE_LIT, goesOffAt: STEPS }],
  [
    "a blast due later than its beat",
    { ...FUSE_LIT, goesOffAt: STEPS + BEAT + 1 },
  ],
];

/**
 * Returns how long a kind's blast waits after the rock breaks, failing for
 * a kind that doesn't blast.
 */
function blastDelayOf(kind: RockKindId): number {
  const [delayMs] = rockKind(kind).traits.flatMap((trait) =>
    trait.kind === "blasts" ? [trait.delayMs] : [],
  );
  if (delayMs === undefined) throw new Error(`A ${kind} doesn't blast.`);
  return delayMs;
}

/** Returns a field as storage keeps it, read back as storage would. */
function keptOf(field: Field): SavedField {
  return JSON.parse(JSON.stringify(savedField(field))) as SavedField;
}

/** Returns the specs' run's field, played a second, as storage would read it back. */
function kept(): SavedField {
  return keptOf(playedField(runUnderWay()));
}

/** Lights the fuse of a field's first rock, as though it were a volatile broken a step before. */
function lightFuse(field: Field): void {
  const [rock] = field.rocks;
  if (!rock) throw new Error("No rock laid.");
  Object.assign(rock, FUSE_LIT);
}

/** Returns the first rock of the specs' field as storage would read it back. */
function firstRock(): SavedRock {
  const [rock] = kept().rocks;
  if (!rock) throw new Error("No rock kept.");
  return rock;
}

/**
 * Returns the specs' field kept with some of its values changed, as a
 * browser might come to hold it.
 */
function keptWith(
  change: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return { ...kept(), ...change };
}

/** Returns the specs' field kept with some of its first rock's values changed. */
function rockWith(
  change: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const [first, ...rest] = kept().rocks;
  return keptWith({ rocks: [{ ...first, ...change }, ...rest] });
}

/** Returns as many of the specs' rocks as its wave holds on its field, each the first. */
function fullRocks(): readonly SavedRock[] {
  const rock = firstRock();
  const cap = fillFor(waveOf(runUnderWay()), TORUS).cap;
  return Array.from({ length: cap }, () => ({ ...rock, x: 1, y: 1 }));
}

/**
 * Returns a field kept of the specs' wave laid out afresh, as its run starts
 * it, its run having scored on it as given.
 */
function layOut(saved: SavedField, soFar: WaveSoFar = SO_FAR): Field {
  const run = runUnderWay();
  return layOutKeptField(waveOf(run), waveSetupOf(run), saved, soFar);
}

/** Returns a field storage kept of the specs' wave, read as its run has scored on it. */
function read(value: unknown, soFar: WaveSoFar = SO_FAR): SavedField | null {
  return readField(value, waveOf(runUnderWay()), soFar);
}

describe("savedField", () => {
  it("keeps the field's size, its whole rocks and the counts it runs by", () => {
    const field = playedField(runUnderWay());

    const saved = savedField(field);

    expect(saved).toEqual({
      laidOut: TORUS,
      torus: TORUS,
      rocks: field.rocks
        .filter((rock) => rock.live)
        .map(({ kind, size, x, y, vx, vy, angle, spin, outline, hits }) => ({
          kind,
          size,
          x,
          y,
          vx,
          vy,
          angle,
          spin,
          outline,
          hits,
          live: true,
          goesOffAt: 0,
        })),
      steps: STEPS,
      draws: field.draws,
      straysSent: field.strays.sent,
      nextStrayAt: field.strays.nextAt,
      nextCometAt: field.comets.nextAt,
      lastDropAt: field.lastDropAt,
      chainPoints: field.chainPoints,
      rockPoints: field.rockPoints,
      shipsLost: field.shipsLost,
    });
  });

  it("keeps the size a field was laid out at, and the size a pause stretched it to", () => {
    const field = playedField(runUnderWay());
    stretchField(field, SQUARE);

    const saved = savedField(field);

    expect(saved).toMatchObject({ laidOut: TORUS, torus: SQUARE });
  });

  it("keeps a rock broken and waiting to go off, for its blast", () => {
    const field = playedField(runUnderWay());
    lightFuse(field);

    const saved = savedField(field);

    expect(saved.rocks[0]).toMatchObject(FUSE_LIT);
  });

  it("counts a stray adrift as gone, the next coming as long after as it would", () => {
    const field = playedField(runUnderWay());
    field.strays.adrift.live = true;

    const saved = savedField(field);

    expect(saved.nextStrayAt).toBe(nextStrayAfter(STEPS));
  });
});

describe("readField", () => {
  it("reads a field as it was kept", () => {
    const saved = kept();

    expect(read(saved)).toEqual(saved);
  });

  it("reads a field kept before the rocks' points were counted", () => {
    const value = keptWith({ rockPoints: undefined });

    expect(read(value)).toEqual(value);
  });

  it("reads a field stretched since it was laid out, though it holds more rocks than one laid out at its size", () => {
    const value = keptWith({ torus: SQUARE, rocks: fullRocks() });

    expect(read(value)).not.toBeNull();
  });

  it("reads a field waiting only on a blast to go off", () => {
    const value = keptWith({ rocks: [{ ...firstRock(), ...FUSE_LIT }] });

    expect(read(value)).not.toBeNull();
  });

  it.each<[string, unknown]>([
    ["something that isn't a field", 5],
    ["rocks that aren't a list", keptWith({ rocks: 5 })],
    ["a rock that isn't one", keptWith({ rocks: [5] })],
    [
      "a rock off the field as a pause stretched it",
      keptWith({ torus: SQUARE }),
    ],
  ])("drops %s", (_, value) => {
    expect(read(value)).toBeNull();
  });

  it.each(SIZE_SPOILS)("drops a field of %s", (_, torus) => {
    expect(read(keptWith({ torus }))).toBeNull();
  });

  it.each(SIZE_SPOILS)("drops a field laid out at %s", (_, laidOut) => {
    expect(read(keptWith({ laidOut }))).toBeNull();
  });

  it.each([
    ...COUNT_SPOILS,
    ...MOVE_SPOILS,
    ...DROP_SPOILS,
    ...WAVE_FIT_SPOILS,
  ])("drops a field of %s", (_, change) => {
    expect(read(keptWith(change))).toBeNull();
  });

  it.each(RUN_FIT_SPOILS)("drops a field of %s", (_, change, soFar) => {
    expect(read(keptWith(change), soFar)).toBeNull();
  });

  it.each([...VALUE_SPOILS, ...KIND_SPOILS, ...STATE_SPOILS])(
    "drops a field with %s",
    (_, change) => {
      expect(read(rockWith(change))).toBeNull();
    },
  );
});

describe("readTorus", () => {
  it.each([
    ["on its side", TORUS],
    ["upright", { width: 40, height: 72 }],
    ["square", SQUARE],
    ["as long as any", { width: FIELD_LONGEST_SIDE, height: 40 }],
  ])("reads a size %s", (_, torus) => {
    expect(readTorus({ ...torus })).toEqual(torus);
  });

  it.each(SIZE_SPOILS)("drops %s", (_, value) => {
    expect(readTorus(value)).toBeNull();
  });
});

describe("hasKeptCounts", () => {
  it("holds a field kept to its counts", () => {
    expect(hasKeptCounts(keptWith({}))).toBe(true);
  });

  it("holds a field kept before the rocks' points were counted to the rest", () => {
    expect(hasKeptCounts(keptWith({ rockPoints: undefined }))).toBe(true);
  });

  it.each(COUNT_SPOILS)("fails a field of %s", (_, change) => {
    expect(hasKeptCounts(keptWith(change))).toBe(false);
  });
});

describe("hasMoved", () => {
  it("holds a field kept to having moved", () => {
    expect(hasMoved(kept())).toBe(true);
  });

  it.each(MOVE_SPOILS)("fails a field of %s", (_, change) => {
    expect(hasMoved({ ...kept(), ...change })).toBe(false);
  });
});

describe("hasDroppedInTime", () => {
  it("holds a field kept to a pickup let go at its last step", () => {
    expect(hasDroppedInTime({ ...kept(), lastDropAt: STEPS })).toBe(true);
  });

  it.each(DROP_SPOILS)("fails a field of %s", (_, change) => {
    expect(hasDroppedInTime({ ...kept(), ...change })).toBe(false);
  });
});

describe("fitsItsWave", () => {
  it("fits a field kept to its wave", () => {
    expect(fitsItsWave(kept(), waveOf(runUnderWay()))).toBe(true);
  });

  it("fits a field stretched since to the wave as laid out, though it holds more rocks than one laid out at its size", () => {
    const field = { ...kept(), torus: SQUARE, rocks: fullRocks() };

    expect(fitsItsWave(field, waveOf(runUnderWay()))).toBe(true);
  });

  it("fits a field that has sent every stray its wave sends", () => {
    const field = { ...kept(), straysSent: WAVE_STRAYS };

    expect(fitsItsWave(field, waveOf(runUnderWay()))).toBe(true);
  });

  it.each(WAVE_FIT_SPOILS)("fails a field of %s", (_, change) => {
    const field = { ...kept(), ...change };

    expect(fitsItsWave(field, waveOf(runUnderWay()))).toBe(false);
  });
});

describe("fitsItsRun", () => {
  it("fits a field kept to what its run has scored on its wave", () => {
    expect(fitsItsRun(kept(), SO_FAR)).toBe(true);
  });

  it("fits a stray sent and brought home, its points scored", () => {
    const soFar = { points: 300 + STRAY_POINTS, straysHome: 1 };

    expect(fitsItsRun({ ...kept(), straysSent: 1 }, soFar)).toBe(true);
  });

  it.each([
    ["chain", { chainPoints: 300, rockPoints: 0 }],
    ["rocks", { rockPoints: 300 }],
    [
      "chain, kept before the rocks' were counted,",
      { chainPoints: 300, rockPoints: undefined },
    ],
  ])("fits a field whose %s scored every point on its wave", (_, change) => {
    expect(fitsItsRun({ ...kept(), ...change }, SO_FAR)).toBe(true);
  });

  it.each(RUN_FIT_SPOILS)("fails a field of %s", (_, change, soFar) => {
    expect(fitsItsRun({ ...kept(), ...change }, soFar)).toBe(false);
  });
});

describe("rockPointsKept", () => {
  it("takes the rocks' points a field kept", () => {
    const field = { ...kept(), rockPoints: 40 };

    expect(rockPointsKept(field, SO_FAR)).toBe(40);
  });

  it("works out the rocks' points of a field kept before they were counted from what its run scored beside the chain and the strays", () => {
    const field = { ...kept(), chainPoints: 80, rockPoints: undefined };
    const soFar = { points: 800, straysHome: 1 };

    expect(rockPointsKept(field, soFar)).toBe(800 - 80 - STRAY_POINTS);
  });
});

describe("isKeptRock", () => {
  it("holds a rock kept to its keys' kinds, on its field", () => {
    expect(isKeptRock(firstRock(), TORUS)).toBe(true);
  });

  it("holds a rock broken and waiting to go off to its keys' kinds", () => {
    expect(isKeptRock({ ...firstRock(), ...FUSE_LIT }, TORUS)).toBe(true);
  });

  it("holds a rock of the last outline there is", () => {
    const rock = { ...firstRock(), outline: ROCK_OUTLINES - 1 };

    expect(isKeptRock(rock, TORUS)).toBe(true);
  });

  it("fails something that isn't a rock", () => {
    expect(isKeptRock(5, TORUS)).toBe(false);
  });

  it.each(VALUE_SPOILS)("fails %s", (_, change) => {
    expect(isKeptRock({ ...firstRock(), ...change }, TORUS)).toBe(false);
  });
});

describe("fitsItsKind", () => {
  it("fits a rock kept to its kind", () => {
    expect(fitsItsKind(firstRock())).toBe(true);
  });

  it.each(KIND_SPOILS)("fails %s", (_, change) => {
    expect(fitsItsKind({ ...firstRock(), ...change })).toBe(false);
  });
});

describe("isSoundRock", () => {
  it("holds a whole rock kept with hits left and no blast due", () => {
    expect(isSoundRock(firstRock(), STEPS)).toBe(true);
  });

  it.each([
    ["the step after the field's last", STEPS + 1],
    ["at the end of its beat", STEPS + BEAT],
  ])("holds a broken rock kept with its blast due %s", (_, goesOffAt) => {
    const rock = { ...firstRock(), ...FUSE_LIT, goesOffAt };

    expect(isSoundRock(rock, STEPS)).toBe(true);
  });

  it.each(STATE_SPOILS)("fails %s", (_, change) => {
    expect(isSoundRock({ ...firstRock(), ...change }, STEPS)).toBe(false);
  });
});

describe("layOutKeptField", () => {
  it("lays the field kept out afresh, as it was, every count among it", () => {
    const saved: SavedField = {
      ...kept(),
      draws: 9,
      straysSent: 1,
      nextStrayAt: 600,
      nextCometAt: 900,
      lastDropAt: 60,
      chainPoints: 80,
      rockPoints: 120,
      shipsLost: 1,
    };

    const field = layOut(saved);

    expect(savedField(field)).toEqual(saved);
  });

  it("lays a field stretched since out at the size it was laid out at, its slots, strays and comets as they were", () => {
    const before = playedField(runUnderWay());
    stretchField(before, SQUARE);

    const field = layOut(keptOf(before));

    expect({
      setup: field.setup,
      slots: field.rocks.length,
      torus: field.torus,
    }).toEqual({
      setup: before.setup,
      slots: before.rocks.length,
      torus: SQUARE,
    });
  });

  it("frees every slot but the rocks kept", () => {
    const saved = { ...kept(), rocks: [firstRock()] };

    const field = layOut(saved);

    expect(rocksLeft(field)).toBe(1);
  });

  it("draws each rock where it is, rather than between where it was laid and there", () => {
    const [first] = layOut(kept()).rocks;

    expect({ lastX: first?.lastX, lastY: first?.lastY }).toEqual({
      lastX: first?.x,
      lastY: first?.y,
    });
  });

  it("takes the wave's points and strays brought home from what its run has scored on it", () => {
    const saved = { ...kept(), straysSent: 1 };

    const field = layOut(saved, { points: 800, straysHome: 1 });

    expect({ score: field.score, home: field.strays.broughtHome }).toEqual({
      score: 800,
      home: 1,
    });
  });

  it("works out the rocks' points of a field kept before they were counted", () => {
    const saved = { ...kept(), chainPoints: 80, rockPoints: undefined };

    const field = layOut(saved);

    expect(field.rockPoints).toBe(SO_FAR.points - 80);
  });

  it("sets off a blast whose fuse was lit before the page went away, clearing a wave that waited only on it", () => {
    const saved = { ...kept(), rocks: [{ ...firstRock(), ...FUSE_LIT }] };
    const field = layOut(saved);

    stepTimes(field, 10);

    expect(field.cleared).toBe(true);
  });

  it("sets the ship waiting where it is safest, away from a rock kept over the middle", () => {
    const [, ...rest] = kept().rocks;
    const rocks = [{ ...firstRock(), ...middleOf(TORUS) }, ...rest];

    const field = layOut({ ...kept(), rocks });

    const { ship } = field;
    expect({ x: ship?.x, y: ship?.y, waiting: ship?.waiting }).toEqual({
      ...safestPlace(field),
      waiting: true,
    });
    expect(safestPlace(field)).not.toEqual(middleOf(TORUS));
  });
});
