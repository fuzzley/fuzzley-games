// What the scripts under `tools/` take from the game, in types of their own.
// This module imports nothing, so `tsconfig.scripts.json`, which resolves
// modules as Node does, checks the scripts against it without reading the
// rules, which name their modules without extensions. The scripts' entry,
// `screenshot_api.ts`, is held to it in turn, so a name changed in the rules
// fails to compile there.

/** Describes a run the scripts keep for a page to take up: begun at a level on a field of a depth, and a round played for each shot. */
export interface ScriptRun {
  /** The level it began at, by its number. */
  readonly level: number;
  /** The field's depth as the level began, 11 to 22. */
  readonly depth: number;
  /** The aim of each round played, by its index, as a certificate keeps one. */
  readonly shots: readonly number[];
}

/** Describes a run as storage keeps it, so far as the scripts read it; the rest goes to storage as it is. */
export interface ScriptSavedGame {
  readonly score: number;
  /** Where the level's next round starts, so far as the scripts read it: the field row the wall's lowest row stands in. */
  readonly start: { readonly lowestRow: number } | null;
}

/** Holds what `tools/check-layout.mjs` takes from the game, through `tools/stored_run.mjs`: a run kept, and the version it is kept under. */
export interface ScreenshotApi {
  /** Returns a run as storage keeps it, for a page to take up. */
  readonly keptRun: (run: ScriptRun) => ScriptSavedGame;
  /** The version storage keeps a run under, which the page drops any other of. */
  readonly savedGameVersion: number;
}
