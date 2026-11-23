// A level's rounds played back one after another on @fz/brick-wall's
// playback, as the shell hands them: the round aimed, then, once it is
// released, its flight at its pace and its wall's step or jump after it.
// What each of the flight's events does to the frame the scene draws is
// this game's own: a cell's hits, the fuzzball's heading, rally and fur,
// the floor bounces in hand, the hatches' holds and the bolts drawn; and
// what it calls for, effects/effects.ts's, is logged with it.

import { RADIUS } from "@fz/brick-wall/rules/field";
import { inDanger } from "@fz/brick-wall/rules/wall";
import {
  type DecidedRound,
  Playback,
  type PlaybackFrame,
} from "@fz/brick-wall/view/playback";
import { clearedDelayMs, resultDelayMs } from "@fz/brick-wall/view/timing";
import { Countdown } from "@fz/core/clock";
import { EventLog } from "@fz/core/event_log";
import { multiplierAt } from "@fz/core/math";
import { WALL_RULES } from "../../rules/bricks/wall_rules";
import type { Brick, KindId } from "../../rules/catalog/kinds";
import type {
  BallTrack,
  Flight,
  FlightEvent,
  Round,
  RoundResult,
  RoundStart,
} from "../../rules/flight/events";
import {
  BOUNCE_POINTS,
  type FlightRules,
  RALLY_MARKS,
  RALLY_STEPS,
  STRIKE_POINTS,
} from "../../rules/tuning";
import type { Fur } from "../art/frames";
import {
  type EventEffects,
  QUIET,
  callsOut,
  flightEffects,
} from "../effects/effects";
import type {
  BallView,
  Beat,
  Card,
  FlightSoFar,
  LoggedBeat,
  RoundChange,
  RoundNews,
  RoundPhase,
  RoundView,
} from "../run_state";
import { type FlightPace, type FlightSpeed, paceOf } from "./pace";

/** Holds the rules' numbers a level's play reads: the hatches' holds a flight, and a hot shot's floor bounces. */
export type PlayRules = Pick<FlightRules, "hatchHolds" | "hotBounces">;

/** Says how a frame plays a round. */
export interface PlayOptions {
  /** How fast each setting plays, `FLIGHT_PACE` unless a debug menu tunes it. */
  readonly pace: FlightPace;
  /** The speed the settings set. */
  readonly speed: FlightSpeed;
  /** Whether fast-forward is on. */
  readonly fast: boolean;
  /** Whether motion is welcome, without which the wall steps and jumps at once. */
  readonly motion: boolean;
  /** Whether the run is paused, which stops everything where it is. */
  readonly paused: boolean;
}

/** Describes the fuzzball as the scene draws it, written in place. */
type BallRecord = { -readonly [Key in keyof BallView]: BallView[Key] };

/** Describes what the round in play's flight has played back so far, written in place. */
type Tally = { -readonly [Key in keyof FlightSoFar]: FlightSoFar[Key] };

/** Describes how a frame plays the round back, written in place. */
type FrameRecord = {
  -readonly [Key in keyof PlaybackFrame]: PlaybackFrame[Key];
};

/** Describes the round as the scene draws it, its counts written in place. */
interface Shown extends RoundView {
  holdsLeft: number;
  boltsDrawn: number;
}

/** Describes the frame's change, written in place. */
interface Change extends RoundChange {
  readonly news: RoundNews[];
  opens: Card | null;
}

/** Plays a round's flight back, its fuzzball drawn from the record the scene reads. */
type RoundPlayback = Playback<KindId, FlightEvent, BallRecord, EventEffects>;

/** How many beats the log keeps: far more than a frame's few. */
const BEATS_KEPT = 16;

/** Stands in a log's record before the first event is written to it. */
const NO_EVENT: FlightEvent = { at: 0, kind: "land", x: 0 };

/**
 * Plays a level's rounds one after another, as the shell hands them: the
 * round aimed, then, once it is released, its flight played back by the
 * frames' time at the speed set, fast-forwarded or paused, and its wall's
 * step or jump, after which the next round is aimed, or the level's card
 * waited for and another level's first round aimed.
 *
 * Its view is one record, written again each frame, and a frame of play
 * makes nothing. Make one for the game: its logs number events on through
 * every level and run, so their readers need no other.
 */
