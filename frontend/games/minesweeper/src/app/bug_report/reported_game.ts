import { count } from "@fz/core/format";
import { isCount, isRecord, isWhole, unknownKey } from "@fz/core/json";
import { formatClock } from "@fz/game-ui/stopwatch";
import {
  type FieldSize,
  isDifficultyId,
  isValidLives,
  isValidSize,
} from "../../rules/difficulty";
import { type Outcome, minesLeft } from "../../rules/field";
import {
  type SavedField,
  restoreField,
  saveField,
} from "../../rules/saved_field";
import type { LoadedGame } from "../play/game.service";

/**
 * The tag Minesweeper's state is packed under. A change to the shape of
 * {@link ReportedValue} takes the next one, `ms2`.
 */
export const REPORT_TAG = "ms1";

/** Says how far the stage around the board is scrolled, in whole CSS pixels. */
export interface StageScrollAt {
  readonly left: number;
  readonly top: number;
}

/**
 * Describes the game as a bug report carries it: the game to load as it
 * stood, ended or not, and what else the player saw of it.
 */
export interface ReportedGame extends LoadedGame {
  /** Whether the board stood the field on end, on an upright screen. */
  readonly turned: boolean;
  /** How far the stage around the board was scrolled. */
  readonly scroll: StageScrollAt;
}

/** Describes a reported game as it is packed: plain JSON, its field as saved. */
export type ReportedValue = Omit<ReportedGame, "field"> & {
  readonly field: SavedField;
};

/** Every part of a packed game, so a reader names one it doesn't know. */
const PARTS: Readonly<Record<keyof ReportedValue, true>> = {
  field: true,
  difficulty: true,
  seconds: true,
  flagMode: true,
  lives: true,
  custom: true,
  turned: true,
  scroll: true,
};

/** What a summary calls each way a game can stand. */
const OUTCOME_WORDS: Readonly<Record<Outcome, string>> = {
  ready: "Not started",
  playing: "In play",
  won: "Won",
  lost: "Lost",
};

/** Returns a reported game as its state is packed. */
export function reportedValue(game: ReportedGame): ReportedValue {
  return {
    field: saveField(game.field),
    difficulty: game.difficulty,
    seconds: game.seconds,
    flagMode: game.flagMode,
    lives: game.lives,
    custom: game.custom,
    turned: game.turned,
    scroll: game.scroll,
  };
}

/**
 * Returns the game a reported state describes.
 *
 * @throws Error naming the first part this build can't read: one cut short
 *   or edited, a field the game couldn't have saved, or a part it doesn't
 *   know.
 */
export function readReportedGame(value: unknown): ReportedGame {
  if (!isRecord(value))
    throw new Error("This build can't read the game state.");
  const field = restoreField(value["field"]);
  if (!field) throw unreadable("field");
  const { difficulty, seconds, flagMode, lives, turned } = value;
  if (!isDifficultyId(difficulty)) throw unreadable("difficulty");
  if (!isCount(seconds)) throw unreadable("seconds");
  if (typeof flagMode !== "boolean") throw unreadable("flagMode");
  if (!isValidLives(lives)) throw unreadable("lives");
  const custom = sizeFrom(value["custom"]);
  if (!custom) throw unreadable("custom");
  if (typeof turned !== "boolean") throw unreadable("turned");
  const scroll = scrollFrom(value["scroll"]);
  if (!scroll) throw unreadable("scroll");
  const unknown = unknownKey(value, PARTS);
  if (unknown !== null) {
    throw new Error(
      `The game state has a part this build doesn't know: ${unknown}.`,
    );
  }
  return {
    field,
    difficulty,
    seconds,
    flagMode,
    lives,
    custom,
    turned,
    scroll,
  };
}

/**
 * Returns a reported game in one line, for people: "In play · 1:42 · 2 of 3
 * lives · 31 mines left".
 */
export function reportSummary(game: ReportedGame): string {
  const { field } = game;
  return [
    OUTCOME_WORDS[field.outcome],
    formatClock(game.seconds),
    `${field.livesLeft} of ${count(field.lives, "life", "lives")}`,
    `${count(minesLeft(field), "mine", "mines")} left`,
    ...(game.flagMode ? ["Flag mode on"] : []),
    ...(game.turned ? ["board turned"] : []),
  ].join(" · ");
}

/** Returns the error that names a part of the state this build can't read. */
function unreadable(part: string): Error {
  return new Error(`This build can't read ${part} in the game state.`);
}

/** Returns the custom field a state holds, or null if the game couldn't deal it. */
function sizeFrom(value: unknown): FieldSize | null {
  if (!isRecord(value)) return null;
  const { rows, cols, mines } = value;
  if (!isWhole(rows) || !isWhole(cols) || !isWhole(mines)) return null;
  const size = { rows, cols, mines };
  return isValidSize(size) ? size : null;
}

/** Returns the scroll a state holds, or null for one that isn't a scroll. */
function scrollFrom(value: unknown): StageScrollAt | null {
  if (!isRecord(value)) return null;
  const { left, top } = value;
  return isCount(left) && isCount(top) ? { left, top } : null;
}
