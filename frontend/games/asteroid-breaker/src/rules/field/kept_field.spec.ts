import { placeSpark, shipOf, stepTimes } from "../../testing/field_picture";
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
import { type Torus, middleOf, wrap } from "../torus";
import {
  FIELD_LONGEST_SIDE,
  FIELD_SHORT_SIDE,
  STATIC_MOST,
  STRAY_HOME_POINTS,
  STRAY_POINTS,
  TOW_HOOK,
  TOW_LINK,
} from "../tuning";
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
  hasSparkedInTime,
  isKeptRock,
  isSoundRock,
  isStatic,
  isStrayPoints,
  layOutKeptField,
  readField,
  readTorus,
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
  ["static's points that aren't a count", { staticPoints: -1 }],
  ["rocks' points that aren't a count", { rockPoints: 0.5 }],
  ["sparks' points that aren't a count", { sparkPoints: 0.5 }],
  ["no sparks' points", { sparkPoints: undefined }],
  ["no rocks' points", { rockPoints: undefined }],
  ["strays' points that aren't a count", { strayPoints: 0.5 }],
  ["no strays' points", { strayPoints: undefined }],
  ["hits that aren't a count", { hits: -1 }],
  ["a spark gathered at a step that isn't a count", { lastSparkAt: 0.5 }],
];

