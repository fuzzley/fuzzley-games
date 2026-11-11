// A round's flight, from its release to its last event, the last landing or a
// zap that lands after it, worked out whole on the round's one clock, as
// src/rules/flight/events.ts describes it.
//
// The fuzzballs leave in their order, LAUNCH_GAP apart, and each flies from one
// thing it meets to the next, cast() finding what and when: the one whose next
// moment comes first goes next, a tie to the lower numbered, in the
// implementation plan's order of fuzzballs (§5.6), and a zap lands after every
// fuzzball at its moment. A fuzzball strikes the bricks it meets as
// src/rules/bricks/bricks.ts' strike() says, their trait rules running at each
// moment and changing the flight through the hooks of
// src/rules/flight/hooks.ts. A flight's state is made once as it starts, and
// what a fuzzball meets is cast into records the module keeps and reuses, so a
// cast makes nothing; records are made only as events are.

import { multiplierAt } from "@fz/core/math";
import { MISSED } from "@fz/core/sweep";
import { AIMS } from "../aims";
import { strike } from "../bricks/bricks";
import type {
  BrickKind,
  BrickKinds,
  TraitKind,
  TraitOf,
} from "../catalog/bricks";
import { brickAt, cellAt, columnOf, fieldRowOf } from "../grid";
import type { Aim } from "../shot";
import {
  AT_ONCE,
  HOT_BOUNCES,
  LAUNCH_GAP,
  MOST_CHARGE,
  MOST_FLIGHT,
  MOST_FUZZBALLS,
  RADIUS,
  STILL_TURNS,
  STREAK,
  ZAP_DELAY,
} from "../tuning";
import type { Brick, Wall } from "../wall/wall";
import {
  type CastField,
  type Contacts,
  type Met,
  cast,
  castField,
  createContacts,
} from "./cast";
import type {
  BallRole,
  BreakCause,
  Contact,
  Flight,
  FlightEvent,
  Waypoint,
  ZapPattern,
} from "./events";
import type { Hooks, Struck, TraitRules } from "./hooks";

/** Describes how a round's fuzzballs leave, and the field they fly in. */
export interface FlightStart {
  /** The wall as the round starts, which the flight leaves untouched. */
  readonly wall: Wall;
  /** How many rows the field is deep. */
  readonly depth: number;
  /** Where the fuzzballs leave from, across the floor. */
  readonly x: number;
  readonly aim: Aim;
  /** The charge the player's fuzzball and its mates leave with, but a hot shot's. */
  readonly charge: number;
  /** Whether the player's fuzzball is a hot shot: charged to the most, keeping it, and turning off the floor once. */
  readonly hot: boolean;
  /** How many mates leave behind the player's fuzzball, with its charge. */
  readonly mates: number;
  /** How many friends leave behind the mates, plain. */
  readonly friends: number;
}

/** Holds what a flight is played by: the number it may be retuned by, and the kinds of brick and their traits' rules. */
export interface FlightRules {
  /** How far a fuzzball flies without taking a hit off a brick before it yawns. */
  readonly bored: number;
  readonly kinds: BrickKinds;
  readonly traits: TraitRules;
}

/** Describes a flight flown, and the wall it leaves. */
export interface Flown {
  readonly flight: Flight;
  /** The wall as the flight leaves it: each broken brick gone, each struck one with the hits it has left. */
  readonly wall: Wall;
}

/**
 * Returns the flight of a round's fuzzballs, flown from the floor along an
 * aim until the last lands and the zaps they set off have landed, and the
 * wall it leaves.
 *
 * It throws a `RangeError` for an aim that isn't one of the 657.
 */
export function fly(start: FlightStart, rules: FlightRules): Flown {
  return new Flying(start, rules).fly();
}

/** Names what a fuzzball does next: leaves, meets something, crosses into a cell, comes home, or lands from its drop. */
type Next = "launch" | "contact" | "entry" | "home" | "land";

