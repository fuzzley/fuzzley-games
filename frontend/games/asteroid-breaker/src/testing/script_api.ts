// What the scripts under `tools/` take from the game, in types of their own.
// This module imports nothing, so `tsconfig.scripts.json`, which resolves
// modules as Node does, checks the scripts against it without reading the
// rules, which name their modules without extensions. Each script's entry,
// `report_api.ts` and `screenshot_api.ts`, is held to it in turn, so a name
// changed in the rules or the autopilot fails to compile there.

/** A speed a run is played at, as the rules name it. */
export type ScriptSpeed = "relaxed" | "normal" | "fast";

/** A field the report plays on, as `--field` names it. */
export type FieldName = "narrow" | "wide" | "tall";

/** Describes a field's shape, in units. */
export interface FieldShape {
  readonly width: number;
  readonly height: number;
}

/** Describes a wave, so far as the report names it. */
export interface ReportedWave {
  /** Its place in the game, from 1. */
  readonly number: number;
  readonly data: { readonly name: string };
}

/** Says how the autopilot plays a wave for the report. */
export interface ReportPlay {
  readonly seed: number;
  readonly torus: FieldShape;
  /** Whether nothing can take its ship, so how long a wave takes is told apart from what it costs. */
  readonly invulnerable: boolean;
}

/** Says how the autopilot's play of a wave went, so far as the report reads it. */
export interface WavePlayed {
  /** Whether it cleared the wave within its time, its run not over. */
  readonly cleared: boolean;
  /** The steps the wave ran. */
  readonly steps: number;
  /** The steps its tail ran, from its last few rocks to its clearing; 0 for a wave it didn't clear. */
  readonly tailSteps: number;
  /** The crew its hits knocked loose. */
  readonly knocked: number;
  /** The crew knocked loose that floated home, out of the run, while the run went on. */
  readonly floated: number;
  /** The most static the pilot held at any step, rounded down to a whole number. */
  readonly mostStatic: number;
  /** The strays the wave sent across the field, a lone pilot's lifeline not among them. */
  readonly straysSent: number;
  /** The strays it brought home, a lifeline among them. */
  readonly straysHome: number;
  /** The burrs the wave sent across the field. */
  readonly burrsSent: number;
  /** The burrs that clung to its ship. */
  readonly burrsClung: number;
}

/** Holds what `tools/report-waves.mjs` plays: the waves, the speeds, the fields and the autopilot. */
export interface ReportApi {
  /** Every written wave, in the order played. */
  readonly waves: readonly ReportedWave[];
  /** Endless's waves the autopilot's spec plays. */
  readonly endless: readonly ReportedWave[];
  /** The speeds, slowest first. */
  readonly speeds: readonly ScriptSpeed[];
  /** The game time a step takes, in seconds. */
  readonly stepSeconds: number;
  /** The most steps the autopilot plays a wave. */
  readonly limit: number;
  /** The fields it plays on, by the name `--field` gives each. */
  readonly fields: Readonly<Record<FieldName, FieldShape>>;
  /** Plays a wave, by its number, Endless's among them, as the autopilot's spec does. */
  readonly playWave: (
    wave: number,
    speed: ScriptSpeed,
    play: ReportPlay,
  ) => WavePlayed;
}

/** Describes a run begun at a wave, on a field of a shape. */
export interface RunBegun {
  /** The wave it began at, by its number. */
  readonly wave: number;
  readonly speed: ScriptSpeed;
  readonly seed: number;
  /** The field's shape, as the page's board lays its fields out, or one the page fits to its own. */
  readonly torus: FieldShape;
}

/** Describes the run the screenshots show: begun at a wave and played until its first stray is near. */
export interface ScreenshotRun extends RunBegun {
  /** How soon the wave's first stray drifts in, in milliseconds, the wave played until then. */
  readonly strayInMs: number;
}

/** Describes a run as storage keeps it, so far as the screenshots read it; the rest goes to storage as it is. */
export interface KeptGame {
  readonly score: number;
}

/** Holds what `tools/capture-screenshots.mjs` and `tools/check-layout.mjs` take from the game. */
export interface ScreenshotApi {
  /** Returns the run as storage keeps it, for the page to take up. */
  readonly keptRun: (run: ScreenshotRun) => KeptGame;
  /** Returns a run as storage keeps it that clears its wave as soon as the page goes on with it. */
  readonly clearingRun: (run: RunBegun) => KeptGame;
  /** Returns points as the game writes them, grouped in thousands. */
  readonly formatPoints: (points: number) => string;
  /** How long a ship is guarded once it first moves, which blinks it, in milliseconds. */
  readonly newShipGuardMs: number;
  /** The version storage keeps the run under, which the page drops any other of. */
  readonly savedGameVersion: number;
}
