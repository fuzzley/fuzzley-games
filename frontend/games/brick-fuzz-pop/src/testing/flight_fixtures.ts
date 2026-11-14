// Rounds made by hand, as playRound() will play them, for the view, the
// scene, the shell and the run to build against before the flight is
// written, and the checks that hold a flight to the order and the paths
// src/rules/flight/events.ts describes, which hold fly()'s flights once it
// is. Each round is played on a field 11 deep but the bored one, its wall
// drawn as a picture by wallFrom(), its places worked out by hand and its
// moments from them.

import { clamp, multiplierAt } from "@fz/core/math";
import { type BrickKindId, brickKind } from "../rules/catalog/bricks";
import type {
  BallRole,
  BallTrack,
  BreakCause,
  Flight,
  FlightEvent,
  TurnOff,
  Waypoint,
  ZapPattern,
} from "../rules/flight/events";
import type {
  Round,
  RoundOutcome,
  RoundResult,
  RoundStart,
} from "../rules/round/round";
import type { Boon, Charge, Shot } from "../rules/shot";
import {
  AIMS_PER_DEGREE,
  BORED,
  COLUMNS,
  FIRST_AIM_DEGREES,
  JUMP_POINTS,
  LAUNCH_GAP,
  RADIUS,
  SIDE_MARGIN,
  STREAK,
  ZAP_DELAY,
  ZAP_HITS,
} from "../rules/tuning";
import type { Wall } from "../rules/wall/wall";
import { wallFrom } from "./wall_picture";

/** Describes a round made by hand: where it starts, its shot, the level's boon, and the round it plays. */
export interface FlightFixture {
  readonly start: RoundStart;
  readonly shot: Shot;
  readonly levelBoon: Boon;
  readonly round: Round;
}

/** The order a fuzzball's events go in at one moment, the order `FlightEvent` lists their kinds in. */
const BALL_ORDER = {
  launch: 0,
  turn: 1,
  strike: 2,
  recharge: 3,
  portal: 4,
  split: 5,
  yawn: 6,
  land: 7,
} as const;

/** An event that breaks a brick or frees a friend, which follows what caused it. */
type Caused = Extract<FlightEvent, { readonly kind: "break" | "free" }>;

/** An event that causes breaks and frees at its moment: a strike or a zap. */
type Cause = Extract<FlightEvent, { readonly kind: "strike" | "zap" }>;

/**
 * Returns what is out of order in a flight's events, as `Flight.events`
 * orders them, a sentence for each: none for a flight in order.
 *
 * At one moment, the fuzzballs' events go first, by ball, then in their
 * kinds' order, each strike followed by the brick it broke and the friend
 * that brick freed; then the zaps that land then, by cell, each followed by
 * the bricks it broke and the friends they freed, by cell, a cell's break
 * before its free. A fuzzball's events lie between its launch and its
 * landing, and every fuzzball launched lands.
 */
export function orderProblemsOf(events: readonly FlightEvent[]): string[] {
  const problems: string[] = [];
  const launched = new Set<number>();
  const landed = new Set<number>();
  let moment = Number.NEGATIVE_INFINITY;
  // What came last at the moment, each -Infinity before anything has: the
  // fuzzball and its event's rank, and the zap; and the cell and rank (a
  // break 0, a free 1) of what the last strike or zap caused, which every
  // event of a fuzzball and every zap sets back.
  let lastBall = Number.NEGATIVE_INFINITY;
  let lastRank = 0;
  let lastZap = Number.NEGATIVE_INFINITY;
  let cause: Cause | null = null;
  let lastCell = Number.NEGATIVE_INFINITY;
  let lastCausedRank = 0;
  for (const [index, event] of events.entries()) {
    const named = `Event ${index}, a ${event.kind} at ${event.at},`;
    if (!(event.at >= moment)) {
      problems.push(`${named} comes before the moment of the one before it.`);
    }
    if (event.at !== moment) {
      moment = event.at;
      lastBall = Number.NEGATIVE_INFINITY;
      lastZap = Number.NEGATIVE_INFINITY;
      cause = null;
    }
    switch (event.kind) {
      case "break":
      case "free": {
        const rank = event.kind === "break" ? 0 : 1;
        if (cause === null) {
          problems.push(`${named} follows no strike or zap at its moment.`);
        } else {
          problems.push(...causeProblems(named, event, cause));
        }
        if (
          event.cell < lastCell ||
          (event.cell === lastCell && rank <= lastCausedRank)
        ) {
          problems.push(`${named} is out of order by cell after its cause.`);
        }
        if (
          event.kind === "free" &&
          (event.cell !== lastCell || lastCausedRank !== 0)
        ) {
          problems.push(`${named} follows no break of its cage.`);
        }
        lastCell = event.cell;
        lastCausedRank = rank;
        break;
      }
      case "zap": {
        if (event.cell <= lastZap) {
          problems.push(`${named} lands out of order by cell.`);
        }
        if (!isAscending(event.reaches)) {
          problems.push(`${named} lists the cells it reaches out of order.`);
        }
        lastZap = event.cell;
        cause = event;
        lastCell = Number.NEGATIVE_INFINITY;
        break;
      }
      default: {
        const rank = BALL_ORDER[event.kind];
        const { ball } = event;
        if (lastZap > Number.NEGATIVE_INFINITY) {
          problems.push(`${named} comes after a zap at its moment.`);
        }
        if (ball < lastBall || (ball === lastBall && rank < lastRank)) {
          problems.push(`${named} is out of order by fuzzball and kind.`);
        }
        if (event.kind === "launch") {
          if (launched.has(ball)) {
            problems.push(`${named} launches fuzzball ${ball} again.`);
          }
          launched.add(ball);
        } else if (!launched.has(ball)) {
          problems.push(`${named} is of fuzzball ${ball}, which hasn't left.`);
        }
        if (landed.has(ball)) {
          problems.push(`${named} is of fuzzball ${ball}, which has landed.`);
        }
        if (event.kind === "land") {
          landed.add(ball);
        }
        lastBall = ball;
        lastRank = rank;
        cause = event.kind === "strike" ? event : null;
        lastCell = Number.NEGATIVE_INFINITY;
      }
    }
  }
  for (const ball of launched) {
    if (!landed.has(ball)) {
      problems.push(`Fuzzball ${ball} never lands.`);
    }
  }
  return problems;
}

