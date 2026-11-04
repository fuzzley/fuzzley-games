import { type Field, type PlayerSetup, fieldFor, steerField } from "./field";
import { fillFor, stretchField } from "./fill";
import { nextStrayAfter } from "./hazards";
import { rocksLeft } from "./rocks";
import { type Run, createRun, waveStart } from "./run";
import {
  type RunKeeping,
  type SavedField,
  type SavedGame,
  type SavedRock,
  restoreGame,
  saveGame,
  takeUpField,
} from "./saved_game";
import { STILL } from "./ship";
import { safestPlace } from "./spawn";
import { type Torus, middleOf } from "./torus";
import { type Wave, WAVES, parseWave, waveEntryOf } from "./waves";
import { stepTimes } from "../testing/field_picture";

/** The field's size the specs lay their waves out at. */
const TORUS: Torus = { width: 72, height: 40 };

/** The short side's square, which a pause may stretch the specs' field to. */
const SQUARE: Torus = { width: 40, height: 40 };

/** The wave the specs' runs are under way on: the third, "Adrift". */
const WAVE = 3;

/** What of the run the shell keeps beside it, as most specs have it: no strays, no tuning. */
const KEEPING: RunKeeping = { broughtHome: [], tuned: false };

/** What a field is taken up with beyond its wave and its run, as the specs have it: nothing held, nothing tuned. */
const SETUP: PlayerSetup = { held: STILL };

/** A large volatile broken a step before the specs' field was kept, its blast still to go off. */
const FUSE_LIT: Partial<SavedRock> = {
  kind: "volatile",
  size: "large",
  hits: 0,
  live: false,
  goesOffAt: 125,
};

/** Returns a run under way on the specs' wave, with points banked and some scored on it. */
function runUnderWay(change: Partial<Run> = {}): Run {
  return {
    ...createRun({ id: 4, seed: 7, speed: "fast", wave: WAVE }),
    firstWave: 2,
    banked: 500,
    score: 800,
    straysBanked: 2,
    strays: 2,
    crew: { flying: [3, 0], home: [6], lastGiven: 6 },
    outcome: "playing",
    ...change,
  };
}

/** Returns the specs' wave, ready to play. */
function waveOf(run: Run): Wave {
  return parseWave(waveEntryOf(WAVES, run.wave));
}

/** Returns the field of a run's wave as the game lays it out, on a size. */
function fieldOf(run: Run, torus: Torus = TORUS): Field {
  return fieldFor(waveOf(run), {
    ...waveStart(run),
    torus,
    speed: run.speed,
    held: STILL,
  });
}

/** Returns a run's field, played a second, its ship turning from the first step, as a wave holds still until the first move. */
function playedField(run: Run): Field {
  const field = fieldOf(run);
  steerField(field, { ...STILL, turn: 1 });
  stepTimes(field, 120);
  return field;
}

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

/** Lights the fuse of a field's first rock, as though it were a volatile broken a step before. */
function lightFuse(field: Field): void {
  const [rock] = field.rocks;
  if (!rock) throw new Error("No rock laid.");
  Object.assign(rock, FUSE_LIT);
}

/** Returns a stored run's field, failing where it kept none. */
function fieldIn(saved: SavedGame): SavedField {
  if (!saved.field) throw new Error("No field kept.");
  return saved.field;
}

/** Returns the specs' stored run with some of its values changed, as a browser might come to hold it. */
function tampered(change: Record<string, unknown>): unknown {
  return { ...stored(), ...change };
}

/** Returns the specs' stored run with some of its field's values changed. */
function tamperedField(change: Record<string, unknown>): unknown {
  const saved = stored();
  return { ...saved, field: { ...fieldIn(saved), ...change } };
}

/** Returns the specs' stored run with some of its first rock's values changed. */
function tamperedRock(change: Record<string, unknown>): unknown {
  const saved = stored();
  const [first, ...rest] = fieldIn(saved).rocks;
  return tamperedField({ rocks: [{ ...first, ...change }, ...rest] });
}

/** Returns what storage kept, taken up: the run and its field as kept. */
function takingUp(value: unknown = stored()): {
  run: Run;
  saved: SavedField;
} {
  const takenUp = restoreGame(value, WAVES, 9);
  if (!takenUp?.field) throw new Error("No field taken up.");
  return { run: takenUp.run, saved: takenUp.field };
}

/** Returns as many of the specs' stored rocks as its wave holds on its field, each the first. */
function fullRocks(): readonly SavedRock[] {
  const [rock] = fieldIn(stored()).rocks;
  if (!rock) throw new Error("No rock kept.");
  const cap = fillFor(waveOf(runUnderWay()), TORUS).cap;
  return Array.from({ length: cap }, () => ({ ...rock, x: 1, y: 1 }));
}

