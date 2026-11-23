// A wall game's round played back, its flight decided as it was released:
// one moment, in units flown, moved on by the frames' time at the pace the
// game sets, drives its fuzzballs along their tracks and reaches its events
// in order, which change the wall as they come; then the wall steps or
// jumps down to the one the round leaves. What an event does beyond the
// wall's bricks, and what it calls for, is the game's own.

import {
  EventLog,
  type EventLogView,
  type NumberedEvent,
} from "@fz/core/event_log";
import { easeOutCubic } from "@fz/core/math";
import type { At, BallTrack, Waypoint } from "../rules/track";
import type { Brick, Wall } from "../rules/wall";
import { JUMP_MS, STEP_MS } from "./timing";

/** Describes a round decided as it was released, as its playback reads it: its flight, and how the wall comes down after it. */
export interface DecidedRound<K extends string, E extends At> {
  /** The flight's events, in order of `at`. */
  readonly events: readonly E[];
  /** Each fuzzball's track, by ball. */
  readonly tracks: readonly BallTrack<string>[];
  /** The last event's `at`, where the flight ends: no event comes later, and no fuzzball is drawn from it on, whatever its track. */
  readonly length: number;
  /** The wall the round leaves, which the flight's comes down to as it ends. */
  readonly nextWall: Wall<K>;
  /** How many rows the wall comes down after the flight: 0 where it stays. */
  readonly rowsDown: number;
  /** Whether it comes down by a jump, rather than a step. */
  readonly jumped: boolean;
}

/** Describes where a flight plays back faster from, and how much. */
export interface PaceMark {
  /** Where it starts: units flown for a mark by distance, milliseconds played for one by time. */
  readonly from: number;
  /** How many times faster the flight plays from there, on top of every mark before it. */
  readonly times: number;
}

/**
 * Describes how fast a flight plays back: so many units a second, faster
 * from each mark it has passed, by the units it has flown or by the time
 * it has played.
 */
export interface Pace {
  /** How far a flight plays back in a second, in field units, before any mark. */
  readonly unitsPerSecond: number;
  /** The marks by the units flown, in order of `from`. */
  readonly byDistance: readonly PaceMark[];
  /** The marks by the frames' own time played, whatever fast-forward is, in order of `from`. */
  readonly byTime: readonly PaceMark[];
}

/** Describes where a fuzzball's middle is, in field units, which its playback writes into the record a game draws it from. */
export interface BallPlace {
  x: number;
  y: number;
}

/**
 * Describes an event of a flight as the playback's log keeps it: the
 * event, numbered, and what it calls for, as its game says. The writer
 * points a record of the log's ring at each event, so no field of an older
 * event lingers in it.
 */
export interface PlayedEvent<E extends At, F> extends NumberedEvent {
  event: E;
  effects: F;
}

/** Says how a frame plays a round back. */
export interface PlaybackFrame {
  /** How fast its flight plays. */
  readonly pace: Pace;
  /** How many times faster it plays fast-forwarded: 1 while fast-forward is off. */
  readonly fastForward: number;
  /** Whether motion is welcome, without which the wall steps and jumps at once. */
  readonly motion: boolean;
}

/** Names where a playback stands: its flight flying, its wall settling after it, or still. */
export type PlaybackPhase = "flying" | "settling" | "still";

/** Describes a round played back as a scene draws it at a moment, one record reused frame after frame. */
export interface PlaybackView<
  K extends string,
  E extends At,
  B extends BallPlace,
  F,
> {
  /** Each fuzzball in the air, in order of ball, its record as its game writes it and where it is. */
  readonly balls: readonly B[];
  /**
   * The wall as it looks at this moment, another wall each time it changes,
   * so a frame that hands on the same wall changed nothing.
   *
   * A wall handed on before the last may be written over as a flight goes
   * on, so a reader reads the view after every frame played and compares
   * its wall only with the one it read the frame before.
   */
  readonly wall: Wall<K>;
  /**
   * How far through the wall's step or jump it is, 0 to 1 through its ease:
   * 1 while the wall stands still, and 0 as the wall it comes down to is
   * handed over, as the flight ends, but where it comes down at once, with
   * no motion or no rows to come down.
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
   * the numbers running on from one round to the next: those since the
   * last frame give the flourishes and the sounds.
   */
  readonly events: EventLogView<PlayedEvent<E, F>>;
}