/** Returns what is wrong with a break or a free as its cause's: a cell the cause doesn't reach, or a break by another cause. */
function causeProblems(named: string, event: Caused, cause: Cause): string[] {
  const problems: string[] = [];
  const reached =
    cause.kind === "strike"
      ? event.cell === cause.cell
      : cause.reaches.includes(event.cell);
  if (!reached) {
    problems.push(`${named} is of a cell its ${cause.kind} doesn't reach.`);
  }
  const by: BreakCause =
    cause.kind === "strike"
      ? "fuzzball"
      : cause.pattern === "blast"
        ? "blast"
        : "zap";
  if (event.kind === "break" && event.by !== by) {
    problems.push(`${named} is by ${event.by}, not ${by}.`);
  }
  return problems;
}

/** Returns whether numbers rise, each above the one before. */
function isAscending(numbers: readonly number[]): boolean {
  return numbers.every((n, i) => i === 0 || n > (numbers[i - 1] ?? n));
}

/** How far a place or a length may stray from another, for the rounding of the arithmetic that found them. */
const NEAR = 1e-9;

/**
 * Returns what is wrong with a flight's paths against its events, a
 * sentence for each: none for a flight whose fuzzballs fly as its events
 * say.
 *
 * Each fuzzball launched has a track, the tracks listed by ball; it leaves
 * from its launch's place, heading along its first leg, and lands where its
 * landing says, on the floor; its waypoints are joined at a unit a unit,
 * but at a portal, whose two places share a moment; each place between is a
 * turn's, heading along the next leg, a yawn's or a portal's; and the
 * flight is as long as its last event. A fuzzball that turns again where
 * it stands, at the same moment, as into a corner, turns at one waypoint,
 * and only its last turn there heads along the next leg.
 */
export function trackProblemsOf(flight: Flight): string[] {
  const problems: string[] = [];
  const launches = flight.events.filter(({ kind }) => kind === "launch");
  if (launches.length !== flight.tracks.length) {
    problems.push(
      `The flight tracks ${flight.tracks.length} fuzzballs and launches ${launches.length}.`,
    );
  }
  for (const [index, track] of flight.tracks.entries()) {
    if (track.ball !== index) {
      problems.push(`Track ${index} is fuzzball ${track.ball}'s.`);
    }
    problems.push(...legProblems(track, flight.events));
  }
  for (const [index, event] of flight.events.entries()) {
    if (!("ball" in event)) {
      continue;
    }
    const named = `Event ${index}, a ${event.kind} at ${event.at},`;
    const track = flight.tracks[event.ball];
    if (track === undefined) {
      problems.push(
        `${named} is of fuzzball ${event.ball}, which has no track.`,
      );
      continue;
    }
    const at = waypointAt(track, event.at);
    switch (event.kind) {
      case "launch":
        if (track.role !== event.role || at !== track.waypoints[0]) {
          problems.push(`${named} isn't where a ${event.role}'s track starts.`);
        }
        problems.push(
          ...placeProblems(named, at, event),
          ...headingProblems(named, track, at, event),
        );
        break;
      case "turn":
        problems.push(
          ...placeProblems(named, at, event),
          ...(turnsAgain(flight.events, index, event)
            ? []
            : headingProblems(named, track, at, event)),
        );
        break;
      case "yawn":
        problems.push(...placeProblems(named, at, event));
        break;
      case "land":
        if (at !== track.waypoints.at(-1)) {
          problems.push(`${named} isn't where its track ends.`);
        }
        problems.push(...placeProblems(named, at, { x: event.x, y: RADIUS }));
        break;
      default:
        break;
    }
  }
  const moments = flight.events.map(({ at }) => at);
  if (flight.length !== Math.max(0, ...moments)) {
    problems.push(
      `The flight is ${flight.length} long, not as long as its last event.`,
    );
  }
  if (!Number.isInteger(flight.capped) || flight.capped < 0) {
    problems.push(`The flight brings ${flight.capped} fuzzballs home early.`);
  }
  return problems;
}

