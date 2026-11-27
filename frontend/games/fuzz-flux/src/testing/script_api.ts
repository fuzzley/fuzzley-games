// What the scripts under `tools/` take from the game, in types of their own.
// This module imports nothing, so `tsconfig.scripts.json`, which resolves
// modules as Node does, checks the scripts against it without reading the
// rules, which name their modules without extensions. The scripts' entry,
// `screenshot_api.ts`, is held to it in turn, so a name changed in the rules
// fails to compile there.

/** Describes a move as the scripts keep it: the square picked up and the neighbor it is swapped with, in the screen's frame. */
export type ScriptMove = readonly [from: number, to: number];

/** Describes a level in play the scripts keep for a page to take up: its level, the deal it is played on, and the moves made on it. */
export interface ScriptRun {
  /** The level, by its number. */
  readonly level: number;
  /** The deal it is played on, by its seed, one of the level's own. */
  readonly deal: number;
  /** Each move made on it, in the order made. */
  readonly moves: readonly ScriptMove[];
}

/** Holds what `tools/check-layout.mjs` takes from the game: a level in play kept, and the version it is kept under. */
export interface ScreenshotApi {
  /** Returns a level in play as storage keeps it, for a page to take up. */
  readonly keptRun: (run: ScriptRun) => object;
  /** The version storage keeps a level in play under, which the page drops any other of. */
  readonly savedGameVersion: number;
}
