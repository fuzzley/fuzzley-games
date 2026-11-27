// A wave of a move laid out in time, a little quicker each wave after the
// move's first: its bunches huddle and hop off, the board cheers at a
// wave that does, its blasts go off and strike, each hit lands, then,
// after a moment's wait, the board falls, each sleepyhead it brings to a
// bed is carried off to it, and the next wave waits for the last to land
// and a gap for each sleepyhead put to bed.

import type { Wind } from "../../rules/board/board";
import type { Wave } from "../../rules/move/record";
import type { GridShown } from "../run_state";
import { blastsOf } from "./blasts";
import { afterWave } from "./board_after";
import type { Draft } from "./draft";
import { bunchOf } from "./events/bunch";
import { waveCheerOf } from "./events/cheer";
import { fallsOf } from "./events/fall";
import { beddedOf } from "./events/sleepyhead";
import type { FeelTuning } from "./feel";
import { hitsOf } from "./hits";
import { quickeningOf } from "./pace";
import { reachesOf } from "./reach";
import type { WavePlay } from "./wave_play";

/** Describes a wave played: when the board may go on, and how the wave leaves it. */
export interface WavePlayed {
  readonly endMs: number;
  readonly grid: GridShown;
}

/**
 * Adds the parts of a wave, from a moment, on the board as it starts, to a
 * move's draft, and returns when the board may go on and how the wave
 * leaves it.
 */
export function playWave(
  draft: Draft,
  wave: Wave,
  grid: GridShown,
  blows: Wind,
  startMs: number,
  feel: FeelTuning,
): WavePlayed {
  const quickening = quickeningOf(wave.number, feel);
  const play: WavePlay = {
    wave,
    grid,
    blows,
    startMs,
    hopsMs:
      wave.bunches.length > 0 ? startMs + feel.huddleMs * quickening : startMs,
    quickening,
    before: Math.max(0, wave.number - 1),
    feel,
    motion: draft.motion,
  };
  const reaches = reachesOf(wave, play.hopsMs, feel);
  draft.add(waveCheerOf(play));
  const letGoMs = Math.max(
    wave.bunches.reduce(
      (heldMs, bunch, order) =>
        Math.max(heldMs, draft.add(bunchOf(bunch, order, play))),
      startMs,
    ),
    draft.add(blastsOf(play, reaches)),
    draft.add(hitsOf(play, reaches)),
  );
  const fallMs = letGoMs + feel.fallWaitMs * quickening;
  const landedMs = draft.add(fallsOf(play, fallMs));
  const restMs = Math.max(
    landedMs,
    draft.add(beddedOf(play, fallMs, landedMs)),
  );
  return {
    endMs:
      restMs === -Infinity
        ? letGoMs + feel.restWithoutFallMs
        : restMs + feel.waveGapMs * quickening,
    grid: afterWave(grid, wave),
  };
}
