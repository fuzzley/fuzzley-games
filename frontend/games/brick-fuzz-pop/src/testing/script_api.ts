// What the scripts under `tools/` take from the game, in types of their own.
// This module imports nothing, so `tsconfig.scripts.json`, which resolves
// modules as Node does, checks the scripts against it without reading the
// rules, which name their modules without extensions. Each script's entry,
// `certify_api.ts`, `report_api.ts` and `screenshot_api.ts`, is held to it
// in turn, so a name changed in the rules, the solver or the careless
// player fails to compile there.

/** Describes a level, so far as the scripts name it. */
export interface ScriptLevel {
  /** Its place in the game, from 1. */
  readonly number: number;
  readonly set: { readonly id: string; readonly name: string };
  readonly data: { readonly id: string; readonly name: string };
}

/** A shot of a line: an aim's number and a charge. */
export type ScriptShot = readonly [aim: number, charge: number];

/** Says how widely the solver searched for a line: every aim, or every fourth, and how many walls it kept each round. */
export interface ScriptSearch {
  readonly aimStep: number;
  readonly beam: number;
}

/** Describes a line the solver found to clear a level: its shots, a round each, and how widely it searched for them. */
export interface SolvedLine {
  readonly line: readonly ScriptShot[];
  readonly search: ScriptSearch;
}

/** Holds what `tools/certify-levels.mjs` plays: the levels, the depths and the solver. */
export interface CertifyApi {
  /** Every level, in the order played. */
  readonly levels: readonly ScriptLevel[];
  /** Every depth a field has, shallowest first. */
  readonly depths: readonly number[];
  /** Returns a line that clears a level, by its number, on a field of a depth, or null where the solver finds none. */
  readonly solve: (level: number, depth: number) => SolvedLine | null;
  /** Returns par on a depth from the rounds of the level's certificate there. */
  readonly parFrom: (rounds: number) => number;
}

/** Says how a game of the careless player's went, so far as the report reads it. */
export interface CasualPlay {
  readonly cleared: boolean;
  /** The rounds it played. */
  readonly rounds: number;
  /** How many of them the wall jumped. */
  readonly jumps: number;
}

/** Holds what `tools/report-levels.mjs` plays: the levels, the depths, the floors and the careless player. */
export interface ReportApi {
  /** Every level, in the order played. */
  readonly levels: readonly ScriptLevel[];
  /** Every depth a field has, shallowest first. */
  readonly depths: readonly number[];
  /** How many times in 100 the careless player must clear each level of a set, by the set's id. */
  readonly floors: Readonly<Record<string, number>>;
  /** Plays a level, by its number, on a field of a depth, as the careless player does from a seed. */
  readonly playCasually: (
    level: number,
    depth: number,
    seed: number,
  ) => CasualPlay;
}

/** Describes a run the scripts keep for a page to take up: begun at a level on a field of a depth, and a round played for each shot. */
export interface ScriptRun {
  /** The level it began at, by its number. */
  readonly level: number;
  /** The field's depth as the level began, 11 to 22. */
  readonly depth: number;
  /** The shot of each round played, as a certificate keeps one. */
  readonly shots: readonly ScriptShot[];
}

/** Describes a run as storage keeps it, so far as the scripts read it; the rest goes to storage as it is. */
export interface ScriptSavedGame {
  readonly score: number;
  /** Where the level's next round starts, so far as the scripts read it: the field row the wall's lowest row stands in. */
  readonly start: { readonly lowestRow: number } | null;
}

/** Holds what `tools/capture-screenshots.mjs` and `tools/check-layout.mjs` take from the game: a run kept, and how the page says it. */
export interface ScreenshotApi {
  /** Returns a run as storage keeps it, for a page to take up. */
  readonly keptRun: (run: ScriptRun) => ScriptSavedGame;
  /** Returns points as the game writes them, grouped in thousands. */
  readonly formatPoints: (points: number) => string;
  /** Returns what the game says as the keys aim a shot at some degrees with some charge: "55 degrees, charge 3". */
  readonly shotWords: (degrees: number, charge: number) => string;
  /** The version storage keeps a run under, which the page drops any other of. */
  readonly savedGameVersion: number;
}
