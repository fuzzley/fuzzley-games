// The autopilot flies a wave as a fair player would, in Node and without
// Phaser, so the specs can hold every wave to being cleared in its time and
// `yarn report:waves` can show how the climb from wave to wave is tuned.

import { RADIANS_PER_DEGREE, TURN } from "../rules/angles";
import { ENDLESS_FROM, waveToPlay } from "../rules/waves/endless";
import {
  type Field,
  fieldFor,
  steerField,
  stepField,
} from "../rules/field/field";
import { tallyOf } from "../rules/field/scoring";
import type { Comet } from "../rules/hazards/comets";
import { createCrew } from "../rules/ship/pilots";
import { rockHitRadius } from "../rules/rocks/rocks";
import { STILL, type Ship, type Steer, guardShip } from "../rules/ship/ship";
import type { Speed } from "../rules/speed";
import { STEP_MS, stepsIn } from "../rules/stepper";
import { type Place, type Torus, across } from "../rules/torus";
import {
  COMET_RADIUS,
  COMET_SPEED,
  FIELD_LONGEST_SIDE,
  FIELD_SHORT_SIDE,
  FIRST_SHIP_POINTS,
  HEADING_TURN_RATE,
  SHIP_HIT_RADIUS,
  SHOT_LIFE_MS,
  SHOT_SPEED,
  STEP_S,
  STRAY_SPEED,
  TOP_SPEED,
} from "../rules/tuning";
import {
  WAVES,
  type Wave,
  type WaveEntry,
  waveEntryOf,
} from "../rules/waves/waves";

/** The longest the autopilot plays a wave, in steps: four minutes of game time. */
export const AUTOPILOT_LIMIT = stepsIn(4 * 60_000);

/**
 * Endless's waves the autopilot is held to, 31 to 60, by which every number
 * Endless climbs by has come to its most.
 */
export const ENDLESS_PLAYED: readonly WaveEntry[] = Array.from(
  { length: 30 },
  (_, i) => waveEntryOf(WAVES, ENDLESS_FROM + i),
);

/** The narrowest field, which the autopilot plays on unless told another. */
export const NARROWEST: Torus = {
  width: FIELD_SHORT_SIDE,
  height: FIELD_SHORT_SIDE,
};

/** The widest field, on its side. */
export const WIDEST: Torus = {
  width: FIELD_LONGEST_SIDE,
  height: FIELD_SHORT_SIDE,
};

/** The widest field, upright. */
export const TALLEST: Torus = {
  width: FIELD_SHORT_SIDE,
  height: FIELD_LONGEST_SIDE,
};

/** The narrowest field and the widest, either way up, as the plan holds every wave to. */
export const FIELDS: readonly Torus[] = [NARROWEST, WIDEST, TALLEST];

/** Says how the autopilot plays a field, where a caller cares. */
export interface PlayOptions {
  /** The most frames it plays, a step each once the wave starts, {@link AUTOPILOT_LIMIT} by default. */
  readonly limit?: number;
  /** The field's step it stops at, if the wave hasn't ended by then, none by default. */
  readonly untilStep?: number;
  /** Whether nothing can take its ship, so how long a wave takes is told apart from what it costs. */
  readonly invulnerable?: boolean;
}

/** Says how the autopilot plays a wave, where a caller cares. */
export interface AutopilotOptions extends PlayOptions {
  /** The field's shape, {@link NARROWEST} by default. */
  readonly torus?: Torus;
}

/** Says how the autopilot's play of a wave went. */
export interface AutopilotReport {
  /** Whether it cleared the wave within its time, a ship left. */
  readonly cleared: boolean;
  /** The steps the wave ran, from the first move to its clearing, its last ship's loss, the limit or the step it was told to stop at. */
  readonly steps: number;
  readonly shipsLost: number;
  /** The strays the wave sent across the field. */
  readonly straysSent: number;
  /** The strays it brought home. */
  readonly straysHome: number;
  /** The pickups it caught. */
  readonly caught: number;
  /** The comets that crossed the field once their warning was up. */
  readonly cometsCrossed: number;
  /**
   * Whether the Cleared card's tally of a wave it cleared adds up to the
   * wave's score, every point counted in one line; true for one it didn't.
   */
  readonly tallyAddsUp: boolean;
}

