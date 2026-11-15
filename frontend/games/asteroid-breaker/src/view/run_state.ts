import type { FuzzballFace } from "@fz/style/fuzzball";
import type { WaveTally } from "../rules/field/scoring";
import type { Run } from "../rules/run/run";
import type { Pilot } from "../rules/ship/pilots";
import { TUNED_SPARKING, multiplierOf, stepOf } from "../rules/sparks/charge";
import type { FrameChange } from "./run_frames";
import { TALLY_COUNT_MS } from "./tally";

/**
 * Holds what is a run's own, which each run begins afresh, so nothing of
 * one reaches the next: the run, how it was flown, static, the face and the
 * fur of the pilot at the controls and the cards over its wave in play, and
 * what it set.
 */
export interface RunState {
  readonly run: Run;
  /**
   * Whether it has been flown on numbers the debug menu tuned, its field
   * stepped with them, which keeps no records: the player's own, set at a
   * feel of their own.
   */
  readonly tuned: boolean;
  /** How many times what is scored scores, by static's step on the wave in play. */
  readonly multiplier: number;
  /** Static's step on the wave in play, from 0 at ×1 to full. */
  readonly step: number;
  /** The face the pilot at the controls shows, as its field shows it. */
  readonly face: FuzzballFace;
  /** How far the pilot's fur is lifted, as its field shows it: static's multiplier less one, from 0 at ×1. */
  readonly lift: number;
  /** How the last wave cleared added up, for its card, or null until one is. */
  readonly tally: WaveTally | null;
  /** Whether the card over a cleared wave is showing. */
  readonly clearedOpen: boolean;
  /**
   * How far that card's sum has counted up since it opened, in
   * milliseconds, to `TALLY_COUNT_MS`.
   */
  readonly tallyMs: number;
  /** Whether its end set a new best score at its speed. */
  readonly newBest: boolean;
  /** Whether it has cleared every written wave, from the first, as the records keep it. */
  readonly clearedAll: boolean;
  /** The pilots of the strays it has brought home, in the order they came. */
  readonly broughtHome: readonly Pilot[];
  /** Whether the card over its end is showing. */
  readonly resultOpen: boolean;
  /** Whether the card over its end has been put away. */
  readonly resultClosed: boolean;
}

/**
 * Returns what is a run's own as it begins: its static, as the run carries
 * it or at a level its field is taken up with, its pilot at rest, its fur
 * flat, until its field's first frame, and none of its cards or its marks
 * yet.
 */
export function newRunState(run: Run, level = run.charge): RunState {
  return {
    run,
    tuned: false,
    multiplier: multiplierOf(level),
    step: stepOf(level, TUNED_SPARKING),
    face: "rest",
    lift: 0,
    tally: null,
    clearedOpen: false,
    tallyMs: 0,
    newBest: false,
    clearedAll: false,
    broughtHome: [],
    resultOpen: false,
    resultClosed: false,
  };
}

/**
 * Returns a run's state with what a frame came to taken in: the run it
 * changed, whether it was flown on tuned numbers, the strays it brought
 * home, static's multiplier and step, the pilot's face and its fur, a
 * cleared wave's tally, the card it opens and how far the Cleared card's
 * sum counts up; or the same state for a frame that changed none of them,
 * so a frame of play makes nothing.
 *
 * A run is flown on tuned numbers from the first frame that moves its field
 * while they are `retuned`, off `tuning.ts`'s, and stays so, though they are
 * put back.
 */
export function withFrame(
  state: RunState,
  change: FrameChange,
  retuned: boolean,
): RunState {
  const tuned = state.tuned || (change.moved && retuned);
  const multiplier = change.multiplier ?? state.multiplier;
  const step = change.step ?? state.step;
  const { cameHome, face, lift, tally, opens } = change;
  const clearedOpen = state.clearedOpen || opens === "cleared";
  const tallyMs = clearedOpen
    ? Math.min(TALLY_COUNT_MS, state.tallyMs + change.countMs)
    : state.tallyMs;
  if (
    change.run === null &&
    tuned === state.tuned &&
    multiplier === state.multiplier &&
    step === state.step &&
    face === state.face &&
    lift === state.lift &&
    cameHome.length === 0 &&
    tally === null &&
    opens === null &&
    tallyMs === state.tallyMs
  ) {
    return state;
  }
  return {
    ...state,
    run: change.run ?? state.run,
    tuned,
    multiplier,
    step,
    face,
    lift,
    tally: tally ?? state.tally,
    broughtHome:
      cameHome.length > 0
        ? [...state.broughtHome, ...cameHome]
        : state.broughtHome,
    clearedOpen,
    tallyMs,
    resultOpen: state.resultOpen || opens === "result",
  };
}