/** Returns what is wrong with a track's legs: one flown at another speed, or a place no event explains. */
function legProblems(
  track: BallTrack,
  events: readonly FlightEvent[],
): string[] {
  const problems: string[] = [];
  const { ball, waypoints } = track;
  for (const [index, to] of waypoints.entries()) {
    const from = waypoints[index - 1];
    if (from === undefined) {
      continue;
    }
    const ballsAt = events.filter(
      (event) => event.at === to.at && "ball" in event && event.ball === ball,
    );
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const flown =
      to.at === from.at
        ? ballsAt.some(({ kind }) => kind === "portal")
        : Math.abs(length - (to.at - from.at)) <= NEAR;
    if (!flown) {
      problems.push(
        `Fuzzball ${ball}'s leg to ${to.at} isn't flown at a unit a unit.`,
      );
    }
    const explained = ballsAt.some(
      ({ kind }) =>
        kind === "turn" ||
        kind === "yawn" ||
        kind === "portal" ||
        kind === "land",
    );
    if (!explained) {
      problems.push(`Fuzzball ${ball}'s place at ${to.at} is no event's.`);
    }
  }
  return problems;
}

/** Returns a track's waypoint at a moment, the later of two that share it, or null. */
function waypointAt(track: BallTrack, at: number): Waypoint | null {
  for (let i = track.waypoints.length - 1; i >= 0; i--) {
    const waypoint = track.waypoints[i];
    if (waypoint?.at === at) {
      return waypoint;
    }
  }
  return null;
}

/** Returns what is wrong with an event's place: no waypoint at its moment, or another place than the waypoint's. */
function placeProblems(
  named: string,
  at: Waypoint | null,
  place: { readonly x: number; readonly y: number },
): string[] {
  if (at === null) {
    return [`${named} is at no waypoint of its fuzzball's.`];
  }
  return Math.abs(at.x - place.x) > NEAR || Math.abs(at.y - place.y) > NEAR
    ? [`${named} is at (${place.x}, ${place.y}), not its waypoint's place.`]
    : [];
}

/** Returns whether a fuzzball turns again after its turn at an index of a flight's events, at the same moment. */
function turnsAgain(
  events: readonly FlightEvent[],
  index: number,
  { at, ball }: { readonly at: number; readonly ball: number },
): boolean {
  for (let later = index + 1; events[later]?.at === at; later++) {
    const event = events[later];
    if (event?.kind === "turn" && event.ball === ball) {
      return true;
    }
  }
  return false;
}

/**
 * Returns what is wrong with an event's heading: not a unit long, or
 * another way than its track's next leg goes.
 *
 * It measures how far the leg's end lies off the heading's line, rather
 * than the leg's own heading, which a short leg late in a flight rounds
 * past `NEAR`.
 */
function headingProblems(
  named: string,
  track: BallTrack,
  at: Waypoint | null,
  { dx, dy }: { readonly dx: number; readonly dy: number },
): string[] {
  const next =
    at === null ? undefined : track.waypoints[track.waypoints.indexOf(at) + 1];
  if (at === null || next === undefined) {
    return [];
  }
  const across = next.x - at.x;
  const up = next.y - at.y;
  const off = Math.abs(dx * up - dy * across);
  const along = dx * across + dy * up;
  return Math.abs(Math.hypot(dx, dy) - 1) > NEAR || off > NEAR || along <= 0
    ? [`${named} heads another way than its track's next leg.`]
    : [];
}

/** A place in the field, x across from the left wall and y up from the floor. */
type Place = readonly [x: number, y: number];

/** Describes a fuzzball's heading: how far across and up it flies in a unit. */
interface Heading {
  readonly dx: number;
  readonly dy: number;
}

/** Returns a value a fixture's drawing promises, throwing if the fixture is drawn wrong. */
function sure<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new RangeError("A flight fixture is drawn wrong.");
  }
  return value;
}