/** Describes a fuzzball in flight, or waiting to leave. */
interface Ball {
  readonly ball: number;
  readonly role: BallRole;
  readonly launchAt: number;
  readonly hot: boolean;
  readonly waypoints: Waypoint[];
  /** What it meets as it flies on, cast into once its next moment is planned. */
  readonly contacts: Contacts;
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** The moment it is at its place. */
  at: number;
  charge: number;
  /** How many times it turns off the floor before it lands. */
  bounces: number;
  /** From when it has flown without taking a hit off a brick. */
  idleFrom: number;
  /** How many times running it has turned again where it turned, at the same moment. */
  still: number;
  /** When it last turned, or -1. */
  turnedAt: number;
  /** Whether it crosses into cells, as one out of a portal doesn't until it turns. */
  crosses: boolean;
  /** The cell it last crossed into, which it doesn't cross into again until it turns, or -1. */
  passing: number;
  /** Whether it has left. */
  launched: boolean;
  /** Whether it is dropping to the floor, home. */
  dropping: boolean;
  /** Whether its next moment is planned, which a change to the wall undoes. */
  planned: boolean;
  next: Next;
  nextAt: number;
}

/** Describes a zap or a blast waiting to land. */
interface Zap {
  readonly at: number;
  readonly cell: number;
  readonly pattern: ZapPattern;
  readonly hits: number;
  readonly reach: number;
}

/** Describes a split a brick's rule asked for, made once the fuzzball has turned. */
interface Split {
  readonly cell: number;
  readonly cos: number;
  readonly sin: number;
}

/** Describes an event, with where it goes among those of its moment. */
interface Keyed {
  readonly event: FlightEvent;
  /** 0 for a fuzzball's events, which go first, 1 for a zap's. */
  readonly section: number;
  /** The fuzzball's number, or the zap's cell. */
  readonly who: number;
  /** Where its kind goes among a fuzzball's at a moment. */
  readonly rank: number;
  /** The order it happened in, which keeps what a strike or a zap caused right after it. */
  readonly seq: number;
}

/** The order a fuzzball's events go in at one moment, `FlightEvent`'s order of kinds. */
const BALL_RANK = {
  launch: 0,
  turn: 1,
  strike: 2,
  recharge: 3,
  portal: 4,
  split: 5,
  yawn: 6,
  land: 7,
} as const;

/** A fuzzball's event. */
type BallEvent = Extract<FlightEvent, { readonly ball: number }>;

/** Describes a strike as its brick's rules see it, one record written for each. */
interface StruckScratch extends Struck {
  by: BreakCause;
  side: number;
  plates: number;
  charge: number;
  hot: boolean;
}

// What a fuzzball meets is cast into records made once, each handed back as
// its fuzzball lands, so a flight makes none once one has flown as many at
// once.
const spareContacts: Contacts[] = [];

/** Plays a flight through, keeping its state, and is the hooks its bricks' rules change it by. */
class Flying implements Hooks {
  private readonly field: CastField;
  private readonly bricks: (Brick | null)[];
  private readonly wall: Wall;
  /** Every fuzzball, by number. */
  private readonly balls: Ball[] = [];
  /** The fuzzballs not yet landed, by number. */
  private readonly flying: Ball[] = [];
  /** The zaps waiting to land, by moment, then by cell. */
  private readonly zaps: Zap[] = [];
  private readonly events: Keyed[] = [];
  /** The moment being played. */
  private now = 0;
  /** How many bricks the round has broken. */
  private broken = 0;
  /** How many events have happened. */
  private seq = 0;
  /** How many fuzzballs the caps brought home. */
  private capped = 0;
  // What a fuzzball meeting things gathers at its moment: the sums of the
  // normals of the faces, corners and kicks that turn it, with what it
  // turned off first; each brick it struck, and whether it passed through
  // it; and the splits asked of it.
  private faceX = 0;
  private faceY = 0;
  private faceOff: Contact | null = null;
  private cornerX = 0;
  private cornerY = 0;
  private cornerOff: Contact | null = null;
  private kickX = 0;
  private kickY = 0;
  private readonly struckCells: number[] = [];
  private readonly passedCells: boolean[] = [];
  private readonly splits: Split[] = [];
  // What is being played, for the hooks, each made only at some moments: a
  // fuzzball meeting what it meets, one crossing into a cell, or a zap
  // landing.
  private meeting: Ball | null = null;
  private entering: Ball | null = null;
  private zapping = false;
  /** What caused the breaks and frees being written, a strike or a zap, as {@link Keyed} places it. */
  private readonly cause = { section: 0, who: 0, rank: 0 };
  private readonly struck: StruckScratch = {
    by: "fuzzball",
    side: 0,
    plates: 0,
    charge: 0,
    hot: false,
    hurts: true,
    earths: false,
  };

