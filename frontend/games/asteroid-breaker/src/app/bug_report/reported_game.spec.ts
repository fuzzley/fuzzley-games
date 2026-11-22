import { TestBed } from "@angular/core/testing";
import {
  BUG_REPORT_SOURCE,
  BugReportService,
  type BugReportSource,
  type ReportState,
  packState,
  unpackState,
} from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { describe, expect, it } from "vitest";
import { WIDEST, pilot } from "../../testing/autopilot";
import {
  catchOn,
  placeBurr,
  placeComet,
  placeSpark,
  placeStray,
  shipOf,
  stepTimes,
} from "../../testing/field_picture";
import {
  laidOutField,
  playedField,
  runUnderWay,
} from "../../testing/run_under_way";
import {
  type Field,
  fieldFor,
  steerField,
  stepField,
} from "../../rules/field/field";
import { momentOf } from "../../rules/field/moment";
import { rocksLeft } from "../../rules/rocks/rocks";
import {
  type Run,
  catchUp,
  createRun,
  pause,
  startWave,
  waveStart,
} from "../../rules/run/run";
import {
  type SavedGame,
  restoreGame,
  saveGame,
} from "../../rules/run/saved_game";
import { STILL, type Steer } from "../../rules/ship/ship";
import { type Torus, torusFor } from "../../rules/torus";
import { waveToPlay } from "../../rules/waves/endless";
import { WAVES, type WaveEntry, waveEntryOf } from "../../rules/waves/waves";
import { TUNED } from "../../view/debug_tuning";
import { DEFAULT_SETTINGS, type Settings } from "../settings/settings.service";
import {
  REPORT_TAG,
  type ReportedGame,
  gameLine,
  readReportedGame,
  reportState,
  settingsLines,
  summaryOf,
} from "./reported_game";

/** The id the specs take a reported run up under. */
const ID = 9;

/**
 * The steps the largest likely field is played before it is reported: as
 * many as the busiest wave takes to break its rocks into the most at once.
 */
const BUSIEST_STEPS = 270;

/** The settings a player who changed every one of them plays with. */
const CHANGED: Settings = {
  speed: "fast",
  deck: "always",
  stickOnRight: true,
  fireByItself: true,
  haptics: false,
  sound: false,
  effects: false,
  voice: false,
  bed: false,
  mono: true,
};

/** Describes a run under way and its field, as the game holds them. */
interface Played {
  readonly run: Run;
  readonly field: Field;
}

/**
 * Returns a run of the specs' under way, paused, caught up with its field,
 * on which a Slow is caught, sparks are out, one of the crew is knocked
 * loose, and a stray, a comet and a burr are adrift.
 */
function busyRun(): Played {
  const run = runUnderWay();
  const field = playedField(run);
  const ship = shipOf(field);
  catchOn(field, "slow");
  placeSpark(field, ship.x, 4);
  placeStray(field, 4, 4, 0.5);
  placeComet(field, 30, 2, 1.2);
  placeBurr(field, 60, 30, 2);
  return { run: pause(catchUp(run, field)), field };
}

/**
 * Returns a run of the specs' under way, paused, on a field of a size, its
 * field played a second as `playedField()` plays one.
 */
function playedOn(torus: Torus): Played {
  const run = runUnderWay();
  const field = laidOutField(run, torus);
  steerField(field, { ...STILL, turn: 1 });
  stepTimes(field, 120);
  field.score = run.score - run.banked;
  field.rockPoints = field.score;
  return { run: pause(catchUp(run, field)), field };
}

/**
 * Returns the largest field a report is likely to carry: the wave that lays
 * the most rocks out, on the widest field, played by the autopilot until
 * they are broken into the most at once, its sparks out and its shots in
 * flight.
 */
function largestRun(): Played {
  const fieldOf = (entry: WaveEntry, run: Run): Field =>
    fieldFor(waveToPlay(entry, run.seed), {
      ...waveStart(run),
      torus: WIDEST,
      speed: run.speed,
      held: STILL,
    });
  const runAt = (entry: WaveEntry): Run =>
    createRun({ id: 1, seed: 7, speed: "normal", wave: entry.number });
  const busiest = WAVES.reduce((most, entry) =>
    rocksLeft(fieldOf(entry, runAt(entry))) >
    rocksLeft(fieldOf(most, runAt(most)))
      ? entry
      : most,
  );
  const run = startWave(runAt(busiest));
  const field = fieldOf(busiest, run);
  const steer: Steer = { ...STILL };
  for (let step = 0; step < BUSIEST_STEPS; step++) {
    pilot(field, steer);
    steerField(field, steer);
    stepField(field);
  }
  return { run: pause(catchUp(run, field)), field };
}

