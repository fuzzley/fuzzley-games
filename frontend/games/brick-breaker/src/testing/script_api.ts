// What `tools/capture-screenshots.mjs` takes from the game, in types of its
// own; the report keeps typedefs of its own. This module imports nothing, so
// `tsconfig.scripts.json`, which resolves modules as Node does, checks the
// script against it without reading the rules, which name their modules
// without extensions. The screenshots' entry, `screenshot_api.ts`, is held to
// it in turn, so a name changed in the rules fails to compile there.

/** A speed a run is played at, as the rules name the presets. */
export type ScriptSpeed = "relaxed" | "normal" | "fast";

/** A brick's place in a level's grid, from 0: its row, then its column. */
export type BrickPlace = readonly [row: number, column: number];

/** Describes the run the screenshots show: begun at a level and played part way into it. */
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
}

/** Describes a run as storage keeps it, so far as the screenshots read it; the rest goes to storage as it is. */
export interface KeptGame {
  readonly score: number;
}

/** Holds what `tools/capture-screenshots.mjs` takes from the game. */
export interface ScreenshotApi {
  /** Returns the run as storage keeps it, for the page to take up. */
  readonly keptRun: (run: ScreenshotRun) => KeptGame;
  /** Returns points as the game writes them, grouped in thousands. */
  readonly formatPoints: (points: number) => string;
  /** The version storage keeps the run under, which the page drops any other of. */
  readonly savedGameVersion: number;
}
