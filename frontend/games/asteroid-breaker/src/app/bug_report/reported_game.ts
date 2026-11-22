import { isRecord } from "@fz/core/json";
import { formatPoints } from "@fz/core/format";
import { isOneOf, keysOf, pick } from "@fz/core/records";
import type { ReportState } from "@fz/game-ui/bug_report";
import { readTorus } from "../../rules/field/kept_field";
import { type FieldMoment, readMoment } from "../../rules/field/moment";
import type { Outcome, Run } from "../../rules/run/run";
import {
  type SavedGame,
  type TakenUp,
  restoreGame,
} from "../../rules/run/saved_game";
import { END_TITLE, inTowWords } from "../../rules/run/describe";
import { SPEED_INFO, isSpeed } from "../../rules/speed";
import type { Torus } from "../../rules/torus";
import { waveToPlay } from "../../rules/waves/endless";
import { type WaveEntry, waveEntryOf } from "../../rules/waves/waves";
import { type Feel, readFeel } from "../../view/debug_tuning";
import {
  DECK_SHOWINGS,
  DEFAULT_SETTINGS,
  type Settings,
} from "../settings/settings.service";

/**
 * The tag a report's state is packed under: the game's letters and the
 * version of the state's shape, raised with any change to it.
 */
export const REPORT_TAG = "ab1";

/**
 * A run of the game as a bug report carries it: what the game saves of it,
 * the moment of its field the save leaves out, the field's shape and the
 * numbers it was flown on, the debug menu's tuning, and the settings.
 */
export interface ReportedGame {
  /**
   * The run as the game saves it, or null where it keeps none: a first
   * wave not yet flown, or a run over.
   */
  readonly saved: SavedGame | null;
  /**
   * The moment of the field the saved game keeps, or null where it keeps
   * none, or the link had no room for it.
   */
  readonly moment: FieldMoment | null;
  /**
   * The field's size, which the window, the deck and the stick's side gave
   * it, so a game loaded on another screen is played on the same: the kept
   * field's where the saved game keeps one, else the next wave's.
   */
  readonly torus: Torus;
  /** The numbers that set the feel, the debug menu's where it tuned them. */
  readonly tuning: Feel;
  readonly settings: Settings;
}

/** A reported run read back: the run taken up, paused, and the rest as reported. */
export interface ReadGame extends Omit<ReportedGame, "saved"> {
  /** The run taken up from what the game saved of it, or null for none. */
  readonly takenUp: TakenUp | null;
}

/**
 * How many places a number of the state keeps after the point: a thousandth
 * of a unit, under a twentieth of a pixel on the widest screen, so the
 * state of a full field fits the link.
 */
const PLACES = 3;

/**
 * The keys of places on the field, cut down rather than to the nearest, so
 * a place under the field's width stays under it.
 */
const PLACE_KEYS: ReadonlySet<string> = new Set(["x", "y", "lastX", "lastY"]);

/**
 * The keys of a field's size, left uncut, as a place is held to lie under
 * it and the rocks a wave lays out are counted by its area.
 */
const SIZE_KEYS: ReadonlySet<string> = new Set(["width", "height"]);

/** What a run's stage is called in a report's summary. */
const STAGE_WORDS: Readonly<Record<Outcome, string>> = {
  ready: "Waiting for the first move",
  playing: "In play",
  paused: "Paused",
  cleared: "Cleared",
  over: END_TITLE,
};

/** What each time the deck may show is called, as the settings name it. */
const DECK_WORDS: Readonly<Record<Settings["deck"], string>> = {
  auto: "On a touch screen",
  always: "Always",
  never: "Never",
};

/**
 * Returns the state a report carries of a run, its numbers cut to
 * {@link PLACES} places, its moment left out where its saved game keeps no
 * field to lay it on, with a summary of the run as it stands, which shrinks
 * to fit the link: without the sparks and the shots, then without the
 * moment.
 */
export function reportState(game: ReportedGame, run: Run): ReportState {
  const moment = game.saved?.field ? game.moment : null;
  const state = {
    summary: summaryOf(run),
    value: cutNumbers({ ...game, moment }),
  };
  if (!moment) return state;
  const light: FieldMoment = { ...moment, sparks: [], shots: [] };
  return {
    ...state,
    trim: {
      most: 2,
      at: (kept) =>
        kept === 0
          ? {
              value: cutNumbers({ ...game, moment: null }),
              note: "Only what the game saves",
            }
          : {
              value: cutNumbers({ ...game, moment: light }),
              note: "Without the sparks and shots",
            },
    },
  };
}

/**
 * Returns a run in one line, for a report's summary: its wave, its score,
 * how many follow in tow, and where it stands.
 */
