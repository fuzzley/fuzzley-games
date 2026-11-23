// The view's two records of play: what the shell shows of a run beside its
// field, a value each change replaces whole, and what the scene draws of a
// round at a moment, one record reused frame after frame.

import type { EventLogView, NumberedEvent } from "@fz/core/event_log";
import type { Wall } from "../rules/catalog/kinds";
import type {
  EarnedBy,
  FlightEvent,
  Round,
  RoundStart,
} from "../rules/flight/events";
import type { Fur } from "./art/frames";

/** Names where a round stands: aimed, its flight played back, or the wall settling after it. */
export type RoundPhase = "aiming" | "flying" | "settling";

/** Names the card over a level's end: Cleared, or the result of one lost. */
export type Card = "cleared" | "result";

/** Describes what the round in play's flight has played back so far, as the bar and the panel count it. */
export interface FlightSoFar {
  /** Its rally so far. */
  readonly rally: number;
  /** The floor bounces it holds, a hot shot's own among them, as the panel's springs show. */
  readonly held: number;
  /** Its turns so far. */
  readonly turns: number;
  /** The points its strikes and the floor bounces it kept have scored so far. */
  readonly points: number;
}

/**
 * Describes something a level's rounds came to that the announcer says: a
 * floor bounce earned, as its flight reaches it ("Rally 10: a floor
 * bounce"), the "Rickashay!" call, as a flight reaches the level's rally
 * mark, which the shell also shows over the field, and a round's end, as
 * its wall comes to rest.
 */
export type RoundNews =
  | {
      readonly kind: "earned";
      readonly by: EarnedBy;
      /** The flight's rally as it earned it. */
      readonly rally: number;
      /** Whether it was kept, or lost to the most held. */
      readonly kept: boolean;
    }
  | { readonly kind: "called" }
  | {
      readonly kind: "ended";
      readonly round: Round;
    };

/**
 * Holds what the shell shows of a run beside its field, a value each change
 * replaces: the run, the round aimed or in play, where it stands and what
 * its flight has played back so far, the card over the level's end, the
 * news not yet said, and whether its end set a new best.
 *
 * A frame that changes none of them leaves it as it is, so a frame of play
 * makes nothing. `R` is the run, the rules' record of the game on the board.
 */
export interface RunState<R> {
  /** The run on the board. */
  readonly run: R;
  /** Where the round aimed, or in play, started. */
  readonly start: RoundStart;
  /** The round in play once it is released, until the next is aimed; else null. */
  readonly round: Round | null;
  readonly phase: RoundPhase;
  /** What the round in play's flight has played back so far, or, while it is aimed, what it leaves with. */
  readonly soFar: FlightSoFar;
  /** The card over the level's end, once its wait has run out; else null. */
  readonly card: Card | null;
  /** Whether the card over the run's end has been put away, leaving the board to look at. */
  readonly resultClosed: boolean;
  /** What the rounds came to that the announcer hasn't said yet, in order. */
  readonly news: readonly RoundNews[];
  /** Whether the run's end set a new best score, as the records said as they kept it. */
  readonly newBest: boolean;
}

/** Describes what a level's play holds, as the run's state takes it in. */
export interface PlayState {
  readonly start: RoundStart;
  readonly round: Round | null;
  readonly phase: RoundPhase;
  readonly soFar: FlightSoFar;
}

/** Describes what a frame of a level's play came to, as it is handed on for the run's state to take in. */
export interface RoundChange {
  /** What the frame came to that the announcer says, in order. */
  readonly news: readonly RoundNews[];
  /** The card whose wait the frame ran out, after a round that cleared or lost the level; else null. */
  readonly opens: Card | null;
}

/**
 * Returns the state of a run as it begins, or is taken up, its play as it
 * stands, with nothing to say and no card.
 */
export function newRunState<R>(run: R, play: PlayState): RunState<R> {
  return {
    run,
    ...play,
    card: null,
    resultClosed: false,
    news: [],
    newBest: false,
  };
}

/**
 * Returns a run's state with a frame of its play taken in: the round
 * aimed or in play, where it stands and what its flight has played back so
 * far, the card the frame opened, and its news added to what is still to
 * say; or the same state for a frame that changed none of them.
 */