/** Returns a shot at an angle, in degrees counter-clockwise from the floor on the right, with a charge. */
function shotAt(degrees: number, charge: Charge): Shot {
  return { aim: (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE, charge };
}

/** Returns a fuzzball's waypoints through places, leaving at a moment and flying a unit a unit. */
function pathOf(at: number, places: readonly Place[]): Waypoint[] {
  let flown = at;
  return places.map(([x, y], index) => {
    const [fromX, fromY] = places[index - 1] ?? [x, y];
    flown += Math.hypot(x - fromX, y - fromY);
    return { at: flown, x, y };
  });
}

/** Returns the moment a fuzzball passes a place on the leg of its path from its waypoint `index`. */
function atOn(path: readonly Waypoint[], index: number, [x, y]: Place): number {
  const from = sure(path[index]);
  return from.at + Math.hypot(x - from.x, y - from.y);
}

/** Returns a fuzzball's heading on the leg of its path from its waypoint `index`. */
function headingOn(path: readonly Waypoint[], index: number): Heading {
  const from = sure(path[index]);
  const to = sure(path[index + 1]);
  const span = to.at - from.at;
  return { dx: (to.x - from.x) / span, dy: (to.y - from.y) / span };
}

/** Returns a fuzzball's launch from the start of its path. */
function launchOf(
  ball: number,
  role: BallRole,
  path: readonly Waypoint[],
  charge: number,
  hot = false,
): FlightEvent {
  const { at, x, y } = sure(path[0]);
  const { dx, dy } = headingOn(path, 0);
  return { at, kind: "launch", ball, role, x, y, dx, dy, charge, hot };
}

/** Returns a fuzzball's turn at its waypoint `index`, off what it met. */
function turnOf(
  ball: number,
  path: readonly Waypoint[],
  index: number,
  off: TurnOff,
): FlightEvent {
  const { at, x, y } = sure(path[index]);
  const { dx, dy } = headingOn(path, index);
  return { at, kind: "turn", ball, x, y, dx, dy, off };
}

/** Returns a fuzzball's landing at the end of its path. */
function landOf(ball: number, path: readonly Waypoint[]): FlightEvent {
  const { at, x } = sure(path.at(-1));
  return { at, kind: "land", ball, x };
}

/** Returns a strike, which takes hits off a brick, leaves it some, and leaves the fuzzball a charge. */
function strikeOf(
  at: number,
  ball: number,
  cell: number,
  [took, left]: readonly [took: number, left: number],
  charge: number,
): FlightEvent {
  return { at, kind: "strike", ball, cell, took, left, charge, earthed: false };
}

/**
 * Returns a break, scored as plan.md's "The feel, in numbers" scores one:
 * its kind's points for each hit it had whole, times the streak's
 * multiplier.
 */
function breakOf(
  at: number,
  cell: number,
  [brick, full]: readonly [brick: BrickKindId, full: number],
  by: BreakCause,
  streak: number,
): FlightEvent {
  const points = brickKind(brick).points * full * multiplierAt(streak, STREAK);
  return { at, kind: "break", cell, brick, by, streak, points };
}

/** Returns a zap, which lands half a unit after the break that set it off. */
function zapOf(
  brokeAt: number,
  cell: number,
  pattern: ZapPattern,
  reaches: readonly number[],
): FlightEvent {
  return { at: brokeAt + ZAP_DELAY, kind: "zap", cell, pattern, reaches };
}

/**
 * Returns the wall a round leaves: each brick struck with the hits its last
 * strike left, each brick a zap reached with the zap's hits taken off, each
 * broken or sunk brick gone, and the wall come down.
 */
function wallAfter(
  wall: Wall,
  events: readonly FlightEvent[],
  rowsDown: number,
  sunk: readonly number[],
): Wall {
  const hits = wall.bricks.map((brick) => brick?.hits ?? 0);
  const gone = new Set(sunk);
  for (const event of events) {
    if (event.kind === "strike") {
      hits[event.cell] = event.left;
    } else if (event.kind === "zap") {
      for (const cell of event.reaches) {
        hits[cell] = Math.max(0, sure(hits[cell]) - ZAP_HITS);
      }
    } else if (event.kind === "break") {
      gone.add(event.cell);
    }
  }
  return {
    bricks: wall.bricks.map((brick, cell) =>
      brick === null || gone.has(cell)
        ? null
        : { ...brick, hits: sure(hits[cell]) },
    ),
    rows: wall.rows,
    lowestRow: wall.lowestRow - rowsDown,
  };
}

/** Describes a round made by hand, which {@link played} makes a fixture of. */
interface Played {
  readonly start: RoundStart;
  readonly shot: Shot;
  readonly levelBoon: Boon;
  /** Each fuzzball's events, and each zap after the break that set it off, in order at each moment. */
  readonly events: readonly FlightEvent[];
  readonly tracks: readonly BallTrack[];
  readonly rowsDown: number;
  readonly jumped: boolean;
  readonly result: RoundResult;
  /** The cells of the bricks the wall's step sank into the floor. */
  readonly sunk?: readonly number[];
}

/**
 * Returns the fixture of a round made by hand: its events by moment, what
 * it came to, counted from them, and the next round's start, where the
 * player's fuzzball landed, held off the side walls, with the wall the
 * round leaves and the level's boon if the wall jumped.
 */
function played({
  start,
  shot,
  levelBoon,
  events,
  tracks,
  rowsDown,
  jumped,
  result,
  sunk = [],
}: Played): FlightFixture {
  // A stable sort, which keeps the order each moment's events are written in.
  const ordered = [...events].sort((a, b) => a.at - b.at);
  const breaks = ordered.flatMap((event) =>
    event.kind === "break" ? [event] : [],
  );
  const landings = ordered.flatMap((event) =>
    event.kind === "land" ? [event] : [],
  );
  const outcome: RoundOutcome = {
    broken: breaks.length,
    points: breaks.reduce(
      (sum, { points }) => sum + points,
      jumped ? JUMP_POINTS : 0,
    ),
    rowsDown,
    jumped,
    freed: ordered.filter(({ kind }) => kind === "free").length,
    result,
  };
  const flight: Flight = {
    events: ordered,
    tracks,
    length: Math.max(...ordered.map(({ at }) => at)),
    capped: 0,
  };
  const waits = sure(landings.find(({ ball }) => ball === 0)).x;
  const next: RoundStart = {
    wall: wallAfter(start.wall, ordered, rowsDown, sunk),
    depth: start.depth,
    x: clamp(waits, SIDE_MARGIN, COLUMNS - SIDE_MARGIN),
    crew: start.crew,
    boon: jumped ? levelBoon : null,
  };
  return { start, shot, levelBoon, round: { flight, outcome, next } };
}

/** Returns where a level's round starts on a field 11 deep, its fuzzball waiting at the floor's middle. */
function startOn(
  wall: Wall,
  {
    friends = [],
    boon = null,
  }: { friends?: number[]; boon?: Boon | null } = {},
): RoundStart {
  return { wall, depth: 11, x: 4.5, crew: { friends }, boon };
}

// The places most of the rounds pass: where the fuzzball waits, the right
// wall it meets at 45°, and the places under the bricks of the diagonal it
// then climbs, at column 8 of row 5, column 7 of row 6 and column 6 of
// row 7.
const WAITS: Place = [4.5, RADIUS];
const RIGHT_WALL: Place = [8.75, 4.5];
const UNDER_8_5: Place = [8.5, 4.75];
const UNDER_7_6: Place = [7.5, 5.75];
const UNDER_6_7: Place = [6.5, 6.75];

/** The path of a plain shot at 45° that turns off the brick at column 8 of row 5 and lands at x = 4. */
const OFF_8_5: readonly Place[] = [WAITS, RIGHT_WALL, UNDER_8_5, [4, RADIUS]];

/** The moment a shot along {@link OFF_8_5} strikes the brick at column 8 of row 5. */
const STRUCK_8_5 = sure(pathOf(0, OFF_8_5)[2]).at;

/**
 * Returns a plain shot at 45° that strikes the brick at column 8 of row 5,
 * wall cell 8 of a wall whose lowest row is row 5, takes hits off it and
 * leaves it some, followed by what breaking it set off, and turns.
 */
function offTheCorner(
  wall: Wall,
  hits: readonly [took: number, left: number],
  broke: readonly FlightEvent[],
): Pick<Played, "start" | "shot" | "levelBoon" | "events" | "tracks"> {
  const path = pathOf(0, OFF_8_5);
  return {
    start: startOn(wall),
    shot: shotAt(45, 0),
    levelBoon: "hot",
    events: [
      launchOf(0, "player", path, 0),
      turnOf(0, path, 1, "side"),
      turnOf(0, path, 2, "face"),
      strikeOf(STRUCK_8_5, 0, 8, hits, 0),
      ...broke,
      landOf(0, path),
    ],
    tracks: [{ ball: 0, role: "player", waypoints: path }],
  };
}

/** A plain shot wears a tough brick, which holds, and turns off its face. */
function plain(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "ooooooooo",
      "222222222",
      "ooooooooo",
      ".........",
      ".........",
      ".........",
      "o.......2",
    ],
    { lowestRow: 5 },
  );
  return played({
    ...offTheCorner(wall, [1, 1], []),
    rowsDown: 1,
    jumped: false,
    result: "on",
  });
}