/** How near a course must come to the ship, beyond the two touching, for the autopilot to flee it. */
const THREAT_MARGIN = 1.5;

/** How far ahead the autopilot judges a course, in seconds. */
const THREAT_AHEAD_S = 1;

/** How soon a course must touch the ship for the autopilot to dash, in seconds. */
const DASH_WITHIN_S = 0.25;

/** How far a shot flies before it fades, at its own speed. */
const SHOT_REACH = (SHOT_SPEED * SHOT_LIFE_MS) / 1000;

/**
 * The share of the ship's top speed past which the autopilot waits for a
 * rock beyond its shots' reach to come round the field, rather than chase
 * it: a chase gains on it too slowly.
 */
const CHASE_SHARE = 0.8;

/**
 * How near the row or the column a fast rock runs along the autopilot
 * waits for it: near enough that it passes within the shots' reach, and
 * far enough not to be run down.
 */
const WAIT_REACH = SHOT_REACH / 2;

/**
 * How slantwise a course may be, as the tangent of its angle off a side of
 * the field, and still run along a row or a column of it, so that a rock on
 * it never comes round to a ship off it.
 */
const ALONG_SIDE = Math.tan(15 * RADIANS_PER_DEGREE);

/** How fast the ship turns toward a heading at most, in radians a second. */
const TURN_RATE = HEADING_TURN_RATE * RADIANS_PER_DEGREE;

/**
 * Plays a wave as a fair player would, from a seed, and returns how it
 * went, the wave laid out by `fieldFor()` as the game lays it out.
 */
export function autoplay(
  wave: Wave,
  speed: Speed,
  seed: number,
  options: AutopilotOptions = {},
): AutopilotReport {
  const { torus = NARROWEST, ...rest } = options;
  const field = fieldFor(wave, {
    torus,
    speed,
    seed,
    crew: createCrew(),
    banked: 0,
    nextShipAt: FIRST_SHIP_POINTS,
    held: STILL,
  });
  return playField(field, rest);
}

/**
 * Plays a field laid out as a fair player would, as {@link pilot} steers
 * it each frame, until its wave is cleared, its last ship is lost, or the
 * limit or the step it is told to stop at comes, and returns how it went.
 */
export function playField(
  field: Field,
  options: PlayOptions = {},
): AutopilotReport {
  const { limit = AUTOPILOT_LIMIT, untilStep = Infinity } = options;
  const steer: Steer = { ...STILL };
  let caught = 0;
  let cometsCrossed = 0;
  const warned = field.comets.slots.map(isWarned);
  let seen = field.events.latest;
  // Frames bound it, not steps, so a wave held still for a first move that
  // never comes still ends; once the wave starts, each frame plays a step.
  for (
    let frame = 0;
    frame < limit && field.steps < untilStep && !isDone(field);
    frame++
  ) {
    if (options.invulnerable && field.ship) guardShip(field.ship, STEP_MS);
    pilot(field, steer);
    steerField(field, steer);
    stepField(field);
    field.events.forEachSince(seen, (event) => {
      if (event.kind === "caught") caught++;
    });
    seen = field.events.latest;
    for (const [slot, comet] of field.comets.slots.entries()) {
      if (warned[slot] && comet.live && comet.warnSteps === 0) cometsCrossed++;
      warned[slot] = isWarned(comet);
    }
  }
  // A wave cleared as its last ship went is lost, as the run has it.
  const cleared = field.cleared && hasShips(field);
  return {
    cleared,
    steps: field.steps,
    shipsLost: field.shipsLost,
    straysSent: field.strays.sent,
    straysHome: field.strays.broughtHome,
    caught,
    cometsCrossed,
    tallyAddsUp: !cleared || addsUp(field),
  };
}