export function withFrame<R>(
  state: RunState<R>,
  play: PlayState,
  change: RoundChange,
): RunState<R> {
  const { start, round, phase } = play;
  const soFar = sameSoFar(play.soFar, state.soFar) ? state.soFar : play.soFar;
  const { news, opens } = change;
  if (
    start === state.start &&
    round === state.round &&
    phase === state.phase &&
    soFar === state.soFar &&
    opens === null &&
    news.length === 0
  ) {
    return state;
  }
  return {
    ...state,
    start,
    round,
    phase,
    soFar,
    card: opens ?? state.card,
    news: news.length === 0 ? state.news : [...state.news, ...news],
  };
}

/** Returns a run's state with its news said, or the same state when there was none. */
export function withNewsSaid<R>(state: RunState<R>): RunState<R> {
  return state.news.length === 0 ? state : { ...state, news: [] };
}

/** Returns whether two counts of a flight played back so far say the same. */
function sameSoFar(a: FlightSoFar, b: FlightSoFar): boolean {
  return (
    a.rally === b.rally &&
    a.held === b.held &&
    a.turns === b.turns &&
    a.points === b.points
  );
}

/** Describes the fuzzball as the scene draws it at a moment. */
export interface BallView {
  /** Where its middle is, in field units. */
  readonly x: number;
  readonly y: number;
  /** Which way it flies, which its eyes look: its speeds across and up, none while it waits or drops home. */
  readonly dx: number;
  readonly dy: number;
  /** Its flight's rally so far, the number beside it. */
  readonly rally: number;
  /** How far its fur has lifted. */
  readonly fur: Fur;
  /** Whether it is a hot shot. */
  readonly hot: boolean;
  /** Whether it has yawned, bored, or been brought home by a guard, and drops to the floor. */
  readonly home: boolean;
}

/** Describes a round in play as the scene draws it at a moment, one record reused frame after frame. */
export interface RoundView {
  /** The fuzzball, waiting or in the air. */
  readonly ball: BallView;
  /**
   * The wall as it looks at this moment, another wall each time it changes,
   * so a frame that hands on the same wall changed nothing.
   *
   * A wall handed on before the last may be written over as a flight goes
   * on, so a reader reads the view after every frame played and compares
   * its wall only with the one it read the frame before.
   */
  readonly wall: Wall;
  /** How far through the wall's step or jump it is, 0 to 1 through its ease: 1 while the wall stands still. */
  readonly wallDrop: number;
  /** How many rows the wall's step or jump brings it down, which it is drawn `rowsDown × (1 − wallDrop)` rows over its place by: 0 but while the wall settles. */
  readonly rowsDown: number;
  /** The floor bounces the fuzzball holds, the springs lit in the floor's band. */
  readonly held: number;
  /** The holds the hatches have left between them, the dots on their bars: none once they open. */
  readonly holdsLeft: number;
  /** The bolts drawn so far, each lock's slots that many emptied. */
  readonly boltsDrawn: number;
  /**
   * The flight's events as playback reaches them, numbered from 1 in order,
   * the numbers running on from one round to the next, level after level:
   * those since the last frame give the flourishes and the sounds.
   */
  readonly events: EventLogView<LoggedEvent>;
  /** The round's moments beyond its flight's events, as it reaches them. */
  readonly beats: EventLogView<LoggedBeat>;
}

/**
 * Describes an event of the round in play as the view's log keeps it: the
 * flight's own event, numbered, so the writer fills a record of the log's
 * ring by pointing it at the next event.
 */
export interface LoggedEvent extends NumberedEvent {
  event: FlightEvent;
}

/** Every moment of a round beyond its flight's events: the wall's step or its jump, the danger line, and the level cleared or lost. */
export const BEATS = [
  "step",
  "jump",
  "danger",
  "cleared",
  "lost",
] as const satisfies readonly string[];

/** A moment of a round beyond its flight's events, such as "jump". */
export type Beat = (typeof BEATS)[number];

/** Describes a moment of a round beyond its flight's events, numbered, as the view's log keeps it. */
export interface LoggedBeat extends NumberedEvent {
  beat: Beat;
}