/** Holds what a game's events do, beyond where its fuzzballs are, as its playback reaches them. */
export interface PlaybackScript<
  K extends string,
  E extends At,
  B extends BallPlace,
  F,
> {
  /**
   * Returns a new record for a fuzzball to be drawn from, by its number:
   * once for each, as a flight first has it, and once for -1, as the
   * playback is made, the record {@link Playback.ballOf} hands back for a
   * fuzzball no track has.
   */
  ball(ball: number): B;
  /**
   * Takes in an event as the playback reaches it, before the bricks it
   * changes, writing what it does into the game's own view, a fuzzball's
   * record among it, and returns what it calls for, which the log keeps
   * with it: quietly, as a flight lands at once, for each event but its
   * last landing.
   */
  reach(event: E, quiet: boolean): F;
  /** Returns whether an event is a fuzzball's landing. */
  isLanding(event: E): boolean;
  /**
   * Says, through `leave`, the brick an event leaves in each cell it
   * changes, or none, reading the cells as the events before it leave them.
   */
  changesOf(
    event: E,
    cells: readonly (Brick<K> | null)[],
    leave: (cell: number, brick: Brick<K> | null) => void,
  ): void;
}

/** How many of a flight's events the log keeps: far more than a frame reaches, even fast-forwarded at a low rate. */
const EVENTS_KEPT = 1024;

/** Describes a fuzzball's record, its track and the leg of it it flies. */
interface BallState<B> {
  readonly record: B;
  /** Its track's waypoints, none for a fuzzball its flight has no track for. */
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
interface WallChange<K extends string> {
  /** The index of the event in its flight's. */
  readonly event: number;
  readonly cell: number;
  readonly brick: Brick<K> | null;
}

/** Describes a writable copy of a wall, its bricks changed in place as a frame reaches a flight's events. */
interface PlayedWall<K extends string> {
  readonly bricks: (Brick<K> | null)[];
  rows: number;
  lowestRow: number;
}

/** Describes the view, written in place. */
interface Shown<K extends string, E extends At, B extends BallPlace, F> {
  readonly balls: B[];
  wall: Wall<K>;
  wallDrop: number;
  rowsDown: number;
  readonly events: EventLogView<PlayedEvent<E, F>>;
}

/** No waypoints, a fuzzball's its flight has no track for. */
const NO_WAYPOINTS: readonly Waypoint[] = [];

/** Where a fuzzball's leg ends before it leaves. */
const NOWHERE: Waypoint = { at: 0, x: 0, y: 0 };

/**
 * Plays back a game's rounds one after another, each decided whole as it
 * was released: its flight, played by the frames' time at the pace the
 * game sets, fast-forwarded or landed at once, and its wall's step or jump
 * down after it.
 *
 * One moment, in units flown, drives everything: each fuzzball is where
 * its track has it, in the air from its first waypoint's moment until its
 * last's or the flight's end, whichever comes first, and each event at or
 * before the moment has been reached, in order. A pace's marks split a
 * frame where they fall, so a flight reaches the same moment after the
 * same time at any rate of frames.
 *
 * Its view is one record, written again each frame, and a frame of play
 * makes nothing: each fuzzball is followed from where it was the frame
 * before, and the bricks each event leaves are worked out once, as a round
 * is played or played on. Make one for the game: its log numbers events on
 * through every round, so its readers need no other.
 */
export class Playback<K extends string, E extends At, B extends BallPlace, F> {
  /** The round played back, from its start until a wall is shown still: null exactly while one is. */
  private round: DecidedRound<K, E> | null = null;
  private playPhase: PlaybackPhase = "still";
  private readonly log: EventLog<PlayedEvent<E, F>>;
  /** How far the flight has played, in field units: the moment its events and its fuzzballs are at. */
  private at = 0;
  /** How long the flight has played, in milliseconds of the frames' time. */
  private playedMs = 0;
  /** The index of the flight's next event to reach. */
  private next = 0;
  /** The index of the flight's last landing, the one landing it at once sounds. */
  private lastLanding = -1;
  /** Whether the flight is to land at once at the next frame played, or has. */
  private landingAtOnce = false;
  /** How long the wall has settled, and how long it takes to, in milliseconds. */
  private settledMs = 0;
  private settleMs = 0;
  /** Each fuzzball's state, by ball. */
  private readonly balls: BallState<B>[] = [];
  /** Takes the events of a fuzzball no track has. */
  private readonly stray: BallState<B>;
  /**
   * The copy of the wall a frame's changes go into, shown from the frame's
   * first change on, and the other, shown before it, which the next frame
   * to change the wall copies it into.
   */
  private changing: PlayedWall<K> = playedWall();
  private spare: PlayedWall<K> = playedWall();
  /** Whether the frame being played has copied the wall shown yet, which it does once. */
  private wallCopied = false;
  /** The bricks the flight's events not yet reached leave, in order, worked out as a round is played or played on. */
  private readonly changes: WallChange<K>[] = [];
  /** The index of the next of {@link changes} to make. */
  private nextChange = 0;
  private readonly shown: Shown<K, E, B, F>;