/** Returns a run as a report carries it, flown on the game's own numbers. */
function reportedGameOf(
  { run, field }: Played,
  settings = DEFAULT_SETTINGS,
): ReportedGame {
  const saved = saveGame(run, field, WAVES, { broughtHome: [], tuned: false });
  return {
    saved,
    moment: momentOf(field),
    torus: field.torus,
    tuning: TUNED,
    settings,
  };
}

/**
 * Returns what the game saves of the specs' busy run once its wave is
 * cleared: the next wave, not yet begun, and no field.
 */
function savedAfterClearing(): SavedGame | null {
  const { run, field } = busyRun();
  const cleared: Run = {
    ...run,
    banked: run.score,
    straysBanked: run.strays,
    outcome: "cleared",
  };
  return saveGame(cleared, field, WAVES, { broughtHome: [], tuned: false });
}

/** Returns what a report's state reads back as, through its link's packing. */
async function packedAndRead(state: ReportState): Promise<unknown> {
  const packed = await packState(REPORT_TAG, state.value);
  return readReportedGame(await unpackState(REPORT_TAG, packed), WAVES, ID);
}

/**
 * Returns the issue's link for a state, with the game's line and settings
 * as a report gives them.
 */
async function issueUrlOf(played: Played, state: ReportState): Promise<URL> {
  const { run } = played;
  const source: BugReportSource = {
    title: "Asteroid Breaker",
    tag: REPORT_TAG,
    game: () => gameLine(run, waveEntryOf(WAVES, run.wave)),
    settings: () => settingsLines(DEFAULT_SETTINGS),
    capture: () => state,
    load: () => Promise.resolve(false),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: BUG_REPORT_SOURCE, useValue: source }],
  });
  return new URL(await TestBed.inject(BugReportService).issueUrl(state));
}

/** Returns a value as JSON would carry it, its every number as it is. */
function viaJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("reportState", () => {
  installCompressionStreams();

  it("reads a state back as it was packed", async () => {
    const played = busyRun();
    const state = reportState(reportedGameOf(played), played.run);

    const read = await packedAndRead(state);

    expect(read).toEqual(readReportedGame(state.value, WAVES, ID));
  });

  it("takes the run up from what it saves, with its moment and the rest as reported", () => {
    const game = reportedGameOf(busyRun());

    const read = readReportedGame(viaJson(game), WAVES, ID);

    expect(read).toEqual({
      takenUp: restoreGame(viaJson(game.saved), WAVES, ID),
      moment: game.moment,
      torus: game.torus,
      tuning: TUNED,
      settings: DEFAULT_SETTINGS,
    });
  });

  it("cuts a place on the field down to a thousandth of a unit", () => {
    const played = busyRun();
    shipOf(played.field).x = 12.3459;

    const read = readReportedGame(
      reportState(reportedGameOf(played), played.run).value,
      WAVES,
      ID,
    );

    expect(read.moment?.ship.x).toBe(12.345);
  });

  it("cuts any other number to the nearest thousandth", () => {
    const played = busyRun();
    shipOf(played.field).vx = 0.1236;

    const read = readReportedGame(
      reportState(reportedGameOf(played), played.run).value,
      WAVES,
      ID,
    );

    expect(read.moment?.ship.vx).toBe(0.124);
  });

  it("leaves a field's size uncut, so a place cut under it stays under it", () => {
    const played = playedOn(torusFor(1280, 720));
    const { width } = played.field.torus;
    shipOf(played.field).x = width - 0.00001;

    const read = readReportedGame(
      reportState(reportedGameOf(played), played.run).value,
      WAVES,
      ID,
    );

    expect({
      torus: read.torus,
      under: (read.moment?.ship.x ?? width) < read.torus.width,
    }).toEqual({ torus: played.field.torus, under: true });
  });

  it("leaves out the moment of a run whose saved game keeps no field", () => {
    const played = busyRun();
    const game = { ...reportedGameOf(played), saved: savedAfterClearing() };

    const read = readReportedGame(
      reportState(game, played.run).value,
      WAVES,
      ID,
    );

    expect(read.moment).toBeNull();
  });

  it("fits the largest likely state in the link, keeping what of it fits", async () => {
    const played = largestRun();
    const state = reportState(reportedGameOf(played), played.run);

    const url = await issueUrlOf(played, state);

    expect({
      length: url.toString().length <= 6000,
      packed: url.searchParams.get("game-state")?.includes(`${REPORT_TAG}.`),
    }).toEqual({ length: true, packed: true });
  });

  it("shrinks first by the sparks and shots, then by the moment", () => {
    const played = busyRun();
    const state = reportState(reportedGameOf(played), played.run);

    const trimmed = [0, 1].map((kept) => {
      const trim = state.trim?.at(kept);
      const read = readReportedGame(trim?.value, WAVES, ID);
      return { note: trim?.note, sparks: read.moment?.sparks.length ?? null };
    });

    expect(trimmed).toEqual([
      { note: "Only what the game saves", sparks: null },
      { note: "Without the sparks and shots", sparks: 0 },
    ]);
  });

  it("can't shrink a state with no moment", () => {
    const played = busyRun();
    const game = { ...reportedGameOf(played), moment: null };

    const state = reportState(game, played.run);

    expect(state.trim).toBeUndefined();
  });
});

