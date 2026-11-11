import { Countdown } from "@fz/core/clock";
import {
  EventLog,
  type EventLogView,
  type NumberedEvent,
} from "@fz/core/event_log";
import { easeOutCubic } from "@fz/core/math";
import type { BallRole, FlightEvent, Waypoint } from "../rules/flight/events";
import type { Round, RoundResult, RoundStart } from "../rules/round/round";
import { MOST_CHARGE, ZAP_HITS } from "../rules/tuning";
import { inDanger } from "../rules/wall/lower";
import type { Brick, Wall } from "../rules/wall/wall";
import { type Beat, type EventEffects, FlightEffects } from "./effects/effects";
import {
  JUMP_MS,
  STEP_MS,
  clearedDelayMs,
  resultDelayMs,
} from "./effects/timing";
import type { Card, RoundChange, RoundPhase } from "./run_state";

/** Names how fast a flight plays back, as the settings offer it. */
export type FlightSpeed = "normal" | "fast";

/** Describes how fast a flight plays back, the numbers the debug menu's sliders tune. */
export interface FlightPace {
  /** How far a flight plays back in a second, in field units, at each speed. */
  readonly unitsPerSecond: Readonly<Record<FlightSpeed, number>>;
  /** How many times faster a flight plays back while fast-forward is held. */
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

/** How many of a flight's events the log keeps: far more than a frame reaches, even fast-forwarded at a low rate. */
const EVENTS_KEPT = 1024;

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

/** Describes a round in play as the scene draws it at a moment, one record reused frame after frame. */
export interface RoundView {
  /** Each fuzzball in the air, in order of ball: where its middle is, its charge and whether it is a hot shot. */
  readonly balls: readonly BallView[];
  /**
   * The wall as it looks at this moment, another wall each time it changes,
   * so a frame that hands on the same wall changed nothing.
   *
   * A wall handed on before the last may be written over as a flight goes
   * on, so a reader reads the view after every frame played and compares
   * its wall only with the one it read the frame before.
   */
  readonly wall: Wall;
  /**
   * How far through the wall's step or jump it is, 0 to 1 through its ease:
   * 1 while the wall stands still, and 0 as the wall it comes down to is
   * handed over at once, as the flight ends, but where it comes down at
   * once, with no motion or no rows to come down.
   */
  readonly wallDrop: number;
  /**
   * How many rows the wall's step or jump brings it down, which it is drawn
   * `rowsDown × (1 − wallDrop)` rows over its place by: 0 but while the
   * wall settles.
   */
  readonly rowsDown: number;
  /**
   * The flights' events as playback reaches them, numbered from 1 in order,
   * the numbers running on from one round to the next, level after level:
   * those since the last frame give the flourishes and the sounds.
   */
  readonly events: EventLogView<LoggedEvent>;
  /**
   * The round's moments beyond its flight's events, as it reaches them: the
   * wall's step or jump, the danger line, and the level cleared or lost.
   */
  readonly beats: EventLogView<LoggedBeat>;
}

/**
 * Describes an event of the round in play as the view's log keeps it: the
 * flight's own event, numbered, so the writer fills a record of the log's
 * ring by pointing it at the next event, and no field of an older event of
 * another kind lingers in it.
 */
export interface LoggedEvent extends NumberedEvent {
  event: FlightEvent;
  /** What it calls for, as the flight read in order says: nothing for an event skipped. */
  effects: EventEffects;
}

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
  /** Whether fast-forward is held. */
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

/** Describes where a fuzzball is in its round: its record, its track and the leg of it it flies. */
interface BallState {
  readonly record: BallRecord;
  /** Its track's waypoints, none before its round is released. */
  waypoints: readonly Waypoint[];
  launched: boolean;
  landed: boolean;
  /** Where the leg it flies starts. */
  fromAt: number;
  fromX: number;
  fromY: number;
  /** The waypoint the leg it flies ends at, and its index. */
  to: Waypoint;
  leg: number;
}

/** Describes a brick an event of a flight leaves in a cell, or none. */
interface WallChange {
  /** The index of the event in its flight's. */
  readonly event: number;
  readonly cell: number;
  readonly brick: Brick | null;
}

/** Describes a writable copy of a wall, its bricks changed in place as a frame reaches a flight's events. */
interface PlayedWall {
  readonly bricks: (Brick | null)[];
  rows: number;
  lowestRow: number;
}

/** Describes the round view, written in place. */
interface View {
  readonly balls: BallRecord[];
  wall: Wall;
  wallDrop: number;
  rowsDown: number;
  readonly events: EventLogView<LoggedEvent>;
  readonly beats: EventLogView<LoggedBeat>;
}

/** Describes the frame's change, written in place. */
interface Change {
  readonly freed: number[];
  settled: Round | null;
  opens: Card | null;
}

/** What a skipped event calls for: nothing, so a skip is quiet but for its landing. */
const SKIPPED: EventEffects = { flourishes: [], sound: null };

/** No waypoints, a fuzzball's before its round is released. */
const NO_WAYPOINTS: readonly Waypoint[] = [];

/** Where a fuzzball's leg ends before it is launched. */
const NOWHERE: Waypoint = { at: 0, x: 0, y: 0 };

/** Stands in a log's record before the first event is written to it. */
const NO_EVENT: FlightEvent = { at: 0, kind: "land", ball: 0, x: 0 };

/**
 * Plays a game's rounds one after another, as the shell hands them: the
 * round aimed, then, once it is released, its flight played back by the
 * frames' time at the speed set, fast-forwarded, sped up after a while,
 * skipped or paused, and its wall's step or jump, after which the next
 * round is aimed, or the level's card waited for and another level's
 * first round aimed.
 *
 * Its view is one record, written again each frame, and a frame of play
 * makes nothing: each fuzzball is followed along its track from where it
 * was the frame before, and the bricks each event leaves are worked out
 * once, as the round is released. Make one for the game: its logs number
 * events on through every level and run, so their readers need no other.
 */
export class RoundPlay {
  private aimed: RoundStart;
  /** The round released, until the next is aimed: null exactly while a round is aimed. */
  private played: Round | null = null;
  private playPhase: RoundPhase = "aiming";
  /** Reads the round's flight in order, saying what each event calls for. */
  private readonly effects = new FlightEffects();
  private readonly eventLog = new EventLog<LoggedEvent>(EVENTS_KEPT, () => ({
    serial: 0,
    event: NO_EVENT,
    effects: SKIPPED,
  }));
  private readonly beatLog = new EventLog<LoggedBeat>(BEATS_KEPT, () => ({
    serial: 0,
    beat: "step",
  }));
  /** How far the flight has played, in field units: the moment its events and its fuzzballs are at. */
  private at = 0;
  /** How long the flight has played, in milliseconds of the frames' time. */
  private flownMs = 0;
  /** The index of the flight's next event to reach. */
  private next = 0;
  /** The index of the flight's last landing, the one a skip sounds. */
  private lastLanding = -1;
  /** The points of the breaks the flight has reached. */
  private scoredPoints = 0;
  /** Whether a skip waits for the next frame played, or has landed the flight, until the next round is aimed. */
  private skipping = false;
  /** Whether the player's fuzzball has landed, where it waits for the next round. */
  private playerLanded = false;
  /** How long the wall has settled, and how long it takes to, in milliseconds. */
  private settledMs = 0;
  private settleMs = 0;
  /** Whether the wall has come to rest after the round's flight. */
  private atRest = false;
  /** Waits out the beat before a cleared or lost level's card opens. */
  private readonly cardWait = new Countdown();
  /** Each fuzzball's state, by ball. */
  private readonly balls: BallState[] = [];
  /** Takes the events of a fuzzball no track has, which no flight makes. */
  private readonly stray: BallState = ballState(-1);
  /**
   * The copy of the wall a frame's changes go into, shown from the frame's
   * first change on, and the other, shown before it, which the next frame
   * to change the wall copies it into.
   */
  private changing: PlayedWall = playedWall();
  private spare: PlayedWall = playedWall();
  /** Whether the frame being played has copied the wall shown yet, which it does once. */
  private wallCopied = false;
  /** The bricks the flight's events leave, in order, worked out as the round is released. */
  private readonly changes: WallChange[] = [];
  /** The index of the next of {@link changes} to make. */
  private nextChange = 0;
  private readonly change: Change = { freed: [], settled: null, opens: null };
  private readonly shown: View;