  constructor(
    start: FlightStart,
    private readonly rules: FlightRules,
  ) {
    this.bricks = [...start.wall.bricks];
    this.wall = { ...start.wall, bricks: this.bricks };
    this.field = castField(this.wall, start.depth, rules.kinds);
    const heading = AIMS[start.aim];
    if (heading === undefined) {
      throw new RangeError(`No aim is numbered ${String(start.aim)}.`);
    }
    const [dx, dy] = heading;
    const leaving = 1 + start.mates + start.friends;
    for (let i = 0; i < leaving; i++) {
      const role = i === 0 ? "player" : i <= start.mates ? "mate" : "friend";
      const hot = i === 0 && start.hot;
      const charge = role === "friend" ? 0 : hot ? MOST_CHARGE : start.charge;
      this.make(role, start.x, RADIUS, dx, dy, i * LAUNCH_GAP, charge, hot);
    }
  }

  /** Flies the flight through, and returns it with the wall it leaves. */
  fly(): Flown {
    for (;;) {
      const ball = this.soonest();
      const zap = this.zaps[0];
      if (zap !== undefined && (ball === null || zap.at < ball.nextAt)) {
        this.zaps.shift();
        this.landZap(zap);
      } else if (ball === null) {
        break;
      } else {
        this.play(ball);
      }
      this.meeting = null;
      this.entering = null;
      this.zapping = false;
    }
    const events = this.events.sort(byMoment).map(({ event }) => event);
    const flight: Flight = {
      events,
      tracks: this.balls.map(({ ball, role, waypoints }) => ({
        ball,
        role,
        waypoints,
      })),
      length: events.reduce((last, { at }) => Math.max(last, at), 0),
      capped: this.capped,
    };
    return { flight, wall: this.wall };
  }

  split(ball: number, cell: number, cos: number, sin: number): void {
    if (this.isMeeting(ball, "split")) {
      this.splits.push({ cell, cos, sin });
    }
  }

  teleport(ball: number, from: number, to: number): void {
    const flier = this.entering;
    if (flier?.ball !== ball) {
      throw new Error(
        `A teleport is made only of a fuzzball crossing into a cell, not of fuzzball ${String(ball)} now.`,
      );
    }
    const twin = this.bricks[to];
    const row = fieldRowOf(this.wall, to);
    if (
      twin === null ||
      twin === undefined ||
      row < 0 ||
      row >= this.field.depth
    ) {
      return;
    }
    this.waypoint(flier);
    flier.x = columnOf(to) + 0.5;
    flier.y = row + 0.5;
    flier.crosses = false;
    this.emitBall({ at: this.now, kind: "portal", ball, from, to });
    flier.waypoints.push({ at: this.now, x: flier.x, y: flier.y });
  }

  kick(ball: number, nx: number, ny: number): void {
    if (this.isMeeting(ball, "kick")) {
      this.kickX += nx;
      this.kickY += ny;
    }
  }

  zap(cell: number, pattern: ZapPattern, hits: number, reach: number): void {
    this.zaps.push({ at: this.now + ZAP_DELAY, cell, pattern, hits, reach });
    this.zaps.sort((a, b) => a.at - b.at || a.cell - b.cell);
  }

  recharge(ball: number, cell: number): void {
    const flier = this.balls[ball];
    if (flier !== undefined) {
      flier.charge = MOST_CHARGE;
      this.emitBall({ at: this.now, kind: "recharge", ball, cell });
    }
  }

