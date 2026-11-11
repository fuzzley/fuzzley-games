// What the scripts under `tools/` take from the game, in types of their own.
// This module imports nothing, so `tsconfig.scripts.json`, which resolves
// modules as Node does, checks the scripts against it without reading the
// rules, which name their modules without extensions. Each script's entry,
// `certify_api.ts` and `report_api.ts`, is held to it in turn, so a name
// changed in the rules, the solver or the careless player fails to compile
// there.

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
