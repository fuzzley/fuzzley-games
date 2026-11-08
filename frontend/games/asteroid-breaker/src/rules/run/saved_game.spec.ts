import {
  IN_ENDLESS,
  type Spoil,
  UNDER_WAY_WAVE,
  laidOutField,
  playedField,
  runUnderWay,
  waveOf,
} from "../../testing/run_under_way";
import type { Field, PlayerSetup } from "../field/field";
import { type SavedField, savedField } from "../field/kept_field";
import { STILL } from "../ship/ship";
import { WAVES } from "../waves/waves";
import { type Run, createRun } from "./run";
import {
  type RunKeeping,
  type SavedGame,
  hasKnownWave,
  hasScored,
  hasSoundCrew,
  hasSoundScore,
  hasSoundStrays,
  hasSpeedAndSeed,
  readRun,
  restoreGame,
  saveGame,
  takeUpField,
  waveSoFar,
} from "./saved_game";

/** What of the run the shell keeps beside it, as most specs have it: no strays, no tuning. */
const KEEPING: RunKeeping = { broughtHome: [], tuned: false };

/**
 * What a field is taken up with beyond its wave and its run, as the specs
 * have it: nothing held, nothing tuned.
 */
const SETUP: PlayerSetup = { held: STILL };

/** Waves a run kept may name that the game doesn't have so, each failing `hasKnownWave()`. */
const KNOWN_WAVE_SPOILS: readonly Spoil[] = [
  ["a wave that isn't a number", { wave: String(UNDER_WAY_WAVE) }],
  ["a wave before the first", { wave: 0 }],
  ["another wave's id", { waveId: "thaw" }],
  ["a first wave that isn't a number", { firstWave: "2" }],
  ["a first wave before the first", { firstWave: 0 }],
  ["a first wave after the wave in play", { firstWave: UNDER_WAY_WAVE + 1 }],
];

/** Speeds and seeds a run kept may hold that no run has, each failing `hasSpeedAndSeed()`. */
const SPEED_AND_SEED_SPOILS: readonly Spoil[] = [
  ["a speed there is none of", { speed: "slow" }],
  ["a seed that isn't whole", { seed: 7.5 }],
];

/** Points a run kept may hold that don't add up, each failing `hasSoundScore()`. */
const SCORE_SPOILS: readonly Spoil[] = [
  ["points banked below nothing", { banked: -1 }],
  ["a score that isn't a number", { score: "800" }],
  ["a score below the points banked", { score: 400 }],
  ["a next ship's mark that isn't a count", { nextShipAt: "10000" }],
  ["a next ship's mark that is none", { nextShipAt: 15_000 }],
  ["a next ship's mark past the first above the score", { nextShipAt: 30_000 }],
  ["a next ship's mark the score has passed", { score: 10_000 }],
];

/** Strays a run kept may hold that don't add up, each failing `hasSoundStrays()`. */
const STRAY_SPOILS: readonly Spoil[] = [
  ["strays banked that aren't a number", { straysBanked: "2" }],
  ["strays that aren't a number", { strays: "2" }],
  ["fewer strays than were banked", { strays: 1 }],
];

/** Crews a run kept may hold that no run has, each failing `hasSoundCrew()`. */
const CREW_SPOILS: readonly Spoil[] = [
  ["no one flying", { flying: [] }],
  ["pilots flying that aren't a list", { flying: 3 }],
  ["more ships than a run can have", { flying: [0, 1, 2, 3, 4, 5, 6] }],
  ["a pilot of no color", { home: [8] }],
  ["a pilot of no color behind one of a color", { flying: [3, 8] }],
  ["pilots at home that aren't a list", { home: 6 }],
  ["more strays at home than the run brought home", { home: [6, 2, 1] }],
  ["a last color given that is none", { lastGiven: 8 }],
];

/** Returns a run and its field as storage keeps them, read back as storage would. */
function storedOf(
  run: Run,
  field: Field,
  keeping: RunKeeping = KEEPING,
): SavedGame {
  const saved = saveGame(run, field, WAVES, keeping);
  if (!saved) throw new Error("The run kept nothing.");
  return JSON.parse(JSON.stringify(saved)) as SavedGame;
}