/** Static a field kept may hold that isn't static, each failing `isStatic()`. */
const STATIC_SPOILS: readonly Spoil<unknown>[] = [
  ["no static", undefined],
  ["static that isn't a number", "full"],
  ["static that isn't finite", Infinity],
  ["static below nothing", -1],
  ["static past its most", STATIC_MOST + 1],
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

/**
 * Steps a spark was gathered at that a field kept hasn't come to, each
 * failing `hasSparkedInTime()`.
 */
const SPARK_SPOILS: readonly Spoil<Partial<SavedField>>[] = [
  ["a spark gathered after its last step", { lastSparkAt: STEPS + 1 }],
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
    { strayPoints: STRAY_POINTS },
    { points: 300 + STRAY_POINTS, straysHome: 1 },
  ],
  [
    "no strays' points for a stray brought home on it",
    { straysSent: 1 },
    { points: 300, straysHome: 1 },
  ],
  [
    "strays' points that no stray brought home on it scores",
    { strayPoints: STRAY_POINTS },
    { points: 300 + STRAY_POINTS, straysHome: 0 },
  ],
  [
    "strays' points the strays brought home on it don't add up to",
    { straysSent: 2, strayPoints: STRAY_POINTS + 1 },
    { points: 301 + STRAY_POINTS, straysHome: 2 },
  ],
  [
    "more points from the strays than its wave has",
    { straysSent: 1, strayPoints: STRAY_POINTS },
    { points: 300, straysHome: 1 },
  ],
  ["more points from static than its wave has", { staticPoints: 301 }, SO_FAR],
  ["more points from the rocks than its wave has", { rockPoints: 301 }, SO_FAR],
  [
    "fewer points from the rocks than its wave has",
    { rockPoints: 299 },
    SO_FAR,
  ],
  [
    "more points from the rocks and static together than its wave has",
    { rockPoints: 200, staticPoints: 101 },
    SO_FAR,
  ],
  [
    "more points from the rocks and the sparks together than its wave has",
    { rockPoints: 200, sparkPoints: 101 },
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
      staticPoints: field.staticPoints,
      rockPoints: field.rockPoints,
      sparkPoints: field.sparkPoints,
      strayPoints: field.strayPoints,
      hits: field.hits,
      lastSparkAt: field.charge.lastSparkAt,
      charge: field.charge.level,
      hadMore: field.hadMore,
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

  it.each(STATIC_SPOILS)("drops a field of %s", (_, charge) => {
    expect(read(keptWith({ charge }))).toBeNull();
  });

  it.each([
    ["no word of whether its wave has held more than its last few", undefined],
    ["a word of it that isn't yes or no", "yes"],
  ])("drops a field with %s", (_, hadMore) => {
    expect(read(keptWith({ hadMore }))).toBeNull();
  });

  it.each([
    ...COUNT_SPOILS,
    ...MOVE_SPOILS,
    ...DROP_SPOILS,
    ...SPARK_SPOILS,
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

describe("hasSparkedInTime", () => {
  it("holds a field kept to a spark gathered at its last step", () => {
    expect(hasSparkedInTime({ ...kept(), lastSparkAt: STEPS })).toBe(true);
  });

  it.each(SPARK_SPOILS)("fails a field of %s", (_, change) => {
    expect(hasSparkedInTime({ ...kept(), ...change })).toBe(false);
  });
});

describe("isStatic", () => {
  it.each([
    ["none", 0],
    ["part of a step", 12.5],
    ["full", STATIC_MOST],
  ])("holds static at %s", (_, charge) => {
    expect(isStatic(charge)).toBe(true);
  });

  it.each(STATIC_SPOILS)("fails %s", (_, charge) => {
    expect(isStatic(charge)).toBe(false);
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

  it.each([
    ["into the line in tow", STRAY_POINTS],
    ["straight home", STRAY_HOME_POINTS],
  ])(
    "fits a stray sent and brought home %s, its points scored",
    (_, points) => {
      const field = { ...kept(), straysSent: 1, strayPoints: points };
      const soFar = { points: 300 + points, straysHome: 1 };

      expect(fitsItsRun(field, soFar)).toBe(true);
    },
  );

  it.each([
    ["static", { staticPoints: 300, rockPoints: 0 }],
    ["sparks", { sparkPoints: 300, rockPoints: 0 }],
    ["rocks", { rockPoints: 300 }],
  ])("fits a field whose %s scored every point on its wave", (_, change) => {
    expect(fitsItsRun({ ...kept(), ...change }, SO_FAR)).toBe(true);
  });

  it.each(RUN_FIT_SPOILS)("fails a field of %s", (_, change, soFar) => {
    expect(fitsItsRun({ ...kept(), ...change }, soFar)).toBe(false);
  });
});

describe("isStrayPoints", () => {
  it.each([
    ["no points for no strays", 0, 0],
    ["each stray's into the line in tow", 2 * STRAY_POINTS, 2],
    ["each stray's straight home", 2 * STRAY_HOME_POINTS, 2],
    [
      "some strays' into the line and some straight home",
      STRAY_POINTS + 2 * STRAY_HOME_POINTS,
      3,
    ],
  ])("holds %s", (_, points, strays) => {
    expect(isStrayPoints(points, strays)).toBe(true);
  });

  it.each([
    ["points for no strays", STRAY_POINTS, 0],
    ["fewer points than a stray's", STRAY_POINTS - 1, 1],
    ["more points than the strays' straight home", 3 * STRAY_HOME_POINTS, 2],
  ])("fails %s", (_, points, strays) => {
    expect(isStrayPoints(points, strays)).toBe(false);
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
      staticPoints: 80,
      rockPoints: 100,
      sparkPoints: 20,
      strayPoints: STRAY_POINTS,
      hits: 1,
      lastSparkAt: 100,
      charge: 23.5,
      hadMore: !kept().hadMore,
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

  it("keeps no spark of the field kept, as a saved run keeps none", () => {
    const before = playedField(runUnderWay());
    placeSpark(before, 10, 10);

    const field = layOut(keptOf(before));

    expect(field.sparks.some((spark) => spark.live)).toBe(false);
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

  it("lays the line in tow straight out behind the ship", () => {
    const field = layOut(kept());

    const ship = shipOf(field);
    const [first] = field.tow;
    expect([first!.x, first!.y]).toEqual([
      expect.closeTo(ship.x),
      expect.closeTo(wrap(ship.y + TOW_HOOK + TOW_LINK, field.torus.height)),
    ]);
  });
});