  free(cell: number, ink: number): void {
    if (this.meeting === null && !this.zapping) {
      throw new Error(
        `A friend is freed only as a brick breaks, not from cell ${String(cell)} now.`,
      );
    }
    this.emitCaused({ at: this.now, kind: "free", cell, ink });
  }

  /**
   * Returns whether a hook asked of a fuzzball is for the one meeting what
   * it meets, so it is made, or for none, as for a brick a zap breaks, so
   * it isn't; and throws for any other, which it can't be made for.
   */
  private isMeeting(ball: number, hook: string): boolean {
    if (ball < 0) {
      return false;
    }
    if (this.meeting !== null && this.meeting.ball === ball) {
      return true;
    }
    throw new Error(
      `A ${hook} is made only of a fuzzball meeting what it meets, not of fuzzball ${String(ball)} now.`,
    );
  }

  /** Makes a fuzzball, waiting to leave from a place along a heading at a moment, with a charge. */
  private make(
    role: BallRole,
    x: number,
    y: number,
    dx: number,
    dy: number,
    at: number,
    charge: number,
    hot: boolean,
  ): Ball {
    const ball: Ball = {
      ball: this.balls.length,
      role,
      launchAt: at,
      hot,
      waypoints: [],
      contacts: spareContacts.pop() ?? createContacts(),
      x,
      y,
      dx,
      dy,
      at,
      charge,
      bounces: hot ? HOT_BOUNCES : 0,
      idleFrom: at,
      still: 0,
      turnedAt: -1,
      crosses: true,
      passing: -1,
      launched: false,
      dropping: false,
      planned: true,
      next: "launch",
      nextAt: at,
    };
    this.balls.push(ball);
    this.flying.push(ball);
    return ball;
  }

  /** Returns the fuzzball whose next moment comes first, the lowest numbered of those whose come at once, or null once all have landed. */
  private soonest(): Ball | null {
    let soonest: Ball | null = null;
    for (const ball of this.flying) {
      if (!ball.planned) {
        this.plan(ball);
      }
      if (soonest === null || ball.nextAt < soonest.nextAt) {
        soonest = ball;
      }
    }
    return soonest;
  }

  /**
   * Plans what a fuzzball in flight does next: meets what it meets first,
   * crosses into a cell before it, or comes home, bored or capped, if it
   * meets nothing first.
   *
   * It casts to `AT_ONCE` past the moment it comes home, so what it meets
   * at that moment is gathered with all it meets at once; met only past
   * it, it isn't met at all.
   */
  private plan(ball: Ball): void {
    ball.planned = true;
    const home = Math.min(
      ball.idleFrom + this.rules.bored,
      ball.launchAt + MOST_FLIGHT,
    );
    const limit = Math.max(0, home - ball.at);
    const contacts = cast(
      this.field,
      ball.x,
      ball.y,
      ball.dx,
      ball.dy,
      limit + AT_ONCE,
      ball.contacts,
      ball.crosses,
      ball.passing,
    );
    // A cast that meets nothing stops at its limit, past this one.
    const metAt = contacts.distance <= limit ? contacts.distance : MISSED;
    if (contacts.enteredAt < metAt && contacts.enteredAt <= limit) {
      ball.next = "entry";
      ball.nextAt = ball.at + contacts.enteredAt;
    } else if (metAt === MISSED) {
      ball.next = "home";
      ball.nextAt = Math.max(home, ball.at);
    } else {
      ball.next = "contact";
      ball.nextAt = ball.at + metAt;
    }
  }

  /** Plays a fuzzball's next moment. */
  private play(ball: Ball): void {
    this.now = ball.nextAt;
    ball.planned = false;
    switch (ball.next) {
      case "launch":
        this.launch(ball);
        break;
      case "contact":
        this.meet(ball);
        break;
      case "entry":
        this.enter(ball);
        break;
      case "home":
        this.comeHome(ball, ball.nextAt >= ball.launchAt + MOST_FLIGHT);
        break;
      case "land":
        this.landHome(ball);
        break;
    }
  }