/** Returns a run and its field, played a second, as storage would read them back. */
function stored(
  run: Run = runUnderWay(),
  keeping: RunKeeping = KEEPING,
): SavedGame {
  return storedOf(run, playedField(run), keeping);
}

/** Returns a run and its field, played a second, as the values storage would read back. */
function storedValues(run: Run = runUnderWay()): Record<string, unknown> {
  return { ...stored(run) };
}

/** Returns a stored run's field, failing where it kept none. */
function fieldIn(saved: SavedGame): SavedField {
  if (!saved.field) throw new Error("No field kept.");
  return saved.field;
}

/**
 * Returns the specs' stored run with some of its values changed, as a
 * browser might come to hold it.
 */
function tampered(
  change: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return { ...storedValues(), ...change };
}

/** Returns the specs' stored run with some of its field's values changed. */
function tamperedField(change: Readonly<Record<string, unknown>>): unknown {
  const saved = stored();
  return { ...saved, field: { ...fieldIn(saved), ...change } };
}

/**
 * Returns the specs' stored run with a stray its field sent brought home on
 * its wave, at a score.
 */
function strayHomeAt(score: number): Record<string, unknown> {
  const saved = stored();
  return {
    ...saved,
    score,
    strays: 3,
    field: { ...fieldIn(saved), straysSent: 1 },
  };
}

describe("saveGame", () => {
  it("keeps nothing of a run waiting for its first wave's first move", () => {
    const run = createRun({ id: 1, seed: 7, speed: "normal", wave: 1 });

    expect(saveGame(run, laidOutField(run), WAVES, KEEPING)).toBeNull();
  });

  it("keeps nothing of a run whose first wave's field hasn't moved, whatever its outcome says", () => {
    const run = runUnderWay({ firstWave: UNDER_WAY_WAVE });

    expect(saveGame(run, laidOutField(run), WAVES, KEEPING)).toBeNull();
  });

  it("keeps nothing of a run that has ended", () => {
    const run = runUnderWay({ outcome: "over" });

    expect(saveGame(run, laidOutField(run), WAVES, KEEPING)).toBeNull();
  });

  it("keeps a run under way: its wave by number and id, its points, its crew and its strays", () => {
    const saved = stored();

    expect(saved).toMatchObject({
      waveId: "adrift",
      wave: UNDER_WAY_WAVE,
      firstWave: 2,
      speed: "fast",
      seed: 7,
      banked: 500,
      score: 800,
      flying: [3, 0],
      home: [6],
      lastGiven: 6,
      nextShipAt: 10_000,
      straysBanked: 2,
      strays: 2,
    });
  });

  it("keeps the strays brought home and whether the run was tuned", () => {
    const saved = stored(runUnderWay(), { broughtHome: [5, 7], tuned: true });

    expect({ broughtHome: saved.broughtHome, tuned: saved.tuned }).toEqual({
      broughtHome: [5, 7],
      tuned: true,
    });
  });

  it("keeps the wave in play's field as storage keeps a field", () => {
    const run = runUnderWay();
    const field = playedField(run);

    const saved = saveGame(run, field, WAVES, KEEPING);

    expect(saved?.field).toEqual(savedField(field));
  });

  it("keeps a wave not yet moved as not yet begun, to be laid out afresh on the room it comes back to", () => {
    const run = runUnderWay({ score: 500, outcome: "ready" });

    const saved = saveGame(run, laidOutField(run), WAVES, KEEPING);

    expect(saved).toMatchObject({ wave: UNDER_WAY_WAVE, field: null });
  });

  it("keeps a run whose wave was just cleared at the start of the next, with no field", () => {
    const run = runUnderWay({ outcome: "cleared", banked: 800 });

    const saved = saveGame(run, laidOutField(run), WAVES, KEEPING);

    expect(saved).toMatchObject({
      wave: UNDER_WAY_WAVE + 1,
      waveId: "thaw",
      field: null,
    });
  });
});