/** A shot of charge 2 punches through a brick, unturned, and spends the rest on a tough one, which turns it. */
function punch(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "ooooooooo",
      "2o2o2o2o2",
      "ooooooooo",
      ".........",
      ".......3.",
      "........o",
    ],
    { lowestRow: 5 },
  );
  const path = pathOf(0, [WAITS, RIGHT_WALL, UNDER_7_6, [2, RADIUS]]);
  const punched = atOn(path, 1, UNDER_8_5);
  const struck = sure(path[2]).at;
  return played({
    start: startOn(wall),
    shot: shotAt(45, 2),
    levelBoon: "hot",
    events: [
      launchOf(0, "player", path, 2),
      turnOf(0, path, 1, "side"),
      strikeOf(punched, 0, 8, [1, 0], 1),
      breakOf(punched, 8, ["brick", 1], "fuzzball", 1),
      turnOf(0, path, 2, "face"),
      strikeOf(struck, 0, 16, [1, 2], 0),
      landOf(0, path),
    ],
    tracks: [{ ball: 0, role: "player", waypoints: path }],
    rowsDown: 1,
    jumped: false,
    result: "on",
  });
}

/** A shot of charge 5 punches through three bricks to the space behind the wall, and turns off the ceiling and a side wall. */
function punchThrough(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "222222222",
      "o...ooooo",
      ".....oooo",
      "..o...ooo",
      "...o..ooo",
      ".......oo",
      ".....o..o",
    ],
    { lowestRow: 5 },
  );
  const path = pathOf(0, [
    WAITS,
    RIGHT_WALL,
    [2.5, 10.75],
    [0.25, 8.5],
    [8.5, RADIUS],
  ]);
  const first = atOn(path, 1, UNDER_8_5);
  const second = atOn(path, 1, UNDER_7_6);
  const third = atOn(path, 1, UNDER_6_7);
  return played({
    start: startOn(wall),
    shot: shotAt(45, 5),
    levelBoon: "hot",
    events: [
      launchOf(0, "player", path, 5),
      turnOf(0, path, 1, "side"),
      strikeOf(first, 0, 8, [1, 0], 4),
      breakOf(first, 8, ["brick", 1], "fuzzball", 1),
      strikeOf(second, 0, 16, [1, 0], 3),
      breakOf(second, 16, ["brick", 1], "fuzzball", 2),
      strikeOf(third, 0, 24, [1, 0], 2),
      breakOf(third, 24, ["brick", 1], "fuzzball", 3),
      turnOf(0, path, 2, "ceiling"),
      turnOf(0, path, 3, "side"),
      landOf(0, path),
    ],
    tracks: [{ ball: 0, role: "player", waypoints: path }],
    rowsDown: 1,
    jumped: false,
    result: "on",
  });
}

