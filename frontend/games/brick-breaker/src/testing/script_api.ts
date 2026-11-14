// What the screenshots' and the layout check's scripts take from the game,
// through `tools/stored_run.mjs`, in types of their own; the report keeps
// typedefs of its own. This module imports nothing, so
// `tsconfig.scripts.json`, which resolves modules as Node does, checks the
// script against it without reading the rules, which name their modules
// without extensions. The screenshots' entry, `screenshot_api.ts`, is held to
// it in turn, so a name changed in the rules fails to compile there.

/** A speed a run is played at, as the rules name the presets. */
export type ScriptSpeed = "relaxed" | "normal" | "fast";

/** A brick's place in a level's grid, from 0: its row, then its column. */
export type BrickPlace = readonly [row: number, column: number];

/** Describes a run a script keeps for a page to take up: begun at a level and played part way into it. */
export interface ScreenshotRun {
  /** The level it began at, by its number. */
  readonly level: number;
  readonly speed: ScriptSpeed;
  readonly seed: number;
  /** How long the level has been played, in milliseconds. */
  readonly playedMs: number;
  /** The bricks broken. */
  readonly broken: readonly BrickPlace[];
  /** The bricks hit once without breaking. */
  readonly worn: readonly BrickPlace[];
  /** How many times over the bricks pay as they are hit, 1 unless given, 2 as under a dare. */
  readonly pay?: number;
}

/** Describes a run as storage keeps it, so far as the screenshots read it; the rest goes to storage as it is. */
export interface KeptGame {
  readonly score: number;
}

/** Holds what the scripts take from the game. */
export interface ScreenshotApi {
  /** Returns the run as storage keeps it, for the page to take up. */
  readonly keptRun: (run: ScreenshotRun) => KeptGame;
  /** Returns points as the game writes them, grouped in thousands. */
  readonly formatPoints: (points: number) => string;
  /** The version storage keeps the run under, which the page drops any other of. */
  readonly savedGameVersion: number;
}