  /** Sends a fuzzball off from where it waits. */
  private launch(ball: Ball): void {
    ball.launched = true;
    const { x, y, dx, dy, charge, hot, role } = ball;
    this.emitBall({
      at: this.now,
      kind: "launch",
      ball: ball.ball,
      role,
      x,
      y,
      dx,
      dy,
      charge,
      hot,
    });
    this.waypoint(ball);
  }

  /**
   * Plays what a fuzzball meets at a moment: it lands on the floor, unless
   * it turns off it first; otherwise it strikes each brick it meets, then
   * turns off what didn't let it through, and leaves any splits asked of
   * it along its new heading.
   */
  private meet(ball: Ball): void {
    const { contacts } = ball;
    this.travel(ball, contacts.distance);
    this.meeting = ball;
    this.faceX = 0;
    this.faceY = 0;
    this.faceOff = null;
    this.cornerX = 0;
    this.cornerY = 0;
    this.cornerOff = null;
    this.kickX = 0;
    this.kickY = 0;
    this.struckCells.length = 0;
    this.passedCells.length = 0;
    this.splits.length = 0;
    let bounced = false;
    let index = 0;
    for (const met of contacts.met) {
      if (index === contacts.count) {
        break;
      }
      index++;
      switch (met.what) {
        case "floor":
          if (ball.bounces === 0) {
            this.landOn(ball);
            return;
          }
          bounced = true;
          this.turnFace(met);
          break;
        case "side":
        case "ceiling":
          this.turnFace(met);
          break;
        case "face":
        case "corner":
        case "bumper":
          this.meetBrick(ball, met);
          break;
      }
    }
    if (bounced) {
      ball.bounces--;
    }
    const off = this.turn(ball);
    if (off !== null) {
      ball.crosses = true;
      ball.passing = -1;
      ball.still = ball.at === ball.turnedAt ? ball.still + 1 : 0;
      ball.turnedAt = ball.at;
      this.emitBall({
        at: this.now,
        kind: "turn",
        ball: ball.ball,
        x: ball.x,
        y: ball.y,
        dx: ball.dx,
        dy: ball.dy,
        off,
      });
      this.waypoint(ball);
    }
    for (const split of this.splits) {
      this.spawn(ball, split);
    }
    if (ball.still >= STILL_TURNS) {
      this.comeHome(ball, true);
    }
  }

  /** Notes a face, a side wall, the ceiling or the floor a fuzzball turns off. */
  private turnFace({ what, nx, ny }: Readonly<Met>): void {
    this.faceX += nx;
    this.faceY += ny;
    this.faceOff ??= what;
  }

  /**
   * Strikes a brick a fuzzball meets, once a moment, and notes what of it
   * the fuzzball turns off, unless the strike let it through: a face, a
   * corner, or a disc, whose rules may kick it.
   */
  private meetBrick(ball: Ball, met: Readonly<Met>): void {
    const { what, cell, nx, ny } = met;
    if (this.strikeOnce(ball, met)) {
      return;
    }
    if (what === "face") {
      this.turnFace(met);
      return;
    }
    this.cornerX += nx;
    this.cornerY += ny;
    this.cornerOff ??= what;
    const brick = this.bricks[cell];
    if (what === "bumper" && brick !== null && brick !== undefined) {
      for (const trait of this.rules.kinds[brick.kind].traits) {
        this.metRule(ball.ball, nx, ny, trait.kind, trait);
      }
    }
  }