/** Returns whether a cleared wave's tally adds up to its score. */
function addsUp(field: Field): boolean {
  const { rocks, chains, strays, cleared, clean } = tallyOf(field);
  return rocks + chains + strays + cleared + clean === field.score;
}

/** Returns whether a comet is warned of, waiting off its edge to cross. */
function isWarned(comet: Readonly<Comet>): boolean {
  return comet.live && comet.warnSteps > 0;
}

/**
 * Plays one of the game's waves at a speed, from its number as the seed
 * unless given another, as the specs in `src/rules/waves/every_wave/` and
 * `yarn report:waves` both play it; an Endless wave is made from the seed
 * too, as the run's.
 */
export function playWave(
  entry: WaveEntry,
  speed: Speed,
  options: { readonly seed?: number } & Omit<AutopilotOptions, "limit"> = {},
): AutopilotReport {
  const { seed = entry.number, ...rest } = options;
  return autoplay(waveToPlay(entry, seed), speed, seed, rest);
}

/** Returns whether the autopilot is done with a wave: cleared, or its last ship lost. */
function isDone(field: Field): boolean {
  return field.cleared || !hasShips(field);
}

/** Returns whether a wave's crew has a ship left to fly. */
function hasShips(field: Field): boolean {
  return field.crew.flying.length > 0;
}

/**
 * Steers a field's ship for a frame, writing the steering into the record
 * the frame before wrote: it flees a rock or a comet whose course comes
 * near the ship, dashing when one is about to meet it; else catches the
 * stray adrift, or the pickup it has time for; else turns toward the rock
 * it can hit soonest, leading it, and closes on it beyond its shots' reach,
 * but waits for one nearly as fast as the ship to come round the field,
 * by the row or the column it runs along if it runs along one. Whichever it does, it fires once lined up with that rock.
 */
export function pilot(field: Field, steer: Steer): void {
  const { ship } = field;
  const dash = steer.dash;
  Object.assign(steer, STILL);
  // Let go of everything while there is no ship, so the next comes held
  // still and its first move is a fresh one.
  if (!ship) return;
  const target = targetOf(field, ship);
  steer.fire =
    target !== null &&
    target.inReach &&
    turnTo(ship.angle, target.heading) < target.slack;
  const threat = nearestThreat(field, ship);
  if (threat) {
    steer.heading = Math.atan2(threat.awayY, threat.awayX);
    steer.thrust = 1;
    // A dash keeps the ship untouchable for its guard, whichever way it goes.
    steer.dash =
      !dash &&
      threat.touches &&
      threat.at < DASH_WITHIN_S &&
      ship.rechargeSteps === 0;
    return;
  }
  const goal = goalOf(field, ship);
  if (goal) {
    steer.heading = seek(field.torus, ship, goal);
    steer.thrust = 1;
  } else if (target?.toPath && !target.inReach) {
    const { heading, far } = target.toPath;
    steer.heading = far > WAIT_REACH ? heading : target.heading;
    steer.thrust = far > WAIT_REACH ? 0.5 : 0;
  } else if (target) {
    steer.heading = target.heading;
    steer.thrust = target.inReach ? 0 : 0.5;
  }
}

/** Describes a course that comes near the ship: the way to flee it, how soon it is nearest, and whether it touches. */
interface Threat {
  /** The way from where it comes nearest toward the ship, of length 1. */
  readonly awayX: number;
  readonly awayY: number;
  /** How soon it comes nearest, in seconds. */
  readonly at: number;
  /** Whether it comes near enough to touch the ship, not only to be fled. */
  readonly touches: boolean;
}

/**
 * Returns the course of a whole rock or a crossing comet that comes near
 * enough the ship to flee, soonest, within the time judged ahead, or null
 * for none.
 */
