// The rocks: laid in slots made once, as many as the field's cap, flown
// across the wrap at the field's pace, and hit, holding or breaking into
// pieces of the size after, with what each kind's traits add.

import { RADIANS_PER_DEGREE, TURN } from "./angles";
import {
  type PieceKind,
  type RockKindId,
  type RockSize,
  type RockTrait,
  type RockTraitKind,
  rockKind,
  sizeAfter,
} from "./catalog/rocks";
import { type Draws, drawIn, nextDraw } from "./draws";
import type { FieldEventLog } from "./events";
import { stepsIn } from "./stepper";
import { type Place, type Torus, across, distanceSquared, wrap } from "./torus";
import {
  PIECE_PUSH,
  PIECE_TURN,
  ROCK_HIT_SHARE,
  ROCK_RADIUS,
  ROCK_SPEED,
  ROCK_SPIN,
  STEP_S,
} from "./tuning";

/** How many outlines each kind and size of rock is drawn in, a rock's being one of them. */
export const ROCK_OUTLINES = 6;

/** Describes a rock, laid in place in its slot. */
export interface Rock {
  /** Whether it is on the field, whole, to be hit. */
  live: boolean;
  kind: RockKindId;
  size: RockSize;
  x: number;
  y: number;
  /** Its velocity at a pace of 1, which the field's pace scales as it flies. */
  vx: number;
  vy: number;
  /** Where it was a step ago, for the scene to draw between, as the ship's is. */
  lastX: number;
  lastY: number;
  /** How far it has turned, which only its drawing shows. */
  angle: number;
  /** How fast it turns, in radians a second at a pace of 1, either way. */
  spin: number;
  /** Which of its kind and size's outlines it is drawn in, from 0 to under {@link ROCK_OUTLINES}. */
  outline: number;
  /** The hits left to break it. */
  hits: number;
  /** The step it was laid at, by the field's count; a blast reaches only rocks laid before its own step. */
  laidAt: number;
  /**
   * The step a broken rock that blasts goes off at, or 0 for none; its slot
   * stays taken until then, so its blast counts toward the cap.
   */
  goesOffAt: number;
}

/** Describes what the rocks' rules act on, which the field holds. */
export interface RockField extends Draws {
  readonly torus: Torus;
  /**
   * A slot for each rock the field holds at most, its cap; a free slot holds
   * neither a whole rock nor a broken one waiting to go off.
   */
  readonly rocks: readonly Rock[];
  /** The kind of rock its wave names, which a boulder breaks into. */
  readonly waveKind: RockKindId;
  /** Where the ship is, which drawn rocks drift toward, or null while there is none. */
  readonly ship: Place | null;
  /**
   * How fast the rocks go against their own speed: the wave's pace, the
   * speed's and Slow's together, which scale their flight, their turn and a
   * drawn rock's pull alike, so a rock's course is the same at any pace.
   */
  readonly pace: number;
  /** How many steps the field has taken, by which a blast's beat runs and a rock's laying is told. */
  readonly steps: number;
  /** What happened, for the scene to play. */
  readonly events: FieldEventLog;
}

/**
 * Names how hard something hits a rock: a hit takes one of its hits off, as
 * a shot, a blast and the Nova do, and a blow that breaks takes all it has
 * left, as a comet's and the Shield's do.
 */
export type Blow = "hit" | "breaks";

/** A rock trait of each kind, by its kind. */
type TraitOf = { readonly [T in RockTrait as T["kind"]]: T };

/** Says what the rocks' rules do for one trait, at each moment a rock with it meets. */
interface TraitRule<T extends RockTrait> {
  /** Runs as the rock takes a hit and holds. */
  readonly held?: (field: RockField, rock: Rock, trait: T) => void;
  /** Runs as it breaks, before its pieces fly. */
  readonly broken?: (field: RockField, rock: Rock, trait: T) => void;
  /** Runs at each step it flies, before it moves. */
  readonly step?: (field: RockField, rock: Rock, trait: T) => void;
  /** Runs as a broken rock's beat is up, before its slot is freed. */
  readonly goesOff?: (field: RockField, rock: Rock, trait: T) => void;
}

/** A moment in play a trait's rule may run at. */
type Moment = keyof TraitRule<RockTrait>;

/** What each trait does, so a trait without its rule fails to compile. */
const TRAIT_RULES: {
  readonly [K in RockTraitKind]: TraitRule<TraitOf[K]>;
} = {
  blasts: {
    broken: (field, rock, { delayMs }) => {
      rock.goesOffAt = field.steps + stepsIn(delayMs);
    },
    goesOff: (field, rock, { reach }) => {
      goOff(field, rock, reach[rock.size] ?? 0);
    },
  },
  // Nothing of the rocks': the pickup it lets go is the pickups' to drop.
  gives: {},
  drawn: {
    step: (field, rock, { pull }) => {
      drift(field, rock, pull);
    },
  },
  rings: {
    held: (field, rock) => {
      field.events.add("rung", rock.x, rock.y, rock.kind, rock.size);
    },
  },
};