  /**
   * Turns a fuzzball off what it met at its moment, and returns what it
   * turned off, or null if it met nothing that turns it.
   *
   * A kick sends it along the kicks' sum, unless they cancel out. Otherwise
   * each face turns it as a mirror along its own axis, so two met at once at
   * a right angle send it back the way it came, and two met head on from
   * both sides cancel out; and only where no face turns it does a corner or
   * a disc, about the sum of their lines to its middle, each a unit long as
   * C5 says, which it flies into, as it met them.
   */
  private turn(ball: Ball): Contact | null {
    const kick = Math.sqrt(this.kickX * this.kickX + this.kickY * this.kickY);
    if (kick > 0) {
      ball.dx = this.kickX / kick;
      ball.dy = this.kickY / kick;
      return "bumper";
    }
    if (this.faceOff !== null) {
      if (ball.dx * this.faceX < 0) {
        ball.dx = -ball.dx;
      }
      if (ball.dy * this.faceY < 0) {
        ball.dy = -ball.dy;
      }
      return this.faceOff;
    }
    if (this.cornerOff !== null) {
      const { cornerX, cornerY } = this;
      const into = ball.dx * cornerX + ball.dy * cornerY;
      const scale = (2 * into) / (cornerX * cornerX + cornerY * cornerY);
      const dx = ball.dx - scale * cornerX;
      const dy = ball.dy - scale * cornerY;
      const length = Math.sqrt(dx * dx + dy * dy);
      ball.dx = dx / length;
      ball.dy = dy / length;
      return this.cornerOff;
    }
    return null;
  }

  /**
   * Strikes the brick a fuzzball meets, unless it struck it already at this
   * moment, and returns whether it passes through it: whether a charged
   * fuzzball broke it.
   */
  private strikeOnce(ball: Ball, { cell, side }: Readonly<Met>): boolean {
    const earlier = this.struckCells.indexOf(cell);
    const brick = this.bricks[cell];
    if (earlier >= 0 || brick === null || brick === undefined) {
      return this.passedCells[earlier] === true;
    }
    const kind = this.rules.kinds[brick.kind];
    this.struckBy("fuzzball", side, brick, kind, ball.charge, ball.hot);
    const { took, left, charge, earthed, passes } = strike(
      brick.hits,
      this.struck,
    );
    ball.charge = charge;
    if (took > 0) {
      ball.idleFrom = ball.at;
    }
    this.struckCells.push(cell);
    this.passedCells.push(passes);
    this.cause.section = 0;
    this.cause.who = ball.ball;
    this.cause.rank = BALL_RANK.strike;
    this.emitBall({
      at: this.now,
      kind: "strike",
      ball: ball.ball,
      cell,
      took,
      left,
      charge,
      earthed,
    });
    this.wear(cell, brick, kind, took, "fuzzball", ball.ball);
    return passes;
  }

  /**
   * Runs the rules a brick's kind has for a strike on it, and returns
   * whether the strike hurts it; whether it earths the charge is left in
   * {@link struck}.
   */
  private struckBy(
    by: BreakCause,
    side: number,
    brick: Brick,
    kind: BrickKind,
    charge: number,
    hot: boolean,
  ): boolean {
    const { struck } = this;
    struck.by = by;
    struck.side = side;
    struck.plates = brick.plates;
    struck.charge = charge;
    struck.hot = hot;
    struck.hurts = true;
    struck.earths = false;
    for (const trait of kind.traits) {
      this.struckRule(trait.kind, trait);
    }
    return struck.hurts;
  }

  /** Takes hits off a brick, breaking it if they are as many as it has, or more. */
  private wear(
    cell: number,
    brick: Brick,
    kind: BrickKind,
    took: number,
    by: BreakCause,
    ball: number,
  ): void {
    if (took === 0) {
      return;
    }
    const left = brick.hits - took;
    if (left > 0) {
      this.bricks[cell] = { ...brick, hits: left };
      return;
    }
    this.bricks[cell] = null;
    this.broken++;
    this.emitCaused({
      at: this.now,
      kind: "break",
      cell,
      brick: brick.kind,
      by,
      streak: this.broken,
      points: kind.points * brick.full * multiplierAt(this.broken, STREAK),
    });
    // A brick gone changes what the fuzzballs in flight meet next.
    for (const flier of this.flying) {
      if (flier.launched && !flier.dropping) {
        flier.planned = false;
      }
    }
    for (const trait of kind.traits) {
      this.brokenRule(cell, ball, trait.kind, trait);
    }
  }