export class RoundPlay {
  private aimed: RoundStart;
  /** The round in play once it is released, until the next is aimed: null exactly while a round is aimed. */
  private played: Round | null = null;
  private readonly ball: BallRecord;
  private readonly tally: Tally = { rally: 0, held: 0, turns: 0, points: 0 };
  /** What {@link soFar} last handed on, handed on again while the tally says the same. */
  private told: FlightSoFar = { rally: 0, held: 0, turns: 0, points: 0 };
  private readonly playback: RoundPlayback;
  private readonly beatLog = new EventLog<LoggedBeat>(BEATS_KEPT, () => ({
    serial: 0,
    beat: "step",
  }));
  /** Waits out the beat before a cleared or lost level's card opens. */
  private readonly cardWait = new Countdown();
  /**
   * What the pace the last frame played at was made from, so a frame makes
   * one only as the flight or the options change.
   */
  private paceFlight: Flight | null = null;
  private paceFrom: FlightPace | null = null;
  private paceSpeed: FlightSpeed = "normal";
  private readonly frame: FrameRecord = {
    pace: { unitsPerSecond: 0, byDistance: [], byTime: [] },
    fastForward: 1,
    motion: true,
  };
  private readonly change: Change = { news: [], opens: null };
  /** What each event of the flight in play calls for, in order, and how many of them the playback has reached. */
  private effects: readonly EventEffects[] = [];
  private reached = 0;
  /** Whether the flight in the air is landing unseen as the page is hidden, which hushes all it reaches, its landing and its beats too. */
  private unseen = false;
  private readonly shown: Shown;

