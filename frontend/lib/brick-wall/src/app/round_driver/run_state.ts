// What a wall game's shell shows of its run beside the field, as its driver
// holds it: one value each change replaces, so a frame that changes nothing
// makes nothing.

import type { Run } from "../../rules/run";
import type {
  FrameChange,
  LevelCard,
  PlayState,
  RoundPhase,
} from "../../view/rounds_played";

/**
 * Holds what a wall game's shell shows of a run beside its field, over what
 * the game tallies of a level, `T`, where a round starts, `N`, and a round
 * played, `D`, a value each change replaces: the run, the round aimed or in
 * play, where it stands and what its flight has scored so far, the card
 * over the level's end, the rounds come to rest not yet said, and whether
 * the run's end set a new best.
 */
export interface RunState<T, N, D> {
  /** The run on the board. */
  readonly run: Run<T>;
  /** Where the round aimed, or in play, started. */
  readonly start: N;
  /** The round in play once it is released, until the next is aimed; else null. */
  readonly round: D | null;
  readonly phase: RoundPhase;
  /** The points the round in play's flight has played back so far, which the bar counts as they play. */
  readonly scored: number;
  /** The card over the level's end, once its wait has run out; else null. */
  readonly card: LevelCard | null;
  /** Whether the card over the run's end has been put away, leaving the board to look at. */
  readonly resultClosed: boolean;
  /** The rounds whose walls came to rest that the announcer hasn't said yet, in order. */
  readonly news: readonly D[];
  /** Whether the run's end set a new best score, as the records said as they kept it. */
  readonly newBest: boolean;
}

/**
 * Returns the state of a run as it begins, or is taken up, its round aimed
 * from where it starts, with nothing to say and no card.
 */
export function newRunState<T, N, D>(run: Run<T>, start: N): RunState<T, N, D> {
  return {
    run,
    start,
    round: null,
    phase: "aiming",
    scored: 0,
    card: null,
    resultClosed: false,
    news: [],
    newBest: false,
  };
}

/**
 * Returns a run's state with a frame of its play taken in: the round aimed
 * or in play, where it stands and what its flight has scored so far, the
 * card the frame opened, and the round it brought to rest added to the
 * news; or the same state for a frame that changed none of them.
 */
export function withFrame<T, N, D>(
  state: RunState<T, N, D>,
  play: PlayState<N, D>,
  { settled, opens }: FrameChange<D>,
): RunState<T, N, D> {
  const { start, round, phase, scored } = play;
  if (
    start === state.start &&
    round === state.round &&
    phase === state.phase &&
    scored === state.scored &&
    opens === null &&
    settled === null
  ) {
    return state;
  }
  return {
    ...state,
    start,
    round,
    phase,
    scored,
    card: opens ?? state.card,
    news: settled === null ? state.news : [...state.news, settled],
  };
}

/** Returns a run's state with its news said, or the same state when there was none. */
export function withNewsSaid<T, N, D>(
  state: RunState<T, N, D>,
): RunState<T, N, D> {
  return state.news.length === 0 ? state : { ...state, news: [] };
}