function nearestThreat(field: Field, ship: Readonly<Ship>): Threat | null {
  const { torus, pace } = field;
  let threat: Threat | null = null;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    threat = sooner(
      threat,
      approachOf(
        ship,
        across(ship.x, rock.x, torus.width),
        across(ship.y, rock.y, torus.height),
        rock.vx * pace,
        rock.vy * pace,
        rockHitRadius(rock.size),
      ),
    );
  }
  const cometSpeed = COMET_SPEED * pace;
  for (const comet of field.comets.slots) {
    if (!comet.live || comet.warnSteps > 0) continue;
    // A comet crosses the field once rather than wrapping, so it is only as
    // far as it looks.
    threat = sooner(
      threat,
      approachOf(
        ship,
        comet.x - ship.x,
        comet.y - ship.y,
        Math.cos(comet.heading) * cometSpeed,
        Math.sin(comet.heading) * cometSpeed,
        COMET_RADIUS,
      ),
    );
  }
  return threat;
}

/** Returns the sooner of two threats, either of which may be none. */
function sooner(one: Threat | null, other: Threat | null): Threat | null {
  if (!one) return other;
  if (!other) return one;
  return other.at < one.at ? other : one;
}

/**
 * Returns how a course comes near the ship within the time judged ahead,
 * as the two fly on, if near enough to flee, else null: one of a radius,
 * the way from the ship to it (`px`, `py`), flying at a velocity, in
 * units a second. A course already drawing away comes no nearer.
 */
function approachOf(
  ship: Readonly<Ship>,
  px: number,
  py: number,
  vx: number,
  vy: number,
  radius: number,
): Threat | null {
  const rx = vx - ship.vx;
  const ry = vy - ship.vy;
  const closing = rx * rx + ry * ry;
  const toward = px * rx + py * ry;
  if (toward > 0) return null;
  const at = closing === 0 ? 0 : Math.min(THREAT_AHEAD_S, -toward / closing);
  const nearX = px + rx * at;
  const nearY = py + ry * at;
  const near = Math.hypot(nearX, nearY);
  const touching = SHIP_HIT_RADIUS + radius;
  if (near > touching + THREAT_MARGIN) return null;
  const touches = near <= touching;
  // Head on, the way out is at right angles to its course.
  if (near < 1e-6) {
    const way = Math.hypot(rx, ry) || 1;
    return { awayX: -ry / way, awayY: rx / way, at, touches };
  }
  return { awayX: -nearX / near, awayY: -nearY / near, at, touches };
}

/** Says where the autopilot aims to hit a rock, and whether a shot there reaches it. */
interface Target {
  /** The heading a shot flies at to meet it. */
  readonly heading: number;
  /** Whether a shot fired now meets it before it fades. */
  readonly inReach: boolean;
  /** How far off the heading the nose may point and still hit it, in radians. */
  readonly slack: number;
  /**
   * For a rock flying nearly as fast as the ship can, which a chase would
   * gain on too slowly, the way to where the ship waits for it to come
   * round the field and how far it is from there, or null for a rock to
   * close on.
   */
  readonly toPath: { readonly heading: number; readonly far: number } | null;
}

/**
 * Returns where to aim to hit the rock the ship can hit soonest, its turn
 * to the heading counted with the shot's flight, leading the rock as it
 * flies, or null with no rock whole.
 */
function targetOf(field: Field, ship: Readonly<Ship>): Target | null {
  let best: Target | null = null;
  let soonest = Infinity;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const px = across(ship.x, rock.x, field.torus.width);
    const py = across(ship.y, rock.y, field.torus.height);
    // A shot takes the ship's velocity, so beside the ship it flies at its own speed.
    const rx = rock.vx * field.pace - ship.vx;
    const ry = rock.vy * field.pace - ship.vy;
    const flight = interceptTime(px, py, rx, ry, SHOT_SPEED);
    const at = flight ?? Math.hypot(px, py) / SHOT_SPEED;
    const heading = Math.atan2(
      py + ry * (flight ?? 0),
      px + rx * (flight ?? 0),
    );
    const time = turnTo(ship.angle, heading) / TURN_RATE + at;
    if (time >= soonest) continue;
    soonest = time;
    const along = SHOT_SPEED * at;
    best = {
      heading,
      inReach: flight !== null && along <= SHOT_REACH,
      slack: Math.atan2(rockHitRadius(rock.size), along),
      toPath: pathOf(px, py, rock.vx * field.pace, rock.vy * field.pace),
    };
  }
  return best;
}