describe("restoreGame", () => {
  it("takes up a run kept, paused, under a new id", () => {
    const run = runUnderWay();

    const takenUp = restoreGame(stored(run), WAVES, 9);

    expect(takenUp?.run).toEqual({ ...run, id: 9, outcome: "paused" });
  });

  it("takes up the field kept as it was", () => {
    const saved = stored();

    const takenUp = restoreGame(saved, WAVES, 9);

    expect(takenUp?.field).toEqual(saved.field);
  });

  it("takes up a run in Endless, its field as kept", () => {
    const saved = stored(runUnderWay(IN_ENDLESS));

    const takenUp = restoreGame(saved, WAVES, 9);

    expect({ wave: takenUp?.run.wave, field: takenUp?.field }).toEqual({
      wave: 40,
      field: saved.field,
    });
  });

  it("takes up the strays brought home and whether the run was tuned", () => {
    const saved = stored(runUnderWay(), { broughtHome: [5, 7], tuned: true });

    const takenUp = restoreGame(saved, WAVES, 9);

    expect(takenUp).toMatchObject({ broughtHome: [5, 7], tuned: true });
  });

  it("takes up every stray the run brought home, banked or on the wave in play", () => {
    const value = { ...strayHomeAt(1300), broughtHome: [5, 7, 1] };

    const takenUp = restoreGame(value, WAVES, 9);

    expect(takenUp?.broughtHome).toEqual([5, 7, 1]);
  });

  it("draws no stray brought home where storage's count doesn't match the run's", () => {
    const saved = stored(runUnderWay(), { broughtHome: [5], tuned: false });

    const takenUp = restoreGame(saved, WAVES, 9);

    expect(takenUp?.broughtHome).toEqual([]);
  });

  it("takes up a wave kept as not yet begun, with nothing scored on it", () => {
    const saved = stored(runUnderWay({ outcome: "cleared", score: 500 }));

    const takenUp = restoreGame(saved, WAVES, 9);

    expect(takenUp).toMatchObject({
      run: { wave: UNDER_WAY_WAVE + 1, outcome: "paused" },
      field: null,
    });
  });

  it.each<[string, unknown]>([
    ["something that isn't a run", 5],
    ["a run that can't be trusted", tampered({ wave: 0 })],
    ["a tuning that isn't a yes or a no", tampered({ tuned: "no" })],
    ["a wave not yet begun that has scored", tampered({ field: null })],
    [
      "a wave not yet begun at the wave the run started at",
      tampered({ field: null, score: 500, firstWave: UNDER_WAY_WAVE }),
    ],
    [
      "a wave not yet begun that has brought a stray home",
      tampered({ field: null, score: 500, strays: 3, broughtHome: [] }),
    ],
    ["a field that isn't one", tampered({ field: 5 })],
    [
      "a field that can't be trusted",
      tamperedField({ steps: 0, lastDropAt: 0 }),
    ],
    [
      "a stray brought home that the wave never sent",
      tampered({ strays: 3, score: 1300 }),
    ],
    [
      "fewer points than the strays brought home on the wave score",
      strayHomeAt(800),
    ],
  ])("drops %s", (_, value) => {
    expect(restoreGame(value, WAVES, 9)).toBeNull();
  });
});

describe("takeUpField", () => {
  it("lays the field kept out afresh, as it was", () => {
    const run = runUnderWay();
    const saved = savedField(playedField(run));

    const field = takeUpField(waveOf(run), SETUP, saved, run);

    expect(savedField(field)).toEqual(saved);
  });

  it("lays an Endless wave's field kept out afresh, as it was, from the run's seed", () => {
    const run = runUnderWay(IN_ENDLESS);
    const saved = savedField(playedField(run));

    const field = takeUpField(waveOf(run), SETUP, saved, run);

    expect(savedField(field)).toEqual(saved);
  });

  it("sets the field up as its run started the wave, at the run's speed", () => {
    const run = runUnderWay();
    const before = playedField(run);

    const field = takeUpField(waveOf(run), SETUP, savedField(before), run);

    expect(field.setup).toEqual(before.setup);
  });

  it("takes the wave's points and strays brought home from the run", () => {
    const run = runUnderWay({ score: 1300, strays: 3 });
    const saved = { ...savedField(playedField(run)), straysSent: 1 };

    const field = takeUpField(waveOf(run), SETUP, saved, run);

    expect({ score: field.score, home: field.strays.broughtHome }).toEqual({
      score: 800,
      home: 1,
    });
  });
});

