import { type Field, fieldFor } from "../rules/field/field";
import { addRock, hitRock } from "../rules/rocks/rocks";
import {
  type Run,
  catchUp,
  createRun,
  startWave,
  waveStart,
} from "../rules/run/run";
import { type SavedGame, saveGame } from "../rules/run/saved_game";
import { STILL } from "../rules/ship/ship";
import type { Speed } from "../rules/speed";
import { STEP_MS, stepsIn } from "../rules/stepper";
import type { Torus } from "../rules/torus";
import { waveToPlay } from "../rules/waves/endless";
import { type WaveEntry, waveEntryOf } from "../rules/waves/waves";
import { playField } from "./autopilot";

/** Describes a run begun at a wave, on a field of a shape. */
export interface RunBegun {
  /** The wave it began at, by its number. */
  readonly wave: number;
  readonly speed: Speed;
  readonly seed: number;
  /** The field's shape, as the board that takes the run up lays its fields out. */
  readonly torus: Torus;
}

/** Describes a run begun at a wave and played part way into it. */
export interface KeptRun extends RunBegun {
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
  const { run, field } = begin(waves, kept);
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
  return keep(played, field, waves);
}

/**
 * Returns a run as storage keeps it, for a page to take up, that clears its
 * wave as soon as it goes on, with nothing steered: begun at a wave, laid
 * out on a field of a shape and played a step, its rocks gone but one
 * volatile rock, broken a quarter of the way down the field, its fuse lit,
 * which a page takes up with the ship brought to wait where it is safest,
 * out of the blast's reach. Once the run goes on, the rock goes off and the
 * wave is cleared, as the layout check's Cleared card asks.
 *
 * It throws for a wave before the first, a field with no slot for the rock
 * and a run that keeps nothing.
 */
export function clearingRun(
  waves: readonly WaveEntry[],
  begun: RunBegun,
): SavedGame {
  const { run, field } = begin(waves, begun);
  playField(field, { untilStep: 1 });
  for (const rock of field.rocks) {
    rock.live = false;
    rock.goesOffAt = 0;
  }
  const { width, height } = field.torus;
  const fuse = addRock(field, "volatile", "medium", width / 2, height / 4, 0);
  if (!fuse) throw new Error("The field has no slot for a rock.");
  hitRock(field, fuse, 0, 0);
  return keep(catchUp(run, field), field, waves);
}

/**
 * Returns a run begun at a wave, and its field laid out on a shape, the
 * player holding nothing.
 *
 * @throws {RangeError} For a wave before the first.
 */
function begin(
  waves: readonly WaveEntry[],
  { wave, speed, seed, torus }: RunBegun,
): { run: Run; field: Field } {
  const entry = waveEntryOf(waves, wave);
  const run = startWave(createRun({ id: 1, seed, speed, wave }));
  const field = fieldFor(waveToPlay(entry, run.seed), {
    ...waveStart(run),
    torus,
    speed: run.speed,
    held: STILL,
  });
  return { run, field };
}

/** Returns a run and its field as storage keeps them, with no stray brought home drawn. */
function keep(run: Run, field: Field, waves: readonly WaveEntry[]): SavedGame {
  const saved = saveGame(run, field, waves, {
    broughtHome: [],
    tuned: false,
  });
  if (!saved) throw new Error("The run has nothing to keep.");
  return saved;
}