  /** Sends out a split's fuzzballs from a fuzzball, each turned from its heading, as many as there is room for. */
  private spawn(from: Ball, { cell, cos, sin }: Split): void {
    const into: number[] = [];
    for (const sign of [1, -1]) {
      if (this.flying.length < MOST_FUZZBALLS) {
        const dx = from.dx * cos - sign * from.dy * sin;
        const dy = sign * from.dx * sin + from.dy * cos;
        const length = Math.sqrt(dx * dx + dy * dy);
        const ball = this.make(
          "split",
          from.x,
          from.y,
          dx / length,
          dy / length,
          from.at,
          0,
          false,
        );
        into.push(ball.ball);
      }
    }
    if (into.length > 0) {
      this.emitBall({
        at: this.now,
        kind: "split",
        ball: from.ball,
        cell,
        into,
      });
    }
  }

  /**
   * Moves a fuzzball's middle into the cell it crosses into, and runs the
   * rules of the brick there: it passes through the cell, which it doesn't
   * cross into again until it turns, unless a portal sends it out of its
   * twin.
   */
  private enter(ball: Ball): void {
    const { entered, enteredAt } = ball.contacts;
    this.travel(ball, enteredAt);
    ball.passing = entered;
    this.entering = ball;
    const brick = this.bricks[entered];
    if (brick !== null && brick !== undefined) {
      for (const trait of this.rules.kinds[brick.kind].traits) {
        this.enteredRule(ball.ball, entered, brick.twin, trait.kind, trait);
      }
    }
  }

  /** Moves a fuzzball on along its heading, a distance. */
  private travel(ball: Ball, distance: number): void {
    ball.x += ball.dx * distance;
    ball.y += ball.dy * distance;
    ball.at = this.now;
  }

  /**
   * Brings a fuzzball home from where it is at the moment: it yawns, and
   * drops straight to the floor through whatever lies between, counted if
   * a cap brought it.
   */
  private comeHome(ball: Ball, capped: boolean): void {
    this.travel(ball, this.now - ball.at);
    if (capped) {
      this.capped++;
    }
    this.emitBall({
      at: this.now,
      kind: "yawn",
      ball: ball.ball,
      x: ball.x,
      y: ball.y,
    });
    this.waypoint(ball);
    ball.dropping = true;
    ball.planned = true;
    ball.next = "land";
    ball.nextAt = this.now + (ball.y - RADIUS);
  }

  /** Lands a fuzzball dropping home. */
  private landHome(ball: Ball): void {
    ball.y = RADIUS;
    ball.at = this.now;
    this.landOn(ball);
  }

  /** Lands a fuzzball where it touches the floor, and hands back its record. */
  private landOn(ball: Ball): void {
    this.emitBall({ at: this.now, kind: "land", ball: ball.ball, x: ball.x });
    this.waypoint(ball);
    this.flying.splice(this.flying.indexOf(ball), 1);
    spareContacts.push(ball.contacts);
  }

  /** Lands a zap or a blast: it takes its hits off each brick in play its pattern reaches that its rules let it hurt. */
  private landZap({ at, cell, pattern, hits, reach }: Zap): void {
    this.now = at;
    this.zapping = true;
    const by: BreakCause = pattern === "blast" ? "blast" : "zap";
    const reaches = this.reachOf(cell, pattern, reach).filter((reached) => {
      const brick = this.bricks[reached];
      return (
        brick !== null &&
        brick !== undefined &&
        this.struckBy(by, 0, brick, this.rules.kinds[brick.kind], 0, false)
      );
    });
    this.cause.section = 1;
    this.cause.who = cell;
    this.cause.rank = 0;
    this.emitCaused({ at, kind: "zap", cell, pattern, reaches });
    for (const reached of reaches) {
      const brick = this.bricks[reached];
      if (brick !== null && brick !== undefined) {
        const kind = this.rules.kinds[brick.kind];
        this.wear(reached, brick, kind, hits, by, -1);
      }
    }
  }

