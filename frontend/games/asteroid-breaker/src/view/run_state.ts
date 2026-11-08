import type { WaveTally } from "../rules/field/scoring";
import type { Run } from "../rules/run/run";
import type { Pilot } from "../rules/ship/pilots";
import type { FrameChange } from "./run_frames";

/**
 * Holds what is a run's own, which each run begins afresh, so nothing of
 * one reaches the next: the run, how it was flown, the chain and the cards
 * over its wave in play, and what it set.
 */
export interface RunState {
  readonly run: Run;
  /**
   * Whether it has been flown on numbers the debug menu tuned, its field
   * stepped with them, which keeps no records: the player's own, set at a
   * feel of their own.
   */
  readonly tuned: boolean;
  /** How many times a break scores, by the chain the wave in play counts. */
  readonly chain: number;
  /** How the last wave cleared added up, for its card, or null until one is. */
  readonly tally: WaveTally | null;
  /** Whether the card over a cleared wave is showing. */
  readonly clearedOpen: boolean;
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

/** Returns what is a run's own as it begins: none of its chain, its cards or its marks yet. */
export function newRunState(run: Run): RunState {
  return {
    run,
    tuned: false,
    chain: 1,
    tally: null,
    clearedOpen: false,
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
 * home, the chain, a cleared wave's tally and the card it opens; or the
 * same state for a frame that changed none of them, so a frame of play
 * makes nothing.
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
  const chain = change.chain ?? state.chain;
  const { cameHome, tally, opens } = change;
  if (
    change.run === null &&
    tuned === state.tuned &&
    chain === state.chain &&
    cameHome.length === 0 &&
    tally === null &&
    opens === null
  ) {
    return state;
  }
  return {
    ...state,
    run: change.run ?? state.run,
    tuned,
    chain,
    tally: tally ?? state.tally,
    broughtHome:
      cameHome.length > 0
        ? [...state.broughtHome, ...cameHome]
        : state.broughtHome,
    clearedOpen: state.clearedOpen || opens === "cleared",
    resultOpen: state.resultOpen || opens === "result",
  };
}
