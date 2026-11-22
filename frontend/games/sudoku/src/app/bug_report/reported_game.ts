import { count } from "@fz/core/format";
import { isCount, isRecord, unknownKey } from "@fz/core/json";
import type { ReportState } from "@fz/game-ui/bug_report";
import { formatClock } from "@fz/game-ui/stopwatch";
import { CELLS } from "../../rules/cells";
import { isLevel } from "../../rules/difficulty";
import type { Grid } from "../../rules/grid";
import { type Hint, hintFor } from "../../rules/hint";
import { type SavedGrid, restoreGrid, saveGrid } from "../../rules/saved_grid";
import type { Settings } from "../settings/settings.service";

/**
 * The tag Sudoku's state is packed under. A change to the shape of
 * {@link ReportedValue} takes the next one, `sd2`.
 */
export const REPORT_TAG = "sd1";

/**
 * Describes the game as a bug report carries it: the grid as it stood,
 * solved or not, with every move undo could take back, and what else the
 * player saw of it.
 */
export interface ReportedGame {
  readonly grid: Grid;
  /** The time on the clock, in whole seconds. */
  readonly seconds: number;
  /** The square selected. */
  readonly selected: number;
  /** Whether a digit adds or takes away a note rather than placing it. */
  readonly notesMode: boolean;
  /** The hint showing, which is the one the grid gives, or null. */
  readonly hint: Hint | null;
  readonly settings: Settings;
  /** Whether the puzzle was being played again after it was solved. */
  readonly replay: boolean;
}

/**
 * Describes a reported game as it is packed: plain JSON, its grid as saved,
 * and only whether a hint showed, since the grid gives it again.
 */
export type ReportedValue = Omit<ReportedGame, "grid" | "hint"> & {
  readonly grid: SavedGrid;
  readonly hint: boolean;
};

/** Every part of a packed game, so a reader names one it doesn't know. */
const PARTS: Readonly<Record<keyof ReportedValue, true>> = {
  grid: true,
  seconds: true,
  selected: true,
  notesMode: true,
  hint: true,
  settings: true,
  replay: true,
};

/** Returns a reported game as its state is packed. */
export function reportedValue(game: ReportedGame): ReportedValue {
  return {
    grid: saveGrid(game.grid),
    seconds: game.seconds,
    selected: game.selected,
    notesMode: game.notesMode,
    hint: game.hint !== null,
    settings: game.settings,
    replay: game.replay,
  };
}

/**
 * Returns a reported game as a report takes it: summed up, packed, and
 * where it has moves to undo, shrunk by dropping the oldest first, which
 * leaves a grid `restoreGrid()` still takes.
 */
export function reportState(game: ReportedGame): ReportState {
  const value = reportedValue(game);
  const summary = reportSummary(game);
  const { history } = value.grid;
  if (history.length === 0) return { summary, value };
  return {
    summary,
    value,
    trim: {
      most: history.length,
      at: (kept) => ({
        value: {
          ...value,
          grid: {
            ...value.grid,
            history: history.slice(history.length - kept),
          },
        },
        note: `${kept} of ${count(history.length, "undo step", "undo steps")}`,
      }),
    },
  };
}

/**
 * Returns the game a reported state describes, its hint, where one showed,
 * worked out again from the grid.
 *
 * @throws Error naming the first part this build can't read: one cut short
 *   or edited, a grid the game couldn't have saved, a hint the grid doesn't
 *   give, or a part it doesn't know.
 */
export function readReportedGame(value: unknown): ReportedGame {
  if (!isRecord(value)) {
    throw new Error("This build can't read the game state.");
  }
  const grid = restoreGrid(value["grid"]);
  if (!grid) throw unreadable("grid");
  const { seconds, selected, notesMode, hint: shown, replay } = value;
  if (!isCount(seconds)) throw unreadable("seconds");
  if (!isCount(selected) || selected >= CELLS) throw unreadable("selected");
  if (typeof notesMode !== "boolean") throw unreadable("notesMode");
  if (typeof shown !== "boolean") throw unreadable("hint");
  const hint = shown ? hintFor(grid) : null;
  if (shown && !hint) throw unreadable("hint");
  const settings = settingsOf(value["settings"]);
  if (!settings) throw unreadable("settings");
  if (typeof replay !== "boolean") throw unreadable("replay");
  const unknown = unknownKey(value, PARTS);
  if (unknown !== null) {
    throw new Error(
      `The game state has a part this build doesn't know: ${unknown}.`,
    );
  }
  return { grid, seconds, selected, notesMode, hint, settings, replay };
}

/**
 * Returns a reported game in one line, for people: "In play · 12:34 · 30
 * blank squares · 2 hints · Notes on".
 */
export function reportSummary(game: ReportedGame): string {
  const { grid } = game;
  const blank = grid.digits.filter((digit) => digit === 0).length;
  return [
    grid.outcome === "solved" ? "Solved" : "In play",
    formatClock(game.seconds),
    count(blank, "blank square", "blank squares"),
    count(grid.hints, "hint", "hints"),
    ...(game.notesMode ? ["Notes on"] : []),
    ...(game.hint ? ["hint showing"] : []),
    ...(game.replay ? ["solved before"] : []),
  ].join(" · ");
}

/** Returns the error that names a part of the state this build can't read. */
function unreadable(part: string): Error {
  return new Error(`This build can't read ${part} in the game state.`);
}

/** Returns the settings a state holds, or null for any the game can't have. */
function settingsOf(value: unknown): Settings | null {
  if (!isRecord(value)) return null;
  const { level, markMistakes, clearNotes } = value;
  return isLevel(level) &&
    typeof markMistakes === "boolean" &&
    typeof clearNotes === "boolean"
    ? { level, markMistakes, clearNotes }
    : null;
}