  /** Starts a level, its first round aimed from where it starts. */
  constructor(start: RoundStart) {
    this.aimed = start;
    this.shown = {
      balls: [],
      wall: start.wall,
      wallDrop: 1,
      rowsDown: 0,
      events: this.eventLog,
      beats: this.beatLog,
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
    return this.playPhase;
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
    this.playPhase = "aiming";
    this.skipping = false;
    this.scoredPoints = 0;
    this.cardWait.stop();
    const { shown } = this;
    shown.balls.length = 0;
    shown.wall = start.wall;
    shown.wallDrop = 1;
    shown.rowsDown = 0;
  }

  /**
   * Starts playing back the round released from the start aimed, its whole
   * flight decided; a round released while none is aimed is ignored.
   */
  release(round: Round): void {
    if (this.played !== null) return;
    this.played = round;
    this.playPhase = "flying";
    this.effects.begin(this.aimed.boon);
    this.at = 0;
    this.flownMs = 0;
    this.next = 0;
    this.playerLanded = false;
    this.settledMs = 0;
    this.atRest = false;
    this.indexFlight(round);
    this.indexWall(this.aimed.wall, round);
    // Both copies sized for the wall at once, so no frame grows them.
    copyWall(this.aimed.wall, this.changing);
    copyWall(this.aimed.wall, this.spare);
  }

  /**
   * Lands the flight in play at once, at the next frame played, handing on
   * the events it skips with no flourishes and one landing's sound; at any
   * other time, does nothing.
   */
  skip(): void {
    if (this.playPhase === "flying") this.skipping = true;
  }

  /**
   * Plays the round on by a frame's time, as the frame's options say, and
   * returns what the frame came to, one record written again each frame.
   *
   * A frame of no time, less, or not a number plays none.
   */
  advance(deltaMs: number, options: Readonly<PlayOptions>): RoundChange {
    const { change } = this;
    this.wallCopied = false;
    change.freed.length = 0;
    change.settled = null;
    change.opens = null;
    const round = this.played;
    if (round === null || options.paused) return change;
    const ms = deltaMs > 0 ? deltaMs : 0;
    if (this.playPhase === "flying") {
      this.fly(round, ms, options);
    } else {
      this.settle(round, ms, options.motion);
    }
    return change;
  }

  /** Plays a flight on by a frame's time, or ends it at once as a skip asks, and starts the wall settling as it ends. */
  private fly(round: Round, ms: number, options: Readonly<PlayOptions>): void {
    // The flight's length is the moment its last event is reached, its last
    // landing or a zap rippling on past it; everything has landed by then,
    // so the moment is left to run past it.
    const end = round.flight.length;
    this.at = this.skipping ? end : this.at + this.unitsIn(ms, options);
    this.reach(round, this.skipping);
    this.place();
    if (this.at >= end) this.land(round, options.motion);
  }

  /**
   * Returns how far a frame's time plays the flight, in field units: at the
   * speed set, times fast-forward's while it is held, and times the pace's
   * speed-up for the part of the frame past its long flight where long
   * flights speed up, so the moment the flight speeds up is the same at any
   * rate of frames.
   */
  private unitsIn(ms: number, options: Readonly<PlayOptions>): number {
    const { pace } = options;
    const perMs =
      (pace.unitsPerSecond[options.speed] / 1000) *
      (options.fast ? pace.fastForward : 1);
    const before = this.flownMs;
    this.flownMs += ms;
    if (!options.speedUp) return perMs * ms;
    const longMs = Math.max(
      0,
      this.flownMs - Math.max(before, pace.longFlightMs),
    );
    return perMs * (ms + (pace.longFlightSpeedUp - 1) * longMs);
  }

  /**
   * Reaches each event of a flight up to the moment it has played to, in
   * order: logs it with what it calls for, or, skipped, with nothing but
   * the last landing's sound, and takes in what it does to the fuzzballs,
   * the wall and the friends freed.
   */
  private reach(round: Round, skipped: boolean): void {
    const { events } = round.flight;
    for (;;) {
      const event = events[this.next];
      if (event === undefined || event.at > this.at) return;
      const record = this.eventLog.next();
      record.event = event;
      record.effects =
        skipped && this.next !== this.lastLanding
          ? SKIPPED
          : this.effects.effectsOf(event);
      this.takeIn(event);
      this.changeWall();
      this.next++;
    }
  }

  /** Takes in what an event does to its fuzzball, the friend it frees and the points it scores. */
  private takeIn(event: FlightEvent): void {
    switch (event.kind) {
      case "launch": {
        const state = this.stateOf(event.ball);
        const { record } = state;
        record.role = event.role;
        record.charge = event.charge;
        record.hot = event.hot;
        state.launched = true;
        // Its first leg is one of no length, ending where it leaves, which
        // following its track moves it on from.
        state.to = event;
        state.leg = 0;
        return;
      }
      case "strike":
        this.stateOf(event.ball).record.charge = event.charge;
        return;
      case "recharge":
        this.stateOf(event.ball).record.charge = MOST_CHARGE;
        return;
      case "land": {
        const state = this.stateOf(event.ball);
        state.landed = true;
        if (state.record.role === "player") this.playerLanded = true;
        return;
      }
      case "free":
        this.change.freed.push(event.ink);
        return;
      case "break":
        this.scoredPoints += event.points;
        return;
      case "turn":
      case "zap":
      case "portal":
      case "split":
      case "yawn":
        return;
    }
  }

  /** Makes the wall's changes the events reached so far leave. */
  private changeWall(): void {
    for (;;) {
      const change = this.changes[this.nextChange];
      if (change === undefined || change.event > this.next) return;
      this.wallToChange().bricks[change.cell] = change.brick;
      this.nextChange++;
    }
  }

  /**
   * Returns the wall a frame's changes go into: at the frame's first, a
   * copy of the wall shown, which is shown from then on, so the scene sees
   * another wall.
   */
  private wallToChange(): PlayedWall {
    if (!this.wallCopied) {
      const into = this.spare;
      copyWall(this.shown.wall, into);
      this.spare = this.changing;
      this.changing = into;
      this.wallCopied = true;
      this.shown.wall = into;
    }
    return this.changing;
  }

  /** Places each fuzzball in the air where its track has it at the moment the flight has played to, in order of ball. */
  private place(): void {
    const { balls } = this.shown;
    // Written by index and cut once, as an array's length set to 0 drops
    // what it holds them in.
    let count = 0;
    for (const state of this.balls) {
      if (state.launched && !state.landed) {
        this.follow(state);
        balls[count++] = state.record;
      }
    }
    balls.length = count;
  }

  /**
   * Writes where a fuzzball is at the moment the flight has played to, from
   * the leg of its track it flew the frame before: at a moment two
   * waypoints share, as a portal's, at the later, where it flies on from.
   */
  private follow(state: BallState): void {
    for (;;) {
      const { to } = state;
      const after = state.waypoints[state.leg + 1];
      // On its last leg it lands at the leg's end, so it is never placed
      // past it.
      if (after === undefined || to.at > this.at) break;
      state.fromAt = to.at;
      state.fromX = to.x;
      state.fromY = to.y;
      state.to = after;
      state.leg++;
    }
    const { record, to } = state;
    const share = (this.at - state.fromAt) / (to.at - state.fromAt);
    record.x = state.fromX + (to.x - state.fromX) * share;
    record.y = state.fromY + (to.y - state.fromY) * share;
  }

  /**
   * Starts the wall settling as a flight ends: the wall the round leaves
   * handed over at once, to step or jump down to, which sounds as it
   * starts, at once where motion is unwelcome; a cleared level's wall
   * stays where it stands, and its chime sounds.
   */
  private land(round: Round, motion: boolean): void {
    this.playPhase = "settling";
    const { rowsDown, jumped, result } = round.outcome;
    const { shown } = this;
    // The wall the round leaves, without the bricks the step sank and with
    // moss grown back, drawn where the flight's stood until it comes down.
    shown.wall = round.next.wall;
    shown.rowsDown = rowsDown;
    this.settleMs = !motion || rowsDown === 0 ? 0 : jumped ? JUMP_MS : STEP_MS;
    if (rowsDown > 0) this.logBeat(jumped ? "jump" : "step");
    if (result === "cleared") this.logBeat("cleared");
    this.settle(round, 0, motion);
  }

  /**
   * Moves the wall's settling on by a frame's time, through its ease, and,
   * as it comes to rest, says so, sounds the level lost or the danger line,
   * and starts the wait before a cleared or lost level's card; once it is
   * at rest, counts that wait.
   */
  private settle(round: Round, ms: number, motion: boolean): void {
    const { result } = round.outcome;
    if (this.atRest) {
      if (this.cardWait.count(ms, cardDelayMs(result, motion))) {
        this.change.opens = result === "cleared" ? "cleared" : "result";
      }
      return;
    }
    this.settledMs += ms;
    const { shown } = this;
    if (this.settledMs < this.settleMs) {
      shown.wallDrop = easeOutCubic(this.settledMs / this.settleMs);
      return;
    }
    shown.wallDrop = 1;
    shown.rowsDown = 0;
    this.atRest = true;
    this.change.settled = round;
    if (result === "lost") this.logBeat("lost");
    if (result === "on" && inDanger(round.next.wall)) this.logBeat("danger");
    if (result !== "on") this.cardWait.start();
  }

  /** Logs a beat of the round. */
  private logBeat(beat: Beat): void {
    this.beatLog.next().beat = beat;
  }

  /**
   * Indexes a released round's flight once: each fuzzball's track by its
   * number, none of them launched, and the flight's last landing.
   */
  private indexFlight(round: Round): void {
    const { tracks, events } = round.flight;
    this.growTo(tracks.length);
    for (const state of this.balls) {
      state.launched = false;
      state.landed = false;
    }
    for (const track of tracks) {
      this.stateOf(track.ball).waypoints = track.waypoints;
    }
    this.lastLanding = -1;
    events.forEach(({ kind }, index) => {
      if (kind === "land") this.lastLanding = index;
    });
  }

  /**
   * Works out once, as a round is released, the bricks its flight's events
   * leave, in order: a strike leaves its brick the hits it says, a zap
   * takes its hits off each brick it reaches, and a break leaves none.
   */
  private indexWall(start: Wall, round: Round): void {
    const { changes } = this;
    changes.length = 0;
    this.nextChange = 0;
    const left = [...start.bricks];
    const leave = (event: number, cell: number, brick: Brick | null): void => {
      left[cell] = brick;
      changes.push({ event, cell, brick });
    };
    round.flight.events.forEach((event, index) => {
      switch (event.kind) {
        case "strike": {
          const brick = left[event.cell];
          if (brick) leave(index, event.cell, { ...brick, hits: event.left });
          return;
        }
        case "zap":
          for (const cell of event.reaches) {
            const brick = left[cell];
            if (brick) {
              leave(index, cell, { ...brick, hits: brick.hits - ZAP_HITS });
            }
          }
          return;
        case "break":
          leave(index, event.cell, null);
          return;
        default:
          return;
      }
    });
  }

  /** Makes the fuzzballs' states for as many fuzzballs as a flight has, once. */
  private growTo(count: number): void {
    while (this.balls.length < count) {
      this.balls.push(ballState(this.balls.length));
    }
  }

  /** Returns a fuzzball's state, by its number. */
  private stateOf(ball: number): BallState {
    return this.balls[ball] ?? this.stray;
  }
}

/** Returns an empty writable wall, for a flight's to be copied into. */
function playedWall(): PlayedWall {
  return { bricks: [], rows: 0, lowestRow: 0 };
}

/** Copies a wall into a writable one, by cell, keeping the array it writes into. */
function copyWall(from: Wall, into: PlayedWall): void {
  const { bricks } = into;
  let cell = 0;
  for (const brick of from.bricks) bricks[cell++] = brick;
  bricks.length = cell;
  into.rows = from.rows;
  into.lowestRow = from.lowestRow;
}

/** Returns a fuzzball's state before its round is released. */
function ballState(ball: number): BallState {
  return {
    record: { ball, role: "player", x: 0, y: 0, charge: 0, hot: false },
    waypoints: NO_WAYPOINTS,
    launched: false,
    landed: false,
    fromAt: 0,
    fromX: 0,
    fromY: 0,
    to: NOWHERE,
    leg: 0,
  };
}

/** Returns how long a level's card waits after the round that ended it. */
function cardDelayMs(result: RoundResult, motion: boolean): number {
  return result === "cleared" ? clearedDelayMs(motion) : resultDelayMs(motion);
}