  /**
   * Starts with a wall shown still and no fuzzball in the air, the events
   * a game's script says what of, its log's records holding a blank event
   * until one is written to each.
   */
  constructor(
    private readonly script: PlaybackScript<K, E, B, F>,
    wall: Wall<K>,
    blank: Readonly<{ event: E; effects: F }>,
  ) {
    this.log = new EventLog<PlayedEvent<E, F>>(EVENTS_KEPT, () => ({
      serial: 0,
      event: blank.event,
      effects: blank.effects,
    }));
    this.stray = ballState(script.ball(-1));
    this.shown = {
      balls: [],
      wall,
      wallDrop: 1,
      rowsDown: 0,
      events: this.log,
    };
  }

  /** The round played back as the scene draws it: the same record each frame. */
  get view(): PlaybackView<K, E, B, F> {
    return this.shown;
  }

  /** Where the playback stands: flying, settling after a flight, or still. */
  get phase(): PlaybackPhase {
    return this.playPhase;
  }

  /**
   * The moment of the flight the playback has reached, in field units: 0
   * before the first round and after {@link show}, and the flight's length
   * once it has ended.
   */
  get moment(): number {
    const { round } = this;
    return round === null ? 0 : Math.min(this.at, round.length);
  }

  /**
   * Returns the record a fuzzball is drawn from, by its number, for a game
   * to write what an event does to it: a record of no fuzzball's for one
   * the flight has no track for.
   */
  ballOf(ball: number): B {
    return this.stateOf(ball).record;
  }

  /** Shows a wall still, with no fuzzball in the air, as a round is aimed, leaving any round played back. */
  show(wall: Wall<K>): void {
    this.round = null;
    this.playPhase = "still";
    this.landingAtOnce = false;
    const { shown } = this;
    shown.balls.length = 0;
    shown.wall = wall;
    shown.wallDrop = 1;
    shown.rowsDown = 0;
  }

  /**
   * Starts playing back a round from its start, on the wall shown, its
   * whole flight decided; a round played while another flies or its wall
   * settles is ignored.
   */
  play(round: DecidedRound<K, E>): void {
    if (this.playPhase !== "still") return;
    this.round = round;
    this.playPhase = "flying";
    this.at = 0;
    this.playedMs = 0;
    this.next = 0;
    this.landingAtOnce = false;
    for (const state of this.balls) {
      state.launched = false;
      state.landed = false;
    }
    this.indexFlight(round);
    const { wall } = this.shown;
    this.indexWall(wall, round, 0);
    // Both copies sized for the wall at once, so no frame grows them.
    copyWall(wall, this.changing);
    copyWall(wall, this.spare);
  }

  /**
   * Plays on along another round's flight, while a flight flies, from the
   * moment reached: the same round flown again and changed from there on,
   * whose events and tracks up to the moment are the old one's, so as many
   * of its events as were reached are taken as reached.
   *
   * The log and the wall keep what they took from the events reached, and
   * each fuzzball in the air goes on from where it is along its new track.
   */
  playOn(round: DecidedRound<K, E>): void {
    if (this.playPhase !== "flying") return;
    this.round = round;
    this.indexFlight(round);
    // The wall shown is the one the events reached leave, so only the
    // changes of the events after them are worked out.
    this.indexWall(this.shown.wall, round, this.next);
  }

  /**
   * Lands the flight at once, at the next frame played, reaching each event
   * it skips quietly but for its last landing; while no flight flies, does
   * nothing, as the next flight starts afresh.
   */
  landAtOnce(): void {
    this.landingAtOnce = true;
  }