  /**
   * Returns the cells in play a zap's pattern reaches from a cell, by cell,
   * `reach` cells each way at most: its row's, its column's, both, its
   * diagonals', or every cell around it for a blast.
   */
  private reachOf(cell: number, pattern: ZapPattern, reach: number): number[] {
    const column = columnOf(cell);
    const row = fieldRowOf(this.wall, cell);
    const cells: number[] = [];
    if (pattern === "blast") {
      for (let up = -reach; up <= reach; up++) {
        for (let across = -reach; across <= reach; across++) {
          if (across !== 0 || up !== 0) {
            this.reachTo(column + across, row + up, cells);
          }
        }
      }
    } else {
      for (const [across, up] of RAYS[pattern]) {
        for (let step = 1; step <= reach; step++) {
          this.reachTo(column + across * step, row + up * step, cells);
        }
      }
    }
    return cells.sort((a, b) => a - b);
  }

  /** Adds a field cell's wall cell to a zap's, if a brick in play stands in it. */
  private reachTo(column: number, row: number, cells: number[]): void {
    if (brickAt(this.wall, this.field.depth, column, row) !== null) {
      cells.push(cellAt(this.wall, column, row));
    }
  }

  /** Adds a fuzzball's place at the moment to its track, unless it is there already. */
  private waypoint(ball: Ball): void {
    const last = ball.waypoints.at(-1);
    if (last?.at !== this.now) {
      ball.waypoints.push({ at: this.now, x: ball.x, y: ball.y });
    }
  }

  /** Adds a fuzzball's event, which goes among its moment's by fuzzball, then by kind. */
  private emitBall(event: BallEvent): void {
    this.events.push({
      event,
      section: 0,
      who: event.ball,
      rank: BALL_RANK[event.kind],
      seq: this.seq++,
    });
  }

  /** Adds an event a strike or a zap caused, or the zap itself, which goes right after its cause. */
  private emitCaused(event: FlightEvent): void {
    const { section, who, rank } = this.cause;
    this.events.push({ event, section, who, rank, seq: this.seq++ });
  }

  /** Runs one trait's rule for a strike, if it has one. */
  private struckRule<K extends TraitKind>(kind: K, trait: TraitOf[K]): void {
    this.rules.traits[kind].struck?.(this.struck, trait);
  }

  /** Runs one trait's rule for a break, if it has one. */
  private brokenRule<K extends TraitKind>(
    cell: number,
    ball: number,
    kind: K,
    trait: TraitOf[K],
  ): void {
    this.rules.traits[kind].broken?.(this, cell, ball, trait);
  }

  /** Runs one trait's rule for a fuzzball meeting its disc, if it has one. */
  private metRule<K extends TraitKind>(
    ball: number,
    nx: number,
    ny: number,
    kind: K,
    trait: TraitOf[K],
  ): void {
    this.rules.traits[kind].met?.(this, ball, nx, ny, trait);
  }

  /** Runs one trait's rule for a fuzzball crossing into its cell, if it has one. */
  private enteredRule<K extends TraitKind>(
    ball: number,
    cell: number,
    twin: number | null,
    kind: K,
    trait: TraitOf[K],
  ): void {
    this.rules.traits[kind].entered?.(this, ball, cell, twin, trait);
  }
}

/** The ways a zap's pattern reaches out from its cell, a cell at a time, a blast's but reaching every cell around it. */
const RAYS: Readonly<
  Record<Exclude<ZapPattern, "blast">, readonly (readonly [number, number])[]>
> = {
  row: [
    [-1, 0],
    [1, 0],
  ],
  column: [
    [0, -1],
    [0, 1],
  ],
  cross: [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ],
  x: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
};

/**
 * Returns where an event goes in a flight: by moment, the fuzzballs' before
 * the zaps', then by fuzzball or zap, by kind, and by when it happened, so
 * what a strike or a zap caused stays right after it; a total order, as
 * the implementation plan's §5.6 asks.
 */
function byMoment(a: Keyed, b: Keyed): number {
  return (
    a.event.at - b.event.at ||
    a.section - b.section ||
    a.who - b.who ||
    a.rank - b.rank ||
    a.seq - b.seq
  );
}