describe("summaryOf", () => {
  it("says a run's wave, score, crew in tow and stage", () => {
    const run = pause(runUnderWay());

    const summary = summaryOf(run);

    expect(summary).toBe("Wave 3 · Score 800 · 3 following · Paused");
  });

  it("says a run over", () => {
    const run = runUnderWay({
      outcome: "over",
      crew: { pilot: null, tow: [], home: [0, 1, 3, 5, 6], lastGiven: 6 },
    });

    const summary = summaryOf(run);

    expect(summary).toBe("Wave 3 · Score 800 · No one following · Game over");
  });
});

describe("gameLine", () => {
  it("names the game, the speed and the wave", () => {
    const run = runUnderWay();

    const line = gameLine(run, waveEntryOf(WAVES, run.wave));

    expect(line).toBe("Asteroid Breaker · Fast · Wave 3: Adrift");
  });
});

describe("settingsLines", () => {
  it("words each setting as the drawer does", () => {
    const lines = settingsLines(CHANGED);

    expect(lines).toEqual([
      "Speed: Fast",
      "Touch controls: Always",
      "Stick on the right: On",
      "Auto-fire: On",
      "Buzz the phone: Off",
      "Play sounds: Off",
      "Play sound effects: Off",
      "Play fuzzball voices: Off",
      "Play music: Off",
      "One speaker: On",
    ]);
  });
});

describe("readReportedGame", () => {
  /** Describes a way to spoil a reported game, and the error it reads as. */
  type GameSpoil = readonly [
    what: string,
    error: string,
    spoil: (game: ReportedGame) => unknown,
  ];

  const SPOILS: readonly GameSpoil[] = [
    ["a game that isn't a record", "The state's game can't be read.", () => 1],
    [
      "a saved game of a wave there isn't",
      "The state's saved game can't be read.",
      (game) => ({ ...game, saved: { ...game.saved, waveId: "gone" } }),
    ],
    [
      "a field size no board lays out",
      "The state's field size can't be read.",
      (game) => ({ ...game, torus: { width: 10, height: 10 } }),
    ],
    [
      "a field size that isn't its saved field's",
      "The field size doesn't match the saved field.",
      (game) => ({ ...game, torus: { width: 88, height: 40 } }),
    ],
    [
      "a tuned number that isn't one",
      "The state's tuning can't be read.",
      (game) => ({ ...game, tuning: { ...game.tuning, thrust: "lots" } }),
    ],
    [
      "settings that aren't a record",
      "The state's settings can't be read.",
      (game) => ({ ...game, settings: [] }),
    ],
    [
      "a speed there isn't",
      "The state's settings can't be read.",
      (game) => ({ ...game, settings: { ...game.settings, speed: "warp" } }),
    ],
    [
      "a deck showing there isn't",
      "The state's settings can't be read.",
      (game) => ({
        ...game,
        settings: { ...game.settings, deck: "sometimes" },
      }),
    ],
    [
      "a switch that isn't a yes or a no",
      "The state's settings can't be read.",
      (game) => ({ ...game, settings: { ...game.settings, mono: "no" } }),
    ],
    [
      "a moment of no saved game",
      "The state has a moment but no saved field.",
      (game) => ({ ...game, saved: null }),
    ],
    [
      "a moment of a saved game that keeps no field",
      "The state has a moment but no saved field.",
      (game) => ({ ...game, saved: savedAfterClearing() }),
    ],
    [
      "a moment that can't be trusted",
      "The field's ship can't be read.",
      (game) => ({ ...game, moment: { ...game.moment, ship: null } }),
    ],
  ];

  it.each(SPOILS)("refuses %s, naming its part", (_what, error, spoil) => {
    const value = viaJson(spoil(reportedGameOf(busyRun())));

    const read = (): unknown => readReportedGame(value, WAVES, ID);

    expect(read).toThrow(error);
  });

  it("reads a game the game kept nothing of", () => {
    const played = busyRun();
    const game = { ...reportedGameOf(played), saved: null, moment: null };

    const read = readReportedGame(viaJson(game), WAVES, ID);

    expect(read.takenUp).toBeNull();
  });

  it("reads the settings as they were reported", () => {
    const game = reportedGameOf(busyRun(), CHANGED);

    const read = readReportedGame(viaJson(game), WAVES, ID);

    expect(read.settings).toEqual(CHANGED);
  });
});