export function summaryOf(run: Run): string {
  return [
    `Wave ${String(run.wave)}`,
    `Score ${formatPoints(run.score)}`,
    inTowWords(run.crew.tow.length),
    STAGE_WORDS[run.outcome],
  ].join(" · ");
}

/**
 * Returns the game in play in one line, for a report: the game, the speed,
 * and the wave in play by its number and name.
 */
export function gameLine(run: Run, entry: WaveEntry): string {
  const wave = `Wave ${String(entry.number)}: ${entry.data.name}`;
  return `Asteroid Breaker · ${SPEED_INFO[run.speed].name} · ${wave}`;
}

/** Returns the settings as the drawer words them, for a report's Environment. */
export function settingsLines(settings: Settings): readonly string[] {
  const onOff = (on: boolean): string => (on ? "On" : "Off");
  return [
    `Speed: ${SPEED_INFO[settings.speed].name}`,
    `Touch controls: ${DECK_WORDS[settings.deck]}`,
    `Stick on the right: ${onOff(settings.stickOnRight)}`,
    `Auto-fire: ${onOff(settings.fireByItself)}`,
    `Buzz the phone: ${onOff(settings.haptics)}`,
    `Play sounds: ${onOff(settings.sound)}`,
    `Play sound effects: ${onOff(settings.effects)}`,
    `Play fuzzball voices: ${onOff(settings.voice)}`,
    `Play music: ${onOff(settings.bed)}`,
    `One speaker: ${onOff(settings.mono)}`,
  ];
}

/**
 * Returns a reported run read back, its saved game taken up, paused, under
 * a run's id, and its moment read against the field the save keeps.
 *
 * @throws Error naming the first part that can't be trusted, or doesn't fit
 *   this build's waves.
 */
export function readReportedGame(
  value: unknown,
  waves: readonly WaveEntry[],
  id: number,
): ReadGame {
  if (!isRecord(value)) throw unreadable("game");
  const { saved } = value;
  const takenUp = saved === null ? null : restoreGame(saved, waves, id);
  if (saved !== null && !takenUp) throw unreadable("saved game");
  const torus = readTorus(value["torus"]);
  if (!torus) throw unreadable("field size");
  if (takenUp?.field && !isSameSize(takenUp.field.torus, torus)) {
    throw new Error("The field size doesn't match the saved field.");
  }
  const tuning = readFeel(value["tuning"]);
  if (!tuning) throw unreadable("tuning");
  const settings = readSettings(value["settings"]);
  if (!settings) throw unreadable("settings");
  return {
    takenUp,
    moment: readMomentOf(value["moment"], takenUp, waves),
    torus,
    tuning,
    settings,
  };
}

/**
 * Returns a value with each of its numbers that isn't whole cut to
 * {@link PLACES} places, but a field's size: a place on the field down,
 * any other to the nearest.
 */
function cutNumbers(value: unknown): unknown {
  const scale = 10 ** PLACES;
  return JSON.parse(
    JSON.stringify(value, (key, each: unknown) => {
      const whole = typeof each !== "number" || Number.isInteger(each);
      if (whole || SIZE_KEYS.has(key)) return each;
      const cut = PLACE_KEYS.has(key) ? Math.floor : Math.round;
      return cut(each * scale) / scale;
    }),
  );
}

/** Returns whether two of a field's sizes are the same. */
function isSameSize(one: Torus, other: Torus): boolean {
  return one.width === other.width && one.height === other.height;
}

/** Returns an error naming the part of a reported state that can't be trusted. */
function unreadable(part: string): Error {
  return new Error(`The state's ${part} can't be read.`);
}

/**
 * Returns the moment read, against the field the run taken up keeps, or
 * null for none.
 *
 * @throws Error for a moment of no field kept, or naming the part of it
 *   that can't be trusted.
 */
function readMomentOf(
  value: unknown,
  takenUp: TakenUp | null,
  waves: readonly WaveEntry[],
): FieldMoment | null {
  if (value === null) return null;
  if (!takenUp?.field) {
    throw new Error("The state has a moment but no saved field.");
  }
  const { run, field } = takenUp;
  const wave = waveToPlay(waveEntryOf(waves, run.wave), run.seed);
  return readMoment(value, wave, field);
}

/** Returns the settings read, each one of those offered, or null where one isn't. */
function readSettings(value: unknown): Settings | null {
  return isSettings(value) ? pick(value, keysOf(DEFAULT_SETTINGS)) : null;
}

/** Returns whether a value read holds each setting, one of those offered. */
function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  const { speed, deck } = value;
  return (
    isSpeed(speed) &&
    isOneOf(deck, DECK_SHOWINGS) &&
    keysOf(DEFAULT_SETTINGS).every(
      (key) =>
        key === "speed" || key === "deck" || typeof value[key] === "boolean",
    )
  );
}