/** Returns the specs' stored run with a stray its field sent brought home on its wave, at a score. */
function strayHomeAt(score: number): unknown {
  const saved = stored();
  return {
    ...saved,
    score,
    strays: 3,
    field: { ...fieldIn(saved), straysSent: 1 },
  };
}

describe("saveGame", () => {
  it("keeps nothing of a run waiting for its first move", () => {
    const run = createRun({ id: 1, seed: 7, speed: "normal", wave: 1 });

    expect(saveGame(run, fieldOf(run), WAVES, KEEPING)).toBeNull();
  });

  it("keeps nothing of a run that has ended", () => {
    const run = runUnderWay({ outcome: "over" });

    expect(saveGame(run, fieldOf(run), WAVES, KEEPING)).toBeNull();
  });

  it("keeps a run under way: its wave by number and id, its points, its crew and its strays", () => {
    const saved = stored();

    expect(saved).toMatchObject({
      waveId: "adrift",
      wave: WAVE,
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

  it("keeps the field's size, its whole rocks and the counts it runs by", () => {
    const run = runUnderWay();
    const field = playedField(run);

    const saved = saveGame(run, field, WAVES, KEEPING);

    expect(saved?.field).toEqual({
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
      steps: 120,
      draws: field.draws,
      straysSent: field.strays.sent,
      nextStrayAt: field.strays.nextAt,
      nextCometAt: field.comets.nextAt,
      lastDropAt: field.lastDropAt,
      chainPoints: field.chainPoints,
      shipsLost: field.shipsLost,
    });
  });

  it("keeps the size a field was laid out at, and the size a pause stretched it to", () => {
    const run = runUnderWay();
    const field = playedField(run);
    stretchField(field, SQUARE);

    const saved = saveGame(run, field, WAVES, KEEPING);

    expect(saved?.field).toMatchObject({ laidOut: TORUS, torus: SQUARE });
  });

  it("keeps a rock broken and waiting to go off, for its blast", () => {
    const run = runUnderWay();
    const field = playedField(run);
    lightFuse(field);

    const saved = saveGame(run, field, WAVES, KEEPING);

    expect(saved?.field?.rocks[0]).toMatchObject(FUSE_LIT);
  });

  it("counts a stray adrift as gone, the next coming as long after as it would", () => {
    const run = runUnderWay();
    const field = playedField(run);
    field.strays.adrift.live = true;

    const saved = saveGame(run, field, WAVES, KEEPING);

    expect(saved?.field?.nextStrayAt).toBe(nextStrayAfter(120));
  });

  it("keeps a wave not yet moved as not yet begun, to be laid out afresh on the room it comes back to", () => {
    const run = runUnderWay({ score: 500 });

    const saved = saveGame(run, fieldOf(run), WAVES, KEEPING);

    expect(saved).toMatchObject({ wave: WAVE, field: null });
  });

  it("keeps a run whose wave was just cleared at the start of the next, with no field", () => {
    const run = runUnderWay({ outcome: "cleared", banked: 800 });

    const saved = saveGame(run, fieldOf(run), WAVES, KEEPING);

    expect(saved).toMatchObject({
      wave: WAVE + 1,
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

  it("takes up the strays brought home and whether the run was tuned", () => {
    const saved = stored(runUnderWay(), { broughtHome: [5, 7], tuned: true });

    const takenUp = restoreGame(saved, WAVES, 9);

    expect(takenUp).toMatchObject({ broughtHome: [5, 7], tuned: true });
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
      run: { wave: WAVE + 1, outcome: "paused" },
      field: null,
    });
  });

  it("takes up a field stretched since it was laid out, though it holds more rocks than one laid out at its size", () => {
    const value = tamperedField({ torus: SQUARE, rocks: fullRocks() });

    expect(restoreGame(value, WAVES, 9)).not.toBeNull();
  });

  it("takes up a field waiting only on a blast to go off", () => {
    const [rock] = fieldIn(stored()).rocks;
    const value = tamperedField({ rocks: [{ ...rock, ...FUSE_LIT }] });

    expect(restoreGame(value, WAVES, 9)).not.toBeNull();
  });

  it.each<[string, unknown]>([
    ["something that isn't a run", 5],
    ["a wave that isn't a number", tampered({ wave: String(WAVE) })],
    ["a wave before the first", tampered({ wave: 0 })],
    ["another wave's id", tampered({ waveId: "thaw" })],
    ["a first wave that isn't a number", tampered({ firstWave: "2" })],
    ["a first wave before the first", tampered({ firstWave: 0 })],
    ["a first wave after the wave in play", tampered({ firstWave: WAVE + 1 })],
    ["a speed there is none of", tampered({ speed: "slow" })],
    ["a seed that isn't whole", tampered({ seed: 7.5 })],
    ["points banked below nothing", tampered({ banked: -1 })],
    ["a score that isn't a number", tampered({ score: "800" })],
    [
      "a score below the points banked, on a wave not yet begun",
      tampered({ score: 400, field: null }),
    ],
    ["strays banked that aren't a number", tampered({ straysBanked: "2" })],
    ["strays that aren't a number", tampered({ strays: "2" })],
    ["fewer strays than were banked", tampered({ strays: 1 })],
    [
      "a next ship's mark that isn't a count",
      tampered({ nextShipAt: "10000" }),
    ],
    ["a next ship's mark that is none", tampered({ nextShipAt: 15_000 })],
    [
      "a next ship's mark past the first above the score",
      tampered({ nextShipAt: 30_000 }),
    ],
    ["a next ship's mark the score has passed", tampered({ score: 10_000 })],
    ["no one flying", tampered({ flying: [] })],
    ["pilots flying that aren't a list", tampered({ flying: 3 })],
    [
      "more ships than a run can have",
      tampered({ flying: [0, 1, 2, 3, 4, 5, 6] }),
    ],
    ["a pilot of no color", tampered({ home: [8] })],
    ["pilots at home that aren't a list", tampered({ home: 6 })],
    [
      "more strays at home than the run brought home",
      tampered({ home: [6, 2, 1] }),
    ],
    ["a last color given that is none", tampered({ lastGiven: 8 })],
    ["a tuning that isn't a yes or a no", tampered({ tuned: "no" })],
    ["a wave not yet begun that has scored", tampered({ field: null })],
    [
      "a wave not yet begun that has brought a stray home",
      tampered({ field: null, score: 500, strays: 3, broughtHome: [] }),
    ],
    ["a field that isn't one", tampered({ field: 5 })],
    ["a field of no size", tamperedField({ torus: 5 })],
    ["a field laid out at no size", tamperedField({ laidOut: undefined })],
    [
      "a field whose size isn't a number",
      tamperedField({ torus: { width: "72", height: 40 } }),
    ],
    [
      "a field whose height isn't a number",
      tamperedField({ torus: { width: 72, height: "40" } }),
    ],
    [
      "a field of a size no board lays out",
      tamperedField({ torus: { width: 72, height: 39 } }),
    ],
    [
      "a field laid out at a size no board lays out",
      tamperedField({ laidOut: { width: 72, height: 39 } }),
    ],
    [
      "a field longer than any",
      tamperedField({ torus: { width: 89, height: 40 } }),
    ],
    ["a field with no rocks", tamperedField({ rocks: [] })],
    ["a field not yet moved", tamperedField({ steps: 0, lastDropAt: 0 })],
    ["a field whose rocks aren't a list", tamperedField({ rocks: 5 })],
    ["a field of steps that aren't a count", tamperedField({ steps: 120.5 })],
    ["a count below nothing", tamperedField({ draws: -1 })],
    ["strays sent that aren't a count", tamperedField({ straysSent: 0.5 })],
    ["more strays sent than the wave sends", tamperedField({ straysSent: 5 })],
    [
      "a stray brought home that the wave never sent",
      tampered({ strays: 3, score: 1300 }),
    ],
    [
      "fewer points than the strays brought home on the wave score",
      strayHomeAt(800),
    ],
    [
      "a next stray's step that isn't a count",
      tamperedField({ nextStrayAt: -1 }),
    ],
    [
      "a next comet's step that isn't a count",
      tamperedField({ nextCometAt: -1 }),
    ],
    ["a pickup let go that isn't a count", tamperedField({ lastDropAt: -1 })],
    [
      "a pickup let go after the field's last step",
      tamperedField({ lastDropAt: 121 }),
    ],
    ["chain points that aren't a count", tamperedField({ chainPoints: -1 })],
    [
      "more points from the chain than the wave has",
      tamperedField({ chainPoints: 301 }),
    ],
    ["ships lost that aren't a count", tamperedField({ shipsLost: -1 })],
    ["a rock that isn't one", tamperedField({ rocks: [5] })],
    ["a rock of a kind there is none of", tamperedRock({ kind: "glass" })],
    ["a rock of a size there is none of", tamperedRock({ size: "huge" })],
    [
      "a rock of a size named as any object's key",
      tamperedRock({ size: "constructor" }),
    ],
    [
      "a rock of a size its kind doesn't come in",
      tamperedRock({ kind: "crystal", size: "small" }),
    ],
    ["a rock off the field", tamperedRock({ x: TORUS.width })],
    ["a rock below the field", tamperedRock({ y: TORUS.height })],
    [
      "a rock off the field as a pause stretched it",
      tamperedField({ torus: SQUARE }),
    ],
    ["a rock whose speed isn't a number", tamperedRock({ vx: "fast" })],
    ["a rock whose speed down isn't a number", tamperedRock({ vy: null })],
    ["a rock whose angle isn't a number", tamperedRock({ angle: "up" })],
    ["a rock whose turn isn't a number", tamperedRock({ spin: Infinity })],
    ["a rock of an outline that isn't whole", tamperedRock({ outline: 1.5 })],
    ["a rock of an outline below the first", tamperedRock({ outline: -1 })],
    ["a rock of an outline there is none of", tamperedRock({ outline: 6 })],
    ["a rock whose hits aren't a count", tamperedRock({ hits: "1" })],
    ["a rock with more hits than it starts with", tamperedRock({ hits: 99 })],
    ["a whole rock with no hits left", tamperedRock({ hits: 0 })],
    ["a rock neither whole nor broken", tamperedRock({ live: "yes" })],
    [
      "a rock whose blast's step isn't a count",
      tamperedRock({ goesOffAt: -1 }),
    ],
    ["a whole rock waiting to go off", tamperedRock({ goesOffAt: 125 })],
    ["a broken rock with hits left", tamperedRock({ ...FUSE_LIT, hits: 1 })],
    [
      "a broken rock of a kind that doesn't blast",
      tamperedRock({ ...FUSE_LIT, kind: "stone" }),
    ],
    [
      "a blast due by the field's last step",
      tamperedRock({ ...FUSE_LIT, goesOffAt: 120 }),
    ],
    [
      "a blast due later than its beat",
      tamperedRock({ ...FUSE_LIT, goesOffAt: 200 }),
    ],
    [
      "a blast whose step isn't a number",
      tamperedRock({ ...FUSE_LIT, goesOffAt: "125" }),
    ],
  ])("drops %s", (_, value) => {
    expect(restoreGame(value, WAVES, 9)).toBeNull();
  });

  it("drops a field of more rocks than its wave holds at the size it was laid out at", () => {
    const [rock] = fieldIn(stored()).rocks;
    const rocks = [...fullRocks(), rock];

    expect(restoreGame(tamperedField({ rocks }), WAVES, 9)).toBeNull();
  });
});

describe("takeUpField", () => {
  it("lays the field kept out afresh, as it was, every count among it", () => {
    const { run, saved } = takingUp(
      tamperedField({
        draws: 9,
        straysSent: 1,
        nextStrayAt: 600,
        nextCometAt: 900,
        lastDropAt: 60,
        chainPoints: 80,
        shipsLost: 1,
      }),
    );

    const field = takeUpField(waveOf(run), SETUP, saved, run);

    expect(saveGame(run, field, WAVES, KEEPING)?.field).toEqual(saved);
  });

  it("lays a field stretched since out at the size it was laid out at, its slots, strays and comets as they were", () => {
    const run = runUnderWay();
    const before = playedField(run);
    stretchField(before, SQUARE);
    const { saved } = takingUp(storedOf(run, before));

    const field = takeUpField(waveOf(run), SETUP, saved, run);

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
    const rocks = fieldIn(stored()).rocks.slice(0, 1);
    const { run, saved } = takingUp(tamperedField({ rocks }));

    const field = takeUpField(waveOf(run), SETUP, saved, run);

    expect(rocksLeft(field)).toBe(1);
  });

  it("draws each rock where it is, rather than between where it was laid and there", () => {
    const { run, saved } = takingUp();

    const [first] = takeUpField(waveOf(run), SETUP, saved, run).rocks;

    expect({ lastX: first?.lastX, lastY: first?.lastY }).toEqual({
      lastX: first?.x,
      lastY: first?.y,
    });
  });

  it("takes the wave's points and strays brought home from the run", () => {
    const { run, saved } = takingUp(strayHomeAt(1300));

    const field = takeUpField(waveOf(run), SETUP, saved, run);

    expect({ score: field.score, home: field.strays.broughtHome }).toEqual({
      score: 800,
      home: 1,
    });
  });

  it("sets off a blast whose fuse was lit before the page went away, clearing a wave that waited only on it", () => {
    const [rock] = fieldIn(stored()).rocks;
    const { run, saved } = takingUp(
      tamperedField({ rocks: [{ ...rock, ...FUSE_LIT }] }),
    );
    const field = takeUpField(waveOf(run), SETUP, saved, run);

    stepTimes(field, 10);

    expect(field.cleared).toBe(true);
  });

  it("sets the ship waiting where it is safest, away from a rock kept over the middle", () => {
    const { run, saved } = takingUp(tamperedRock({ ...middleOf(TORUS) }));

    const field = takeUpField(waveOf(run), SETUP, saved, run);

    const { ship } = field;
    expect({ x: ship?.x, y: ship?.y, waiting: ship?.waiting }).toEqual({
      ...safestPlace(field),
      waiting: true,
    });
    expect(safestPlace(field)).not.toEqual(middleOf(TORUS));
  });
});