/** Returns the field's rock slots, as many as its cap, each free. */
export function createRocks(cap: number): Rock[] {
  return Array.from({ length: cap }, () => ({
    live: false,
    kind: "stone",
    size: "small",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastX: 0,
    lastY: 0,
    angle: 0,
    spin: 0,
    outline: 0,
    hits: 0,
    laidAt: 0,
    goesOffAt: 0,
  }));
}

/** Returns how far from its middle a rock of a size is hit, a share of its radius. */
export function rockHitRadius(size: RockSize): number {
  return ROCK_RADIUS[size] * ROCK_HIT_SHARE;
}

/**
 * Lays a whole rock of a kind and size in the field's first free slot, at a
 * place, flying a heading at a speed drawn from its size's, times its
 * kind's, and returns it, or null when every slot is taken.
 *
 * @throws {RangeError} When its kind doesn't come in the size.
 */
export function addRock(
  field: RockField,
  kind: RockKindId,
  size: RockSize,
  x: number,
  y: number,
  heading: number,
): Rock | null {
  const { hits, speed } = rockKind(kind);
  const whole = hits[size];
  if (whole === undefined) {
    throw new RangeError(`A ${kind} rock doesn't come ${size}.`);
  }
  const rock = field.rocks.find(isFree);
  if (rock === undefined) return null;
  const flies = drawIn(field, ROCK_SPEED[size]) * speed;
  const spinsBack = nextDraw(field) < 0.5;
  rock.live = true;
  rock.kind = kind;
  rock.size = size;
  rock.x = x;
  rock.y = y;
  rock.vx = Math.cos(heading) * flies;
  rock.vy = Math.sin(heading) * flies;
  rock.lastX = x;
  rock.lastY = y;
  rock.angle = nextDraw(field) * TURN;
  rock.spin =
    (spinsBack ? -1 : 1) * drawIn(field, ROCK_SPIN) * RADIANS_PER_DEGREE;
  rock.outline = Math.floor(nextDraw(field) * ROCK_OUTLINES);
  rock.hits = whole;
  rock.laidAt = field.steps;
  return rock;
}

/**
 * Hits a whole rock once, as a shot, a blast, the Nova, a comet or the
 * Shield does, and returns whether it broke; a rock not whole takes nothing.
 *
 * One broken leaves the field, its traits run, and it splits into pieces of
 * the size after its own, pushed along the way the hit came: `alongX` and
 * `alongY`, of any length, or both 0 for no push. Its slot is free as it
 * breaks, and one of its pieces may lie there by the time this returns, so
 * a caller takes what it broke from before the hit, or from the break's
 * event.
 */
export function hitRock(
  field: RockField,
  rock: Rock,
  alongX: number,
  alongY: number,
  blow: Blow = "hit",
): boolean {
  if (!rock.live) return false;
  rock.hits = blow === "breaks" ? 0 : rock.hits - 1;
  if (rock.hits > 0) {
    field.events.add("hit", rock.x, rock.y, rock.kind, rock.size);
    runTraits("held", field, rock);
    return false;
  }
  rock.live = false;
  field.events.add("broken", rock.x, rock.y, rock.kind, rock.size);
  runTraits("broken", field, rock);
  split(field, rock, alongX, alongY);
  return true;
}

/** Flies each whole rock a step on at the field's pace, its traits' rules first, and wraps it. */
export function stepRocks(field: RockField): void {
  const time = field.pace * STEP_S;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    runTraits("step", field, rock);
    rock.lastX = rock.x;
    rock.lastY = rock.y;
    rock.x = wrap(rock.x + rock.vx * time, field.torus.width);
    rock.y = wrap(rock.y + rock.vy * time, field.torus.height);
    rock.angle = wrap(rock.angle + rock.spin * time, TURN);
  }
}

/**
 * Sets off each broken rock whose beat is up, then frees their slots, so
 * each blast going off with others holds its slot through theirs.
 *
 * Call it first in a step, once the step is counted: a blast reaches only
 * rocks laid before its step, so pieces a shot's hit laid earlier in the
 * step would be out of its reach.
 */
export function setOffBlasts(field: RockField): void {
  for (const rock of field.rocks) {
    if (isDue(field, rock)) runTraits("goesOff", field, rock);
  }
  for (const rock of field.rocks) {
    if (isDue(field, rock)) rock.goesOffAt = 0;
  }
}

