// A wave of a move laid out in time: its bunches huddle and hop off, a
// little quicker each wave after the move's first.

import type { Wave } from "../../rules/move/record";
import type { GridShown } from "../run_state";
import type { Draft } from "./draft";
import { bunchOf } from "./events/bunch";
import type { FeelTuning } from "./feel";
import { quickeningOf } from "./pace";
import type { WavePlay } from "./wave_play";

/**
 * Adds the parts of a wave, from a moment, on the board as it starts, to a
 * move's draft, and returns when the board may go on.
 */
export function playWave(
  draft: Draft,
  wave: Wave,
  grid: GridShown,
  startMs: number,
  feel: FeelTuning,
): number {
  const quickening = quickeningOf(wave.number, feel);
  const play: WavePlay = {
    wave,
    grid,
    startMs,
    hopsMs:
      wave.bunches.length > 0 ? startMs + feel.huddleMs * quickening : startMs,
    quickening,
    before: Math.max(0, wave.number - 1),
    feel,
  };
  return wave.bunches.reduce(
    (heldMs, bunch, order) =>
      Math.max(heldMs, draft.add(bunchOf(bunch, order, play))),
    startMs,
  );
}
