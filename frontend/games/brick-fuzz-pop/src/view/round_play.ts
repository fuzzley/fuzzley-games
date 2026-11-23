import { inDanger } from "@fz/brick-wall/rules/wall";
import {
  type DecidedRound,
  type Pace,
  type PlayedEvent,
  Playback,
  type PlaybackFrame,
  type PlaybackView,
} from "@fz/brick-wall/view/playback";
import type {
  FrameChange,
  RoundPhase,
  RoundsPlayed,
} from "@fz/brick-wall/view/rounds_played";
import { clearedDelayMs, resultDelayMs } from "@fz/brick-wall/view/timing";
import { Countdown } from "@fz/core/clock";
import {
  EventLog,
  type EventLogView,
  type NumberedEvent,
} from "@fz/core/event_log";
import type { BrickKindId } from "../rules/catalog/bricks";
import type { BallRole, FlightEvent } from "../rules/flight/events";
import type { Round, RoundResult, RoundStart } from "../rules/round/round";
import { MOST_CHARGE, ZAP_HITS } from "../rules/tuning";
import { type Brick, WALL_RULES } from "../rules/wall/wall";
import { type Beat, type EventEffects, FlightEffects } from "./effects/effects";

/** Names how fast a flight plays back, as the settings offer it. */
export type FlightSpeed = "normal" | "fast";

/** Describes how fast a flight plays back, the numbers the debug menu's sliders tune. */
export interface FlightPace {
  /** How far a flight plays back in a second, in field units, at each speed. */
  readonly unitsPerSecond: Readonly<Record<FlightSpeed, number>>;
  /** How many times faster a flight plays back while fast-forward is on. */
  readonly fastForward: number;
  /** How long a flight plays before it speeds up by itself, where the settings let long flights speed up. */
  readonly longFlightMs: number;
  /** How many times faster a long flight plays back once it has. */
  readonly longFlightSpeedUp: number;
}

/** The pace a flight plays back at, untuned. */
export const FLIGHT_PACE: FlightPace = {
  unitsPerSecond: { normal: 14, fast: 22 },
  fastForward: 4,
  longFlightMs: 8000,
  longFlightSpeedUp: 2,
};

/** How many beats the log keeps: far more than a frame's few. */
const BEATS_KEPT = 16;

/** Describes a fuzzball in the air, as the scene draws it. */
export interface BallView {
  readonly ball: number;
  readonly role: BallRole;
  /** Where its middle is, in field units. */
  readonly x: number;
  readonly y: number;
  readonly charge: number;
  readonly hot: boolean;
}

/**
 * Describes a round in play as the scene draws it at a moment, one record
 * reused frame after frame: its playback's fuzzballs, wall and events, and
 * its beats.
 */
export interface RoundView extends PlaybackView<
  BrickKindId,
  FlightEvent,
  BallView,
  EventEffects
> {
  /**
   * The round's moments beyond its flight's events, as it reaches them: the
   * wall's step or jump, the danger line, and the level cleared or lost.
   */
  readonly beats: EventLogView<LoggedBeat>;
}

/**
 * Describes an event of the round in play as the view's log keeps it: the
 * flight's own event, numbered, with what it calls for, as the flight read
 * in order says: nothing for an event skipped.
 */
export type LoggedEvent = PlayedEvent<FlightEvent, EventEffects>;

/** Describes a moment of a round beyond its flight's events, numbered, as the view's log keeps it. */
export interface LoggedBeat extends NumberedEvent {
  beat: Beat;
}

/** Says how a frame plays a round. */
export interface PlayOptions {
  /** How fast each speed plays, {@link FLIGHT_PACE} unless the debug menu tunes it. */
  readonly pace: FlightPace;
  /** The speed the settings set. */
  readonly speed: FlightSpeed;
  /** Whether fast-forward is on. */
  readonly fast: boolean;
  /** Whether a long flight speeds up by itself, as the settings say. */
  readonly speedUp: boolean;
  /** Whether motion is welcome, without which the wall steps and jumps at once. */
  readonly motion: boolean;
  /** Whether the run is paused, which stops everything where it is. */
  readonly paused: boolean;
}

/** Describes a fuzzball as the scene draws it, written in place. */
type BallRecord = { -readonly [Key in keyof BallView]: BallView[Key] };