  /**
   * Plays on by a frame's time, as the frame says: the flight at its pace,
   * times fast-forward's, ending as it reaches its length, or the wall's
   * step or jump after it, at once where motion is unwelcome; a still
   * playback plays nothing.
   *
   * A frame that leaves `flying` ended the flight, and one that reaches
   * `still` brought the wall to rest; one frame may do both.
   *
   * A frame of no time, less, or not a number plays none.
   */
  advance(deltaMs: number, frame: PlaybackFrame): void {
    const ms = deltaMs > 0 ? deltaMs : 0;
    const { round } = this;
    this.wallCopied = false;
    if (round === null) return;
    if (this.playPhase === "flying") {
      this.fly(round, ms, frame);
    } else if (this.playPhase === "settling") {
      this.settle(ms);
    }
  }

  /** Plays a flight on by a frame's time, or to its end at once, and starts the wall settling as it ends. */
  private fly(
    round: DecidedRound<K, E>,
    ms: number,
    frame: PlaybackFrame,
  ): void {
    // A flight's length is the moment its last event is reached, and from
    // then on `land()` shows no fuzzball, whatever its track, so the moment
    // is left to run past it.
    if (this.landingAtOnce) {
      this.at = round.length;
    } else {
      this.playFor(ms, frame.pace, frame.fastForward);
    }
    this.reach(round);
    this.place();
    if (this.at >= round.length) this.land(round, frame.motion);
  }

  /**
   * Moves the moment on by a frame's time at a pace, times fast-forward's,
   * a stretch at a time between the marks the frame passes, so a mark is
   * met where it falls at any rate of frames.
   */
  private playFor(ms: number, pace: Pace, fastForward: number): void {
    const perMs = (pace.unitsPerSecond / 1000) * fastForward;
    let left = ms;
    while (left > 0) {
      const speed =
        perMs *
        timesPassed(pace.byDistance, this.at) *
        timesPassed(pace.byTime, this.playedMs);
      const timeMark = nextMark(pace.byTime, this.playedMs);
      const distanceMark = nextMark(pace.byDistance, this.at);
      const toTime = timeMark - this.playedMs;
      const toDistance = (distanceMark - this.at) / speed;
      if (left < toTime && left < toDistance) {
        this.at += speed * left;
        this.playedMs += left;
        return;
      }
      // The stretch ends at the nearer mark, met exactly, so the next
      // stretch finds the one after it.
      const stretch = Math.min(toTime, toDistance);
      this.at = toDistance <= toTime ? distanceMark : this.at + speed * stretch;
      this.playedMs = toTime <= toDistance ? timeMark : this.playedMs + stretch;
      left -= stretch;
    }
  }