/**
 * Returns where the ship waits for a rock flying nearly as fast as it can,
 * from the way to the rock and its velocity: by the row or the column it
 * runs along, which it never leaves, or where the ship is, for a rock
 * crossing the field slantwise, which comes round to anywhere; or null for
 * a slower rock.
 */
function pathOf(
  px: number,
  py: number,
  vx: number,
  vy: number,
): Target["toPath"] {
  if (Math.hypot(vx, vy) <= CHASE_SHARE * TOP_SPEED) return null;
  if (Math.abs(vy) <= Math.abs(vx) * ALONG_SIDE) {
    return { heading: (Math.sign(py) * TURN) / 4, far: Math.abs(py) };
  }
  if (Math.abs(vx) <= Math.abs(vy) * ALONG_SIDE) {
    return { heading: px < 0 ? TURN / 2 : 0, far: Math.abs(px) };
  }
  return { heading: 0, far: 0 };
}

/**
 * Returns how soon a shot fired now at a speed meets a place moving at a
 * velocity, both from beside the ship, or null if it never can.
 */
function interceptTime(
  px: number,
  py: number,
  vx: number,
  vy: number,
  speed: number,
): number | null {
  const a = vx * vx + vy * vy - speed * speed;
  const b = 2 * (px * vx + py * vy);
  const c = px * px + py * py;
  if (Math.abs(a) < 1e-9) return b < 0 ? -c / b : null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  const least = Math.min(first, second);
  const time = least > 0 ? least : Math.max(first, second);
  return time > 0 ? time : null;
}

/** Describes something the ship means to catch: where it is, and its velocity in units a second. */
interface Goal extends Place {
  readonly vx: number;
  readonly vy: number;
}

/**
 * Returns the stray adrift, or the pickup floating that the ship can reach
 * soonest before it fades, for the ship to catch, or null for neither.
 */
function goalOf(field: Field, ship: Readonly<Ship>): Goal | null {
  const { adrift } = field.strays;
  if (adrift.live) {
    return {
      x: adrift.x,
      y: adrift.y,
      vx: Math.cos(adrift.heading) * STRAY_SPEED,
      vy: Math.sin(adrift.heading) * STRAY_SPEED,
    };
  }
  let best: Goal | null = null;
  let soonest = Infinity;
  for (const floating of field.pickups) {
    if (!floating.live) continue;
    const reach = distanceTo(field.torus, ship, floating) / TOP_SPEED;
    if (reach < floating.lifeSteps * STEP_S && reach < soonest) {
      best = floating;
      soonest = reach;
    }
  }
  return best;
}

/**
 * Returns the heading to thrust along to catch something moving: toward
 * where it will be as the ship reaches it at its top speed, steering against
 * the ship's own drift, so it closes in rather than circling.
 */
function seek(torus: Torus, ship: Readonly<Ship>, goal: Goal): number {
  const lead = distanceTo(torus, ship, goal) / TOP_SPEED;
  const toX = across(ship.x, goal.x + goal.vx * lead, torus.width);
  const toY = across(ship.y, goal.y + goal.vy * lead, torus.height);
  const way = Math.hypot(toX, toY) || 1;
  return Math.atan2(
    (toY / way) * TOP_SPEED - ship.vy,
    (toX / way) * TOP_SPEED - ship.vx,
  );
}

/** Returns how far the ship is from a place, the shortest way across the wrap. */
function distanceTo(torus: Torus, ship: Readonly<Ship>, place: Place): number {
  return Math.hypot(
    across(ship.x, place.x, torus.width),
    across(ship.y, place.y, torus.height),
  );
}

/** Returns how far the ship turns from one heading to another, the shorter way, in radians. */
function turnTo(from: number, to: number): number {
  return Math.abs(across(from, to, TURN));
}