/** Describes how a frame plays the round back, written in place. */
type FrameRecord = {
  -readonly [Key in keyof PlaybackFrame]: PlaybackFrame[Key];
};

/** Plays a round's flight back, its fuzzballs drawn from the records the scene reads. */
type RoundPlayback = Playback<
  BrickKindId,
  FlightEvent,
  BallRecord,
  EventEffects
>;

/** Describes the frame's change, written in place. */
type Change = {
  -readonly [Key in keyof FrameChange<Round>]: FrameChange<Round>[Key];
};

/** What a skipped event calls for: nothing, so a skip is quiet but for its landing. */
const SKIPPED: EventEffects = { flourishes: [], sound: null };

/** Stands in a log's record before the first event is written to it. */
const NO_EVENT: FlightEvent = { at: 0, kind: "land", ball: 0, x: 0 };

/**
 * Plays a game's rounds one after another, as the shell hands them: the
 * round aimed, then, once it is released, its flight played back by the
 * frames' time at the speed set, fast-forwarded, sped up after a while,
 * skipped, dropped or paused, and its wall's step or jump, after which the
 * next round is aimed, or the level's card waited for and another level's
 * first round aimed.
 *
 * Its view is one record, written again each frame, and a frame of play
 * makes nothing: `@fz/brick-wall`'s playback follows each fuzzball and
 * changes the wall, and this says what each of the game's events does to a
 * fuzzball's record and the points. Make one for the game: its logs number
 * events on through every level and run, so their readers need no other.
 */
export class RoundPlay implements RoundsPlayed<RoundStart, Round> {
  private aimed: RoundStart;
  /** The round in play, released or dropped, until the next is aimed: null exactly while a round is aimed. */
  private played: Round | null = null;
  /** Reads the round's flight in order, saying what each event calls for. */
  private readonly effects = new FlightEffects();
  private readonly playback: RoundPlayback;
  private readonly beatLog = new EventLog<LoggedBeat>(BEATS_KEPT, () => ({
    serial: 0,
    beat: "step",
  }));
  /** The points of the breaks the flight has reached. */
  private scoredPoints = 0;
  /** Whether the round in play's flight has been dropped, until the next is released. */
  private dropped = false;
  /** Whether the player's fuzzball has landed, where it waits for the next round. */
  private playerLanded = false;
  /** Waits out the beat before a cleared or lost level's card opens. */
  private readonly cardWait = new Countdown();
  /**
   * What the pace the last frame played at was made from, so a frame makes
   * one only as the options change.
   */
  private paceFrom = FLIGHT_PACE;
  private paceSpeed: FlightSpeed = "normal";
  private paceSpeedsUp = false;
  private readonly frame: FrameRecord = {
    pace: paceOf(FLIGHT_PACE, "normal", false),
    fastForward: 1,
    motion: true,
  };
  private readonly change: Change = { settled: null, opens: null };
  private readonly shown: RoundView;

  /** Starts a level, its first round aimed from where it starts. */
  constructor(start: RoundStart) {
    this.aimed = start;
    this.playback = new Playback(
      {
        ball: (ball) => ({
          ball,
          role: "player",
          x: 0,
          y: 0,
          charge: 0,
          hot: false,
        }),
        reach: (event, quiet) => {
          const effects = quiet ? SKIPPED : this.effects.effectsOf(event);
          this.takeIn(event);
          return effects;
        },
        isLanding: (event) => event.kind === "land",
        changesOf: leftBy,
      },
      start.wall,
      { event: NO_EVENT, effects: SKIPPED },
    );
    const { view } = this.playback;
    const beats = this.beatLog;
    this.shown = {
      get balls() {
        return view.balls;
      },
      get wall() {
        return view.wall;
      },
      get wallDrop() {
        return view.wallDrop;
      },
      get rowsDown() {
        return view.rowsDown;
      },
      events: view.events,
      beats,
    };
  }

  /** The round in play as the scene draws it: the same record each frame. */
  get view(): RoundView {
    return this.shown;
  }

  /** Where the round aimed, or in play, started. */
  get start(): RoundStart {
    return this.aimed;
  }