  /**
   * Reaches each event of a flight up to the moment it has played to, in
   * order: logs it with what its game says it calls for, quietly as it is
   * landed at once but for its last landing, and makes the wall's changes
   * it leaves.
   */
  private reach(round: DecidedRound<K, E>): void {
    const { events } = round;
    for (;;) {
      const event = events[this.next];
      if (event === undefined || event.at > this.at) return;
      const record = this.log.next();
      record.event = event;
      record.effects = this.script.reach(
        event,
        this.landingAtOnce && this.next !== this.lastLanding,
      );
      this.changeWall();
      this.next++;
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
  private wallToChange(): PlayedWall<K> {
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
    // what it holds them in; and read by number, as a frame's round of the
    // fuzzballs makes nothing.
    let count = 0;
    for (let ball = 0; ball < this.balls.length; ball++) {
      const state = this.stateOf(ball);
      if (this.updateFlight(state)) {
        this.follow(state);
        balls[count++] = state.record;
      }
    }
    balls.length = count;
  }

  /**
   * Marks a fuzzball launched as the flight reaches its track's first
   * waypoint's moment, its first leg one of no length there, and landed as
   * it reaches its last's, and returns whether it is in the air between.
   */
  private updateFlight(state: BallState<B>): boolean {
    const { waypoints } = state;
    if (!state.launched) {
      const first = waypoints[0];
      if (first === undefined || first.at > this.at) return false;
      state.launched = true;
      state.fromAt = first.at;
      state.fromX = first.x;
      state.fromY = first.y;
      state.to = first;
      state.leg = 0;
    }
    if (!state.landed) {
      const last = waypoints[waypoints.length - 1];
      state.landed = last === undefined || last.at <= this.at;
    }
    return !state.landed;
  }

  /**
   * Writes where a fuzzball is at the moment the flight has played to, from
   * the leg of its track it flew the frame before: at a moment two
   * waypoints share, as a pair of twins' do, at the later, where it flies
   * on from.
   */
  private follow(state: BallState<B>): void {
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
   * handed over at once, to step or jump down to, at once where motion is
   * unwelcome or it comes down no rows.
   */
  private land(round: DecidedRound<K, E>, motion: boolean): void {
    this.playPhase = "settling";
    const { shown } = this;
    shown.balls.length = 0;
    shown.wall = round.nextWall;
    shown.rowsDown = round.rowsDown;
    this.settledMs = 0;
    this.settleMs =
      !motion || round.rowsDown === 0 ? 0 : round.jumped ? JUMP_MS : STEP_MS;
    this.settle(0);
  }

  /** Moves the wall's settling on by a frame's time, through its ease, and says when it comes to rest. */
  private settle(ms: number): void {
    this.settledMs += ms;
    const { shown } = this;
    if (this.settledMs < this.settleMs) {
      shown.wallDrop = easeOutCubic(this.settledMs / this.settleMs);
      return;
    }
    shown.wallDrop = 1;
    shown.rowsDown = 0;
    this.playPhase = "still";
  }

  /**
   * Indexes a round's flight once, as it is played or played on: each
   * fuzzball's track by its number, one in the air going on along the leg
   * of its new track it flies, and the flight's last landing.
   */
  private indexFlight(round: DecidedRound<K, E>): void {
    const { tracks, events } = round;
    while (this.balls.length < tracks.length) {
      this.balls.push(ballState(this.script.ball(this.balls.length)));
    }
    for (const state of this.balls) state.waypoints = NO_WAYPOINTS;
    for (const { ball, waypoints } of tracks) {
      const state = this.stateOf(ball);
      state.waypoints = waypoints;
      if (state.launched && !state.landed) {
        // A track played on is the one it replaces up to the moment,
        // waypoint for waypoint, so the leg it flies starts where it did and
        // ends at the new track's waypoint of the same index. One that left
        // at the moment may have none, as it lands then, before it is placed
        // again.
        state.to = waypoints[state.leg] ?? state.to;
      }
    }
    this.lastLanding = -1;
    events.forEach((event, index) => {
      if (this.script.isLanding(event)) this.lastLanding = index;
    });
  }

  /**
   * Works out once, as a round is played or played on, the bricks its
   * flight's events from an index on leave, in order, from the wall as it
   * stands before them, as its game's script says.
   */
  private indexWall(
    wall: Wall<K>,
    round: DecidedRound<K, E>,
    from: number,
  ): void {
    const { changes } = this;
    changes.length = 0;
    this.nextChange = 0;
    const left = [...wall.bricks];
    let index = from;
    const leave = (cell: number, brick: Brick<K> | null): void => {
      left[cell] = brick;
      changes.push({ event: index, cell, brick });
    };
    for (const event of round.events.slice(from)) {
      this.script.changesOf(event, left, leave);
      index++;
    }
  }

  /** Returns a fuzzball's state, by its number. */
  private stateOf(ball: number): BallState<B> {
    return this.balls[ball] ?? this.stray;
  }
}

/** Returns how many times faster a flight plays for the marks it has passed at a place: by distance or by time. */
function timesPassed(marks: readonly PaceMark[], at: number): number {
  let times = 1;
  for (const mark of marks) {
    if (mark.from > at) break;
    times *= mark.times;
  }
  return times;
}

/** Returns where the next mark past a place is, or Infinity past the last. */
function nextMark(marks: readonly PaceMark[], at: number): number {
  for (const mark of marks) {
    if (mark.from > at) return mark.from;
  }
  return Infinity;
}

/** Returns an empty writable wall, for a flight's to be copied into. */
function playedWall<K extends string>(): PlayedWall<K> {
  return { bricks: [], rows: 0, lowestRow: 0 };
}

/**
 * Copies a wall into a writable one, by cell, keeping the array it writes
 * into; by index, so the copy, made in a frame, makes nothing of its own.
 */
function copyWall<K extends string>(from: Wall<K>, into: PlayedWall<K>): void {
  const { bricks } = into;
  const cells = from.bricks.length;
  for (let cell = 0; cell < cells; cell++) {
    bricks[cell] = from.bricks[cell] ?? null;
  }
  bricks.length = cells;
  into.rows = from.rows;
  into.lowestRow = from.lowestRow;
}

/** Returns a fuzzball's state before its flight, around the record it is drawn from. */
function ballState<B>(record: B): BallState<B> {
  return {
    record,
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