/**
 * A plain shot breaks a row zapper, whose zap passes the steel and breaks
 * the rest of its row half a unit later, which leaves nothing the level
 * needs under the jump line: the wall jumps.
 */
function zap(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "ooooooooo",
      "2o2o2o2o2",
      "ooooooooo",
      ".........",
      ".........",
      "o2#o....-",
    ],
    { lowestRow: 5 },
  );
  const zapped = STRUCK_8_5 + ZAP_DELAY;
  return played({
    ...offTheCorner(
      wall,
      [1, 0],
      [
        breakOf(STRUCK_8_5, 8, ["rowZapper", 1], "fuzzball", 1),
        zapOf(STRUCK_8_5, 8, "row", [0, 1, 3]),
        breakOf(zapped, 0, ["brick", 1], "zap", 2),
        breakOf(zapped, 1, ["tough", 2], "zap", 3),
        breakOf(zapped, 3, ["brick", 1], "zap", 4),
      ],
    ),
    rowsDown: 3,
    jumped: true,
    result: "on",
  });
}

/**
 * A plain shot breaks a column zapper, whose zap passes the steel over it,
 * breaks three bricks and wears a fourth, as far as the ceiling, and leaves
 * the brick waiting over the ceiling whole.
 */
function columnZap(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "oooooooo3",
      "2o2o2o2oo",
      "oooooooo2",
      "........#",
      "........o",
      "oo......|",
    ],
    { lowestRow: 5 },
  );
  const zapped = STRUCK_8_5 + ZAP_DELAY;
  return played({
    ...offTheCorner(
      wall,
      [1, 0],
      [
        breakOf(STRUCK_8_5, 8, ["columnZapper", 1], "fuzzball", 1),
        zapOf(STRUCK_8_5, 8, "column", [17, 35, 44, 53]),
        breakOf(zapped, 17, ["brick", 1], "zap", 2),
        breakOf(zapped, 35, ["tough", 2], "zap", 3),
        breakOf(zapped, 44, ["brick", 1], "zap", 4),
      ],
    ),
    rowsDown: 1,
    jumped: false,
    result: "on",
  });
}

/**
 * A hot shot punches through a brick, turns off steel without losing its
 * charge, and lands at its first touch of the floor, as any fuzzball does;
 * the wall's step sinks the low steel into the floor.
 */
