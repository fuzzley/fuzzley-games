import { waveToPlay } from "../rules/endless";
import { fieldFor } from "../rules/field";
import { catchUp, createRun, startWave, waveStart } from "../rules/run";
import { type SavedGame, saveGame } from "../rules/saved_game";
import { STILL } from "../rules/ship";
import type { Speed } from "../rules/speed";
import { STEP_MS, stepsIn } from "../rules/stepper";
import type { Torus } from "../rules/torus";
import { type WaveEntry, waveEntryOf } from "../rules/waves";
import { playField } from "./autopilot";

/** Describes a run begun at a wave and played part way into it. */
export interface KeptRun {
  /** The wave it began at, by its number. */
  readonly wave: number;
  readonly speed: Speed;
  readonly seed: number;
  /** The field's shape, as the board that takes the run up lays its fields out. */
  readonly torus: Torus;
  /** How soon the wave's first stray drifts in, in milliseconds, the wave played until then. */
  readonly strayInMs: number;
}

/**
 * Returns a run as storage keeps it, for a page to take up: begun at a
 * wave, laid out on a field of a shape, and played by the autopilot until
 * its first stray is as near as it names.
 *
 * It throws for a wave before the first, one that sends no stray, a stray
 * nearer than a step or no nearer than the wave's start, and a wave the
 * autopilot clears, loses or runs out of time on before then.
 */
export function keptRun(waves: readonly WaveEntry[], kept: KeptRun): SavedGame {
  const entry = waveEntryOf(waves, kept.wave);
  const run = startWave(
    createRun({
      id: 1,
      seed: kept.seed,
      speed: kept.speed,
      wave: kept.wave,
    }),
  );
  const field = fieldFor(waveToPlay(entry, run.seed), {
    ...waveStart(run),
    torus: kept.torus,
    speed: run.speed,
    held: STILL,
  });
  if (field.setup.strays === 0) {
    throw new Error(`Wave ${String(kept.wave)} sends no stray.`);
  }
  const strayIn = stepsIn(kept.strayInMs);
  if (strayIn < 1 || strayIn >= field.strays.nextAt) {
    const firstMs = Math.round(field.strays.nextAt * STEP_MS);
    throw new RangeError(
      `Wave ${String(kept.wave)}'s first stray comes ${String(firstMs)} ms in, so a run can't be kept ${String(kept.strayInMs)} ms before it.`,
    );
  }
  const untilStep = field.strays.nextAt - strayIn;
  playField(field, { untilStep });
  const played = catchUp(run, field);
  if (field.steps < untilStep || played.outcome !== "playing") {
    throw new Error(
      `The autopilot stopped short of wave ${String(kept.wave)}'s first stray.`,
    );
  }
  const saved = saveGame(played, field, waves, {
    broughtHome: [],
    tuned: false,
  });
  if (!saved) throw new Error("The run has nothing to keep.");
  return saved;
}