  /** The round in play once it is released, until the next is aimed; else null. */
  get round(): Round | null {
    return this.played;
  }

  /** Where the round stands: aimed, its flight played back, or its wall settling after it. */
  get phase(): RoundPhase {
    if (this.played === null) return "aiming";
    return this.playback.phase === "flying" ? "flying" : "settling";
  }

  /**
   * The points of the breaks the round in play's flight has played back so
   * far, all of them once it has landed, and 0 while a round is aimed: the
   * round's points without a jump's, which come as it lands.
   */
  get scored(): number {
    return this.scoredPoints;
  }

  /**
   * The moment of the round in play's flight the playback has reached, in
   * field units, where a drop flies the round again to: 0 while a round is
   * aimed, and the flight's length once it has landed.
   */
  get moment(): number {
    return this.playback.moment;
  }

  /**
   * Whether a drop would bring the round in play's fuzzballs down: while
   * its flight plays, until it has been dropped, after which each one in
   * the air is coming down already and none is left to leave.
   */
  get droppable(): boolean {
    return this.phase === "flying" && !this.dropped;
  }

  /**
   * Where the player's fuzzball waits on the floor, across the field: where
   * the round aimed starts, or, once its flight's fuzzball has landed, where
   * the next starts; null while it is in the air.
   */
  get waitingX(): number | null {
    if (this.played === null) return this.aimed.x;
    return this.playerLanded ? this.played.next.x : null;
  }

  /** Aims a round from where it starts, leaving any round in play and any card's wait. */
  aim(start: RoundStart): void {
    this.aimed = start;
    this.played = null;
    this.scoredPoints = 0;
    this.cardWait.stop();
    this.playback.show(start.wall);
  }

  /**
   * Starts playing back the round released from the start aimed, its whole
   * flight decided; a round released while none is aimed is ignored.
   */
  release(round: Round): void {
    if (this.played !== null) return;
    this.played = round;
    this.effects.begin(this.aimed.boon);
    this.playerLanded = false;
    this.dropped = false;
    this.playback.play(decided(round));
  }

  /**
   * Plays on with the round in play flown again from the same start and
   * dropped at {@link moment} or later, in its place, from where the
   * playback is; does nothing unless the round is {@link droppable}.
   *
   * The dropped flight's events up to the moment reached are the ones
   * played already, so the log, the points and the wall keep what they took
   * from them, and its fuzzballs come down along their new tracks from
   * where they are. A second drop does nothing, as the round flown again from
   * its start, dropped later, would not be the one played since the first.
   */
  dropTo(round: Round): void {
    if (!this.droppable) return;
    this.dropped = true;
    this.played = round;
    this.playback.playOn(decided(round));
  }

  /**
   * Lands the flight in play at once, at the next frame played, handing on
   * the events it skips with no flourishes and one landing's sound; at any
   * other time, does nothing.
   */
  skip(): void {
    this.playback.landAtOnce();
  }

  /**
   * Plays the round on by a frame's time, as the frame's options say, and
   * returns what the frame came to, one record written again each frame.
   *
   * A frame of no time, less, or not a number plays none.
   */
  advance(deltaMs: number, options: Readonly<PlayOptions>): FrameChange<Round> {
    const { change } = this;
    change.settled = null;
    change.opens = null;
    const round = this.played;
    if (round === null || options.paused) return change;
    const ms = deltaMs > 0 ? deltaMs : 0;
    const { playback } = this;
    const before = playback.phase;
    if (before === "still") {
      const { result } = round.outcome;
      if (this.cardWait.count(ms, cardDelayMs(result, options.motion))) {
        change.opens = result === "cleared" ? "cleared" : "result";
      }
      return change;
    }
    playback.advance(ms, this.frameOf(options));
    const after = playback.phase;
    if (before === "flying" && after !== "flying") this.land(round);
    if (after === "still") this.rest(round);
    return change;
  }

  /**
   * Returns how a frame plays the round back, as its options say, the same
   * record each frame, its pace made again only as the options it is made
   * from change.
   */
  private frameOf(options: Readonly<PlayOptions>): PlaybackFrame {
    const { frame } = this;
    const { pace, speed, speedUp } = options;
    if (
      pace !== this.paceFrom ||
      speed !== this.paceSpeed ||
      speedUp !== this.paceSpeedsUp
    ) {
      frame.pace = paceOf(pace, speed, speedUp);
      this.paceFrom = pace;
      this.paceSpeed = speed;
      this.paceSpeedsUp = speedUp;
    }
    frame.fastForward = options.fast ? pace.fastForward : 1;
    frame.motion = options.motion;
    return frame;
  }