/** Returns whether a broken rock that blasts is due to go off. */
function isDue(field: RockField, rock: Readonly<Rock>): boolean {
  return rock.goesOffAt !== 0 && rock.goesOffAt <= field.steps;
}

/** Returns whether a slot holds neither a whole rock nor a broken one waiting to go off. */
function isFree(rock: Readonly<Rock>): boolean {
  return !rock.live && rock.goesOffAt === 0;
}

/**
 * Splits a broken rock into pieces of the size after its own, as many as
 * its kind says and the free slots hold, its own among them, so at the cap
 * it splits into fewer; each leaves from its place, turned off its travel
 * to one side, then the other, and pushed along the hit.
 */
function split(
  field: RockField,
  rock: Readonly<Rock>,
  alongX: number,
  alongY: number,
): void {
  const { splits } = rockKind(rock.kind);
  const size = sizeAfter(rock.size);
  if (splits === null || size === null) return;
  // The first piece may take the rock's own slot, so what the rest need of
  // it is kept first.
  const { x, y } = rock;
  const kind = kindOfPieces(field, rock.kind, splits.into);
  const travel = Math.atan2(rock.vy, rock.vx);
  const along = Math.hypot(alongX, alongY);
  const push = along > 0 ? PIECE_PUSH / along : 0;
  const firstSide = nextDraw(field) < 0.5 ? -1 : 1;
  for (let piece = 0; piece < splits.count; piece++) {
    const side = piece % 2 === 0 ? firstSide : -firstSide;
    const turn = side * drawIn(field, PIECE_TURN) * RADIANS_PER_DEGREE;
    const placed = addRock(field, kind, size, x, y, travel + turn);
    if (placed === null) return;
    placed.vx += alongX * push;
    placed.vy += alongY * push;
  }
}

/** Returns the kind a rock's pieces are, by what its kind splits into. */
function kindOfPieces(
  field: RockField,
  kind: RockKindId,
  into: PieceKind,
): RockKindId {
  switch (into) {
    case "self":
      return kind;
    case "stone":
      return "stone";
    case "wave":
      return field.waveKind;
  }
}

/**
 * Sets a broken rock's blast off: every whole rock within its reach, the
 * reach touching the rock's own, takes a hit, pushed away from it.
 *
 * It reaches only rocks laid before its step, so neither the pieces it
 * breaks them into nor those of another blast going off with it are hit:
 * blasts in a step hit the same rocks whatever their slots' order.
 */
function goOff(field: RockField, rock: Readonly<Rock>, reach: number): void {
  const { torus } = field;
  const { x, y } = rock;
  field.events.add("blast", x, y, rock.kind, rock.size, reach);
  for (const other of field.rocks) {
    if (!other.live || other.laidAt === field.steps) continue;
    const within = reach + rockHitRadius(other.size);
    if (distanceSquared(torus, x, y, other.x, other.y) > within * within) {
      continue;
    }
    hitRock(
      field,
      other,
      across(x, other.x, torus.width),
      across(y, other.y, torus.height),
    );
  }
}

/**
 * Speeds a drawn rock toward the ship the shortest way, by its pull each
 * second at the field's pace, never past its size's most speed, times its
 * kind's; the cap never brakes a rock already past that, as a pushed piece
 * may be.
 */
function drift(field: RockField, rock: Rock, pull: number): void {
  const { ship, torus } = field;
  if (ship === null) return;
  const toX = across(rock.x, ship.x, torus.width);
  const toY = across(rock.y, ship.y, torus.height);
  const way = Math.hypot(toX, toY);
  if (way === 0) return;
  const most = Math.max(
    ROCK_SPEED[rock.size].most * rockKind(rock.kind).speed,
    Math.hypot(rock.vx, rock.vy),
  );
  const gain = pull * field.pace * STEP_S;
  rock.vx += (toX / way) * gain;
  rock.vy += (toY / way) * gain;
  const speed = Math.hypot(rock.vx, rock.vy);
  if (speed > most) {
    rock.vx *= most / speed;
    rock.vy *= most / speed;
  }
}

/** Runs the rules of a rock's traits for a moment in play. */
function runTraits(moment: Moment, field: RockField, rock: Rock): void {
  for (const trait of rockKind(rock.kind).traits) {
    runRule(moment, field, rock, trait.kind, trait);
  }
}

/** Runs one trait's rule for a moment in play, if it has one. */
function runRule<K extends RockTraitKind>(
  moment: Moment,
  field: RockField,
  rock: Rock,
  kind: K,
  trait: TraitOf[K],
): void {
  TRAIT_RULES[kind][moment]?.(field, rock, trait);
}