  /** Starts a level, its first round aimed from where it starts, the hatches and the hot shot as the rules hold them. */
  constructor(
    start: RoundStart,
    private readonly rules: PlayRules,
  ) {
    this.aimed = start;
    this.ball = waiting(start);
    const own = this.ball;
    this.playback = new Playback(
      {
        ball: (ball) => (ball === 0 ? own : waiting(start)),
        reach: (event, quiet) => {
          const hushed = quiet || this.unseen;
          this.takeIn(event, hushed);
          // The playback reaches each event once, in order, from the first,
          // so the count is the index of its effects.
          const effects = this.effects[this.reached++] ?? QUIET;
          if (hushed) return QUIET;
          if (callsOut(effects)) this.change.news.push({ kind: "called" });
          return effects;
        },
        isLanding: (event) => event.kind === "land",
        changesOf: leftBy,
      },
      start.wall,
      { event: NO_EVENT, effects: QUIET },
    );
    const { view } = this.playback;
    const { tally } = this;
    this.shown = {
      ball: own,
      get wall() {
        return view.wall;
      },
      get wallDrop() {
        return view.wallDrop;
      },
      get rowsDown() {
        return view.rowsDown;
      },
      get held() {
        return tally.held;
      },
      holdsLeft: rules.hatchHolds,
      boltsDrawn: 0,
      events: view.events,
      beats: this.beatLog,
    };
    this.aim(start);
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

  /**
   * The moment of the round in play's flight the playback has reached, in
   * field units: its flight's length once it has landed.
   */
  get moment(): number {
    return this.playback.moment;
  }

  /** Where the round stands: aimed, its flight played back, or its wall settling after it. */
  get phase(): RoundPhase {
    if (this.played === null) return "aiming";
    return this.playback.phase === "flying" ? "flying" : "settling";
  }

  /**
   * What the round in play's flight has played back so far, all of it once
   * it has landed, but the floor bounces it held, which it keeps no longer;
   * or, while a round is aimed, what its shot leaves with. It is another
   * record only as it changes.
   */
  get soFar(): FlightSoFar {
    const { tally, told } = this;
    if (
      tally.rally !== told.rally ||
      tally.held !== told.held ||
      tally.turns !== told.turns ||
      tally.points !== told.points
    ) {
      this.told = { ...tally };
    }
    return this.told;
  }

  /** Aims a round from where it starts, leaving any round in play and any card's wait. */
  aim(start: RoundStart): void {
    this.aimed = start;
    this.played = null;
    this.cardWait.stop();
    this.playback.show(start.wall);
    wait(this.ball, start.x, start.hot);
    this.leave(start.hot ? this.rules.hotBounces : 0);
  }

  /**
   * Starts playing back the round released from the start aimed, its whole
   * flight decided, and called as it reaches the level's rally mark; a
   * round released while none is aimed is ignored.
   */
  release(round: Round, rallyMark: number): void {
    if (this.played !== null) return;
    this.played = round;
    const { flight } = round;
    this.effects = flightEffects(this.aimed, flight, rallyMark);
    this.reached = 0;
    this.leave(flight.held);
    leaveAlong(flight.track, this.ball);
    this.logBeat(this.aimed.hot ? "hot-release" : "release");
    this.playback.play(decided(round));
  }

  /**
   * Lands the flight in play at once, at the next frame played, with
   * everything it would have done, the events it skips calling for nothing
   * and saying no news, the call at the rally mark among them, but its
   * landing, which sounds; at any other time, does nothing, as the next
   * flight starts afresh.
   */
  skip(): void {
    this.playback.landAtOnce();
  }

  /**
   * Lands the flight in the air at once as the page is hidden, which may
   * never be seen again, so the run keeps all it would have done: at a frame
   * of no time, paused or not, as a skip lands it but with nothing heard or
   * seen of it, its landing and the beats of that frame quiet too, and
   * returns what the frame came to; with no flight in the air, plays
   * nothing. A wall that comes to rest later, where motion is welcome,
   * sounds a level lost or the danger line then, as it is seen.
   */
  landUnseen(options: Readonly<PlayOptions>): RoundChange {
    if (this.phase !== "flying") return this.nothing();
    this.unseen = true;
    try {
      this.playback.landAtOnce();
      return this.advance(0, { ...options, paused: false });
    } finally {
      this.unseen = false;
    }
  }

  /**
   * Plays the round on by a frame's time, as the frame's options say, and
   * returns what the frame came to, one record written again each frame.
   *
   * A frame of no time, less, or not a number plays none.
   */
  advance(deltaMs: number, options: Readonly<PlayOptions>): RoundChange {
    const change = this.nothing();
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
    playback.advance(ms, this.frameOf(round.flight, options));
    const after = playback.phase;
    if (before === "flying" && after !== "flying") this.land(round);
    if (after === "still") this.rest(round);
    return change;
  }

  /** Returns the frame's change, come to nothing yet. */
  private nothing(): Change {
    const { change } = this;
    change.news.length = 0;
    change.opens = null;
    return change;
  }

  /** Starts a shot's count afresh: the floor bounces it leaves with, the hatches' every hold and no bolt drawn. */
  private leave(held: number): void {
    const { tally, shown } = this;
    tally.rally = 0;
    tally.held = held;
    tally.turns = 0;
    tally.points = 0;
    shown.holdsLeft = this.rules.hatchHolds;
    shown.boltsDrawn = 0;
  }

  /**
   * Returns how a frame plays the flight back, as its options say, the same
   * record each frame, its pace made again only as the flight or the
   * options it is made from change.
   */
  private frameOf(
    flight: Flight,
    options: Readonly<PlayOptions>,
  ): PlaybackFrame {
    const { frame } = this;
    const { pace, speed } = options;
    if (
      flight !== this.paceFlight ||
      pace !== this.paceFrom ||
      speed !== this.paceSpeed
    ) {
      frame.pace = paceOf(flight, speed, pace);
      this.paceFlight = flight;
      this.paceFrom = pace;
      this.paceSpeed = speed;
    }
    frame.fastForward = options.fast ? pace.fastForward : 1;
    frame.motion = options.motion;
    return frame;
  }

  /**
   * Takes in what an event of the flight does to the fuzzball and the
   * counts, and the news of it, unless it is reached quietly, as a flight
   * is landed at once.
   */
  private takeIn(event: FlightEvent, quiet: boolean): void {
    const { ball, tally, shown } = this;
    switch (event.kind) {
      case "turn":
        ball.dx = event.dx;
        ball.dy = event.dy;
        tally.turns++;
        return;
      case "strike":
        ball.rally = event.rally;
        ball.fur = furOf(event.rally);
        tally.rally = event.rally;
        tally.points += STRIKE_POINTS * multiplierAt(event.rally, RALLY_STEPS);
        return;
      case "bounce-earned":
        tally.held = event.held;
        if (event.kept) tally.points += BOUNCE_POINTS;
        if (quiet) return;
        this.change.news.push({
          kind: "earned",
          by: event.by,
          rally: tally.rally,
          kept: event.kept,
        });
        return;
      case "bounce-spent":
        tally.held = event.held;
        return;
      case "hold":
        shown.holdsLeft = event.left;
        return;
      case "bolt":
        shown.boltsDrawn = event.drawn;
        return;
      case "bored":
      case "guard":
        ball.dx = 0;
        ball.dy = 0;
        ball.home = true;
        return;
      case "land":
        // Nothing is kept past the flight: the floor bounces it held are
        // gone, and the hatches and the locks shut again for the next.
        wait(ball, event.x, ball.hot);
        tally.held = 0;
        shown.holdsLeft = this.rules.hatchHolds;
        shown.boltsDrawn = 0;
        return;
      // The hold that leaves none has left the bars no dots already.
      case "hatches-open":
      case "shielded":
      case "teleport":
        return;
    }
  }

  /**
   * Logs the beats of a flight's end, as the wall the round leaves is
   * handed over to step or jump down to: the step or the jump, which sounds
   * as it starts, and a cleared level's chime, its wall staying where it
   * stands; and lights or puts out the waiting fuzzball as the next shot is
   * hot or not.
   */
  private land(round: Round): void {
    const { rowsDown, jumped, result } = round.outcome;
    this.ball.hot = round.next.hot;
    if (rowsDown > 0) this.logBeat(jumped ? "jump" : "step");
    if (result === "cleared") this.logBeat("cleared");
  }

  /**
   * Says the round has ended as its wall comes to rest, sounds the level
   * lost or the danger line, and starts the wait before a cleared or lost
   * level's card.
   */
  private rest(round: Round): void {
    const { result } = round.outcome;
    this.change.news.push({ kind: "ended", round });
    if (result === "lost") this.logBeat("lost");
    if (result === "on" && inDanger(round.next.wall, WALL_RULES)) {
      this.logBeat("danger");
    }
    if (result !== "on") this.cardWait.start();
  }

  /** Logs a beat of the round, but one a flight landing unseen reaches. */
  private logBeat(beat: Beat): void {
    if (!this.unseen) this.beatLog.next().beat = beat;
  }
}

/** Returns how far the fuzzball's fur has lifted at a rally: a step at each of `RALLY_MARKS` it has reached. */
function furOf(rally: number): Fur {
  const [first, second, third] = RALLY_MARKS;
  if (rally >= third) return 3;
  if (rally >= second) return 2;
  return rally >= first ? 1 : 0;
}

/** Returns a fuzzball waiting where a round starts. */
function waiting(start: RoundStart): BallRecord {
  const ball: BallRecord = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    rally: 0,
    fur: 0,
    hot: false,
    home: false,
  };
  wait(ball, start.x, start.hot);
  return ball;
}