  /** Takes in what an event does to its fuzzball, and the points it scores. */
  private takeIn(event: FlightEvent): void {
    switch (event.kind) {
      case "launch": {
        const record = this.playback.ballOf(event.ball);
        record.role = event.role;
        record.charge = event.charge;
        record.hot = event.hot;
        return;
      }
      case "strike":
        this.playback.ballOf(event.ball).charge = event.charge;
        return;
      case "recharge":
        this.playback.ballOf(event.ball).charge = MOST_CHARGE;
        return;
      case "land":
        if (this.playback.ballOf(event.ball).role === "player") {
          this.playerLanded = true;
        }
        return;
      case "break":
        this.scoredPoints += event.points;
        return;
      case "free":
      case "turn":
      case "zap":
      case "portal":
      case "split":
      case "yawn":
      case "drop":
        return;
    }
  }

  /**
   * Logs the beats of a flight's end, as the wall the round leaves is
   * handed over to step or jump down to: the step or the jump, which sounds
   * as it starts, and a cleared level's chime, its wall staying where it
   * stands.
   */
  private land(round: Round): void {
    const { rowsDown, jumped, result } = round.outcome;
    if (rowsDown > 0) this.logBeat(jumped ? "jump" : "step");
    if (result === "cleared") this.logBeat("cleared");
  }

  /**
   * Says the round's wall has come to rest, sounds the level lost or the
   * danger line, and starts the wait before a cleared or lost level's card.
   */
  private rest(round: Round): void {
    const { result } = round.outcome;
    this.change.settled = round;
    if (result === "lost") this.logBeat("lost");
    if (result === "on" && inDanger(round.next.wall, WALL_RULES)) {
      this.logBeat("danger");
    }
    if (result !== "on") this.cardWait.start();
  }

  /** Logs a beat of the round. */
  private logBeat(beat: Beat): void {
    this.beatLog.next().beat = beat;
  }
}

/**
 * Returns the pace a flight plays back at: the speed set, and, where the
 * settings let long flights speed up, a mark by time at the pace's long
 * flight.
 */
function paceOf(pace: FlightPace, speed: FlightSpeed, speedUp: boolean): Pace {
  return {
    unitsPerSecond: pace.unitsPerSecond[speed],
    byDistance: [],
    byTime: speedUp
      ? [{ from: pace.longFlightMs, times: pace.longFlightSpeedUp }]
      : [],
  };
}

/** Returns a round as the playback reads it: its flight, and how the wall comes down after it. */
function decided(round: Round): DecidedRound<BrickKindId, FlightEvent> {
  const { flight, outcome, next } = round;
  return {
    events: flight.events,
    tracks: flight.tracks,
    length: flight.length,
    nextWall: next.wall,
    rowsDown: outcome.rowsDown,
    jumped: outcome.jumped,
  };
}

/**
 * Says the bricks an event of a flight leaves, from the cells as the events
 * before it leave them: a strike leaves its brick the hits it says, a zap
 * takes its hits off each brick it reaches, and a break leaves none.
 */
function leftBy(
  event: FlightEvent,
  cells: readonly (Brick | null)[],
  leave: (cell: number, brick: Brick | null) => void,
): void {
  switch (event.kind) {
    case "strike": {
      const brick = cells[event.cell];
      if (brick) leave(event.cell, { ...brick, hits: event.left });
      return;
    }
    case "zap":
      for (const cell of event.reaches) {
        const brick = cells[cell];
        if (brick) leave(cell, { ...brick, hits: brick.hits - ZAP_HITS });
      }
      return;
    case "break":
      leave(event.cell, null);
      return;
    default:
      return;
  }
}

/** Returns how long a level's card waits after the round that ended it. */
function cardDelayMs(result: RoundResult, motion: boolean): number {
  return result === "cleared" ? clearedDelayMs(motion) : resultDelayMs(motion);
}