describe("waveSoFar", () => {
  it("takes the points a run has scored on its wave and the strays it brought home", () => {
    const run = runUnderWay({ score: 1300, strays: 3 });

    expect(waveSoFar(run)).toEqual({ points: 800, straysHome: 1 });
  });
});

describe("readRun", () => {
  it("reads the run kept, paused, under a new id", () => {
    const run = runUnderWay();

    expect(readRun(storedValues(run), WAVES, 9)).toEqual({
      ...run,
      id: 9,
      outcome: "paused",
    });
  });

  it("reads a run with strays at home brought home on its wave in play", () => {
    const value = tampered({ strays: 3, home: [6, 2, 1] });

    expect(readRun(value, WAVES, 9)).not.toBeNull();
  });

  it.each([
    ...KNOWN_WAVE_SPOILS,
    ...SPEED_AND_SEED_SPOILS,
    ...SCORE_SPOILS,
    ...STRAY_SPOILS,
    ...CREW_SPOILS,
  ])("drops a run of %s", (_, change) => {
    expect(readRun(tampered(change), WAVES, 9)).toBeNull();
  });
});

describe("hasKnownWave", () => {
  it("holds a run kept to the wave the game has under its number", () => {
    expect(hasKnownWave(storedValues(), WAVES)).toBe(true);
  });

  it("holds a run in Endless to the wave it names past the last", () => {
    const value = storedValues(runUnderWay(IN_ENDLESS));

    expect(hasKnownWave(value, WAVES)).toBe(true);
  });

  it.each(KNOWN_WAVE_SPOILS)("fails a run of %s", (_, change) => {
    expect(hasKnownWave(tampered(change), WAVES)).toBe(false);
  });
});

describe("hasSpeedAndSeed", () => {
  it("holds a run kept to its speed and its seed", () => {
    expect(hasSpeedAndSeed(storedValues())).toBe(true);
  });

  it.each(SPEED_AND_SEED_SPOILS)("fails a run of %s", (_, change) => {
    expect(hasSpeedAndSeed(tampered(change))).toBe(false);
  });
});

describe("hasSoundScore", () => {
  it("holds a run kept to its points and the next ship's mark", () => {
    expect(hasSoundScore(storedValues())).toBe(true);
  });

  it("holds a run whose score has passed the first mark to the next", () => {
    expect(hasSoundScore(tampered({ score: 10_000, nextShipAt: 30_000 }))).toBe(
      true,
    );
  });

  it.each(SCORE_SPOILS)("fails a run of %s", (_, change) => {
    expect(hasSoundScore(tampered(change))).toBe(false);
  });
});

describe("hasSoundStrays", () => {
  it("holds a run kept to the strays it banked and brought home", () => {
    expect(hasSoundStrays(storedValues())).toBe(true);
  });

  it.each(STRAY_SPOILS)("fails a run of %s", (_, change) => {
    expect(hasSoundStrays(tampered(change))).toBe(false);
  });
});

describe("hasSoundCrew", () => {
  /** The strays the specs' run has brought home, which its pilots at home are held to. */
  const STRAYS = runUnderWay().strays;

  it("holds a run kept to its crew", () => {
    expect(hasSoundCrew(storedValues(), STRAYS)).toBe(true);
  });

  it("holds a crew of as many ships as a run can have", () => {
    const value = tampered({ flying: [0, 1, 2, 3, 4, 5] });

    expect(hasSoundCrew(value, STRAYS)).toBe(true);
  });

  it.each(CREW_SPOILS)("fails a run of %s", (_, change) => {
    expect(hasSoundCrew(tampered(change), STRAYS)).toBe(false);
  });
});

describe("hasScored", () => {
  it.each([
    ["points", { points: 300, straysHome: 0 }],
    ["a stray brought home", { points: 0, straysHome: 1 }],
  ])("says a wave with %s has scored", (_, soFar) => {
    expect(hasScored(soFar)).toBe(true);
  });

  it("says a wave with nothing on it hasn't", () => {
    expect(hasScored({ points: 0, straysHome: 0 })).toBe(false);
  });
});