function hotShot(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "ooooooooo",
      "ooooooooo",
      "2o2o2o2o2",
      "ooooooooo",
      ".......#.",
      "........o",
      ".........",
      ".........",
      ".........",
      ".#.......",
    ],
    { lowestRow: 1 },
  );
  const path = pathOf(0, [WAITS, RIGHT_WALL, UNDER_7_6, [2, RADIUS]]);
  const punched = atOn(path, 1, UNDER_8_5);
  return played({
    start: startOn(wall, { boon: "hot" }),
    shot: shotAt(45, 2),
    levelBoon: "hot",
    events: [
      launchOf(0, "player", path, 5, true),
      turnOf(0, path, 1, "side"),
      strikeOf(punched, 0, 44, [1, 0], 5),
      breakOf(punched, 44, ["brick", 1], "fuzzball", 1),
      turnOf(0, path, 2, "face"),
      strikeOf(sure(path[2]).at, 0, 52, [0, 0], 5),
      landOf(0, path),
    ],
    tracks: [{ ball: 0, role: "player", waypoints: path }],
    rowsDown: 1,
    jumped: false,
    result: "on",
    sunk: [1],
  });
}

/**
 * A triple shot: the player's fuzzball breaks a brick, and its two mates,
 * leaving behind it, fly on through its place to a tough brick, which the
 * first wears and the second breaks.
 */
function triple(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "ooooooooo",
      "2o2o2o2o2",
      ".........",
      ".......2.",
      "o.......o",
    ],
    { lowestRow: 5 },
  );
  const player = pathOf(0, OFF_8_5);
  const mates = [1, 2].map((ball) => ({
    ball,
    path: pathOf(ball * LAUNCH_GAP, [
      WAITS,
      RIGHT_WALL,
      UNDER_7_6,
      [2, RADIUS],
    ]),
  }));
  return played({
    start: startOn(wall, { boon: "triple" }),
    shot: shotAt(45, 0),
    levelBoon: "triple",
    events: [
      launchOf(0, "player", player, 0),
      turnOf(0, player, 1, "side"),
      turnOf(0, player, 2, "face"),
      strikeOf(STRUCK_8_5, 0, 8, [1, 0], 0),
      breakOf(STRUCK_8_5, 8, ["brick", 1], "fuzzball", 1),
      landOf(0, player),
      ...mates.flatMap(({ ball, path }) => {
        const struck = sure(path[2]).at;
        const breaks = ball === 2;
        return [
          launchOf(ball, "mate", path, 0),
          turnOf(ball, path, 1, "side"),
          turnOf(ball, path, 2, "face"),
          strikeOf(struck, ball, 16, breaks ? [1, 0] : [1, 1], 0),
          ...(breaks ? [breakOf(struck, 16, ["tough", 2], "fuzzball", 2)] : []),
          landOf(ball, path),
        ];
      }),
    ],
    tracks: [
      { ball: 0, role: "player", waypoints: player },
      ...mates.map(({ ball, path }) => ({
        ball,
        role: "mate" as const,
        waypoints: path,
      })),
    ],
    rowsDown: 1,
    jumped: false,
    result: "on",
  });
}

/** A friend in the third ink flies behind a shot of charge 1, and breaks the tough brick the shot wore. */
function friend(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "ooooooooo",
      "2o2o2o2o2",
      ".........",
      ".........",
      "o.......2",
    ],
    { lowestRow: 5 },
  );
  const player = pathOf(0, OFF_8_5);
  const behind = pathOf(LAUNCH_GAP, OFF_8_5);
  const broke = sure(behind[2]).at;
  return played({
    start: startOn(wall, { friends: [2] }),
    shot: shotAt(45, 1),
    levelBoon: "hot",
    events: [
      launchOf(0, "player", player, 1),
      turnOf(0, player, 1, "side"),
      turnOf(0, player, 2, "face"),
      strikeOf(STRUCK_8_5, 0, 8, [1, 1], 0),
      landOf(0, player),
      launchOf(1, "friend", behind, 0),
      turnOf(1, behind, 1, "side"),
      turnOf(1, behind, 2, "face"),
      strikeOf(broke, 1, 8, [1, 0], 0),
      breakOf(broke, 8, ["tough", 2], "fuzzball", 1),
      landOf(1, behind),
    ],
    tracks: [
      { ball: 0, role: "player", waypoints: player },
      { ball: 1, role: "friend", waypoints: behind },
    ],
    rowsDown: 1,
    jumped: false,
    result: "on",
  });
}

/**
 * Returns the places a fuzzball turns at off the side walls as it flies a
 * distance from a place on a heading, the place it gets to, and the way
 * across it heads there.
 */