/** Writes a fuzzball waiting on the floor at an x into its record: still, its rally and fur at none, hot or not. */
function wait(ball: BallRecord, x: number, hot: boolean): void {
  ball.x = x;
  ball.y = RADIUS;
  ball.dx = 0;
  ball.dy = 0;
  ball.rally = 0;
  ball.fur = 0;
  ball.hot = hot;
  ball.home = false;
}

/**
 * Writes a fuzzball's heading as it leaves into its record, along its
 * track's first leg, whose length in units is the units flown along it.
 */
function leaveAlong(track: BallTrack, ball: BallRecord): void {
  const [from, to] = track.waypoints;
  if (from !== undefined && to !== undefined) {
    const units = to.at - from.at;
    ball.dx = (to.x - from.x) / units;
    ball.dy = (to.y - from.y) / units;
  }
}

/** Returns a round as the playback reads it: its flight, and how the wall comes down after it. */
function decided(round: Round): DecidedRound<KindId, FlightEvent> {
  const { flight, outcome, next } = round;
  return {
    events: flight.events,
    tracks: [flight.track],
    length: flight.length,
    nextWall: next.wall,
    rowsDown: outcome.rowsDown,
    jumped: outcome.jumped,
  };
}

/**
 * Says the bricks an event of a flight leaves, from the cells as the events
 * before it leave them: a strike leaves its brick the hits it took fewer,
 * or none once it breaks.
 */
function leftBy(
  event: FlightEvent,
  cells: readonly (Brick | null)[],
  leave: (cell: number, brick: Brick | null) => void,
): void {
  if (event.kind !== "strike") return;
  const brick = cells[event.cell];
  if (!brick) return;
  leave(
    event.cell,
    event.broke ? null : { ...brick, hits: brick.hits - event.took },
  );
}

/** Returns how long a level's card waits after the round that ended it. */
function cardDelayMs(result: RoundResult, motion: boolean): number {
  return result === "cleared" ? clearedDelayMs(motion) : resultDelayMs(motion);
}
