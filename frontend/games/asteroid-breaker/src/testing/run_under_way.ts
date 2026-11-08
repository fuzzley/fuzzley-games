import {
  type Field,
  type WaveSetup,
  fieldFor,
  steerField,
} from "../rules/field/field";
import { type Run, createRun, waveStart } from "../rules/run/run";
import { STILL } from "../rules/ship/ship";
import type { Torus } from "../rules/torus";
import { waveToPlay } from "../rules/waves/endless";
import { type Wave, WAVES, waveEntryOf } from "../rules/waves/waves";
import { stepTimes } from "./field_picture";

/** The field's size a run under way's waves are laid out at. */
export const UNDER_WAY_TORUS: Torus = { width: 72, height: 40 };

/** The wave a run under way is on: the third, "Adrift". */
export const UNDER_WAY_WAVE = 3;

/** What a run under way in Endless changes: its tenth wave, begun at the first. */
export const IN_ENDLESS: Partial<Run> = { firstWave: 31, wave: 40 };

/**
 * What spoils a run or a field storage kept: what it is, and the values it
 * changes, as a browser might come to hold them.
 */
export type Spoil<T = Readonly<Record<string, unknown>>> = readonly [string, T];

/**
 * Returns a run under way on its third wave at Fast, begun at the second,
 * with 500 points banked and 300 scored on the wave, two strays banked,
 * two ships flying and a stray at home, changed as a spec says.
 */
export function runUnderWay(change: Partial<Run> = {}): Run {
  return {
    ...createRun({ id: 4, seed: 7, speed: "fast", wave: UNDER_WAY_WAVE }),
    firstWave: 2,
    banked: 500,
    score: 800,
    straysBanked: 2,
    strays: 2,
    crew: { flying: [3, 0], home: [6], lastGiven: 6 },
    outcome: "playing",
    ...change,
  };
}

/** Returns a run's wave, ready to play: an Endless one made from the run's seed. */
export function waveOf(run: Run): Wave {
  return waveToPlay(waveEntryOf(WAVES, run.wave), run.seed);
}

/**
 * Returns how a run's wave is set up but for its size: as the run starts
 * it, at the run's speed, with nothing held.
 */
export function waveSetupOf(run: Run): Omit<WaveSetup, "torus"> {
  return { ...waveStart(run), speed: run.speed, held: STILL };
}

/** Returns the field of a run's wave as the game lays it out, on a size. */
export function laidOutField(run: Run, torus = UNDER_WAY_TORUS): Field {
  return fieldFor(waveOf(run), { ...waveSetupOf(run), torus });
}

/**
 * Returns a run's field, played a second, its ship turning from the first
 * step, as a wave holds still until the first move, its points the run's on
 * the wave, each a rock's, as the field would have scored them.
 */
export function playedField(run: Run): Field {
  const field = laidOutField(run);
  steerField(field, { ...STILL, turn: 1 });
  stepTimes(field, 120);
  field.score = run.score - run.banked;
  field.rockPoints = field.score;
  return field;
}