function sideTurns(
  [x, y]: Place,
  { dx, dy }: Heading,
  distance: number,
): { readonly turns: Place[]; readonly end: Place; readonly dx: number } {
  const turns: Place[] = [];
  let [across, up, heading, left] = [x, y, dx, distance];
  for (;;) {
    const wall = heading > 0 ? COLUMNS - RADIUS : RADIUS;
    const toWall = (wall - across) / heading;
    if (toWall >= left) {
      const end: Place = [across + heading * left, up + dy * left];
      return { turns, end, dx: heading };
    }
    across = wall;
    up += dy * toWall;
    left -= toWall;
    heading = -heading;
    turns.push([across, up]);
  }
}

/**
 * A plain shot at the lowest aim, on a field 22 deep, rattles up between
 * the side walls to a row of steel, turns off it without taking a hit, and
 * yawns at the bored distance, then drops to the floor.
 */
function bored(): FlightFixture {
  const wall = wallFrom(
    ["ooooooooo", "2o2o2o2o2", "ooooooooo", "ooooooooo", "#########"],
    { lowestRow: 8 },
  );
  const radians = (FIRST_AIM_DEGREES * Math.PI) / 180;
  const dy = Math.sin(radians);
  const toSteel = (8 - RADIUS - RADIUS) / dy;
  const up = sideTurns(WAITS, { dx: Math.cos(radians), dy }, toSteel);
  const down = sideTurns(up.end, { dx: up.dx, dy: -dy }, BORED - toSteel);
  const [yawnX, yawnY] = down.end;
  const path = pathOf(0, [
    WAITS,
    ...up.turns,
    up.end,
    ...down.turns,
    down.end,
    [yawnX, RADIUS],
  ]);
  const face = up.turns.length + 1;
  const turns = path.slice(1, -2).map((_, index) => index + 1);
  const yawned = sure(path.at(-2)).at;
  return played({
    start: { ...startOn(wall), depth: 22 },
    shot: shotAt(FIRST_AIM_DEGREES, 0),
    levelBoon: "hot",
    events: [
      launchOf(0, "player", path, 0),
      ...turns.flatMap((index) => {
        if (index !== face) {
          return [turnOf(0, path, index, "side")];
        }
        const turn = turnOf(0, path, index, "face");
        const cell = Math.floor(up.end[0]);
        return [turn, strikeOf(turn.at, 0, cell, [0, 0], 0)];
      }),
      { at: yawned, kind: "yawn", ball: 0, x: yawnX, y: yawnY },
      landOf(0, path),
    ],
    tracks: [{ ball: 0, role: "player", waypoints: path }],
    rowsDown: 1,
    jumped: false,
    result: "on",
  });
}

/** A plain shot breaks the last brick the level needs, beside steel it doesn't: cleared. */
function cleared(): FlightFixture {
  const wall = wallFrom(["##.....##", ".........", "#.......o"], {
    lowestRow: 5,
  });
  return played({
    ...offTheCorner(
      wall,
      [1, 0],
      [breakOf(STRUCK_8_5, 8, ["brick", 1], "fuzzball", 1)],
    ),
    rowsDown: 0,
    jumped: false,
    result: "cleared",
  });
}

/** A plain shot wears a brick while the wall's lowest row stands a row over the floor: its step loses the level. */
function lost(): FlightFixture {
  const wall = wallFrom(
    [
      "ooooooooo",
      "........2",
      ".........",
      ".........",
      ".........",
      "ooo......",
    ],
    { lowestRow: 1 },
  );
  const path = pathOf(0, OFF_8_5);
  return played({
    start: startOn(wall),
    shot: shotAt(45, 0),
    levelBoon: "hot",
    events: [
      launchOf(0, "player", path, 0),
      turnOf(0, path, 1, "side"),
      turnOf(0, path, 2, "face"),
      strikeOf(STRUCK_8_5, 0, 44, [1, 1], 0),
      landOf(0, path),
    ],
    tracks: [{ ball: 0, role: "player", waypoints: path }],
    rowsDown: 1,
    jumped: false,
    result: "lost",
  });
}

/**
 * Rounds made by hand, by what each shows: a plain shot; a punch; a punch
 * through the wall to the ceiling; a row zapper's zap and the jump it
 * earns; a column zapper's zap; a hot shot that keeps its charge; a triple
 * shot; a friend; a bored fuzzball's yawn; a level cleared; and one lost.
 */
export const FLIGHT_FIXTURES = {
  plain: plain(),
  punch: punch(),
  punchThrough: punchThrough(),
  zap: zap(),
  columnZap: columnZap(),
  hotShot: hotShot(),
  triple: triple(),
  friend: friend(),
  bored: bored(),
  cleared: cleared(),
  lost: lost(),
} as const satisfies Readonly<Record<string, FlightFixture>>;
