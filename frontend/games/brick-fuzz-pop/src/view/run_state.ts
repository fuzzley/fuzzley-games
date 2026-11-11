import type { Round, RoundStart } from "../rules/round/round";

/** Names where a round stands: aimed, its flight played back, or the wall settling after it. */
export type RoundPhase = "aiming" | "flying" | "settling";

/** Names the card over a level's end: Cleared, or the result of one lost. */
export type Card = "cleared" | "result";

/**
 * Describes something a level's rounds came to that the announcer says: a
 * friend freed, as its flight reaches it, and a round's end, as its wall
 * comes to rest, from which the words say what it broke, how the wall came
 * down or jumped, the boon it earned and the danger line.
 */
export type RoundNews =
  | {
      readonly kind: "freed";
      /** The friend's ink. */
      readonly ink: number;
    }
  | {
      readonly kind: "ended";
      readonly round: Round;
    };

/**
 * Holds what the shell shows of a level in play beside its field: the
 * round aimed or in play, where it stands, the card over the level's end,
 * and the news not yet said.
 *
 * A frame that changes none of them leaves it as it is, so a frame of play
 * makes nothing.
 */
export interface RunState {
  /** Where the round aimed, or in play, started. */
  readonly start: RoundStart;
  /** The round in play once it is released, until the next is aimed; else null. */
  readonly round: Round | null;
  readonly phase: RoundPhase;
  /** The card over the level's end, once its wait has run out; else null. */
  readonly card: Card | null;
  /** What the rounds came to that the announcer hasn't said yet, in order. */
  readonly news: readonly RoundNews[];
}

/** Describes what a level's play holds, as the run's state takes it in: what `RoundPlay` holds. */
export interface PlayState {
  readonly start: RoundStart;
  readonly round: Round | null;
  readonly phase: RoundPhase;
}

/** Describes what a frame of a level's play came to, as `RoundPlay` hands it on for the run's state to take in. */
export interface RoundChange {
  /** The inks of the friends the frame freed, in the order they were freed. */
  readonly freed: readonly number[];
  /** The round whose wall the frame brought to rest, after which the next may be aimed; else null. */
  readonly settled: Round | null;
  /** The card whose wait the frame ran out, after a round that cleared or lost the level; else null. */
  readonly opens: Card | null;
}

/** Returns the state of a level as it begins, its first round aimed from where it starts. */
export function newRunState(start: RoundStart): RunState {
  return { start, round: null, phase: "aiming", card: null, news: [] };
}

/**
 * Returns a level's state with a frame of its play taken in: the round
 * aimed or in play and where it stands, the card the frame opened, and the
 * friends it freed and the round it brought to rest added to the news; or
 * the same state for a frame that changed none of them.
 */
export function withFrame(
  state: RunState,
  play: PlayState,
  change: RoundChange,
): RunState {
  const { start, round, phase } = play;
  const { freed, settled, opens } = change;
  if (
    start === state.start &&
    round === state.round &&
    phase === state.phase &&
    opens === null &&
    freed.length === 0 &&
    settled === null
  ) {
    return state;
  }
  const news: RoundNews[] = [...state.news];
  for (const ink of freed) news.push({ kind: "freed", ink });
  if (settled !== null) news.push({ kind: "ended", round: settled });
  return {
    start,
    round,
    phase,
    card: opens ?? state.card,
    news: news.length === state.news.length ? state.news : news,
  };
}

/** Returns a level's state with its news said, or the same state when there was none. */
export function withNewsSaid(state: RunState): RunState {
  return state.news.length === 0 ? state : { ...state, news: [] };
}
