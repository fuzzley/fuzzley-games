import { splitOff } from "./balls";
import type { Brick } from "./bricks";
import { brickKind, hasTrait } from "./catalog/bricks";
import {
  type CapsuleEffect,
  type CapsuleId,
  type EffectKind,
  capsule,
} from "./catalog/capsules";
import { nextDraw } from "./draws";
import type { Field } from "./field";
import { type Box, columnMiddle, columnOf, rowMiddle, rowOf } from "./grid";
import { paddleBox } from "./paddle";
import { SPEED_INFO } from "./speed";
import { stepsIn } from "./stepper";
import {
  CAPSULE_FALL_SPEED,
  CAPSULE_HEIGHT,
  CAPSULE_WIDTH,
  FIELD_HEIGHT,
  MAX_CAPSULES,
  PADDLE_WIDTH,
  STEP_S,
} from "./tuning";

/** Describes a capsule falling down the field. */
export interface Falling {
  /** Whether it is falling; one that isn't waits in the field's pool. */
  live: boolean;
  /** Which capsule it is. */
  id: CapsuleId;
  /** Where its middle is, in field units. */
  x: number;
  y: number;
  /** Where its middle was a step ago, for the scene to draw between. */
  lastY: number;
}

/** Keeps an effect of a group in play: the capsule that started it, and its time left. */
export interface InEffect {
  /** The capsule that started it, or null while none of the group is in play. */
  capsule: CapsuleId | null;
  /** The step it ends at, or 0 for one that lasts until it is used. */
  endsAt: number;
}

/** The effects in play, one for each group. */
export type Effects = Readonly<Record<EffectKind, InEffect>>;

/** How many capsules the field keeps records for, gifts' falling past the cap too. */
export const FALLING_POOL = 8;

/** An effect of each kind, by its kind. */
type EffectOf = { readonly [E in CapsuleEffect as E["kind"]]: E };

/** Says what the field does for one kind of effect, as it starts and as it ends. */
interface EffectRule<E extends CapsuleEffect> {
  /** Runs as a capsule with it is caught. */
  readonly start: (field: Field, effect: E) => void;
  /**
   * Undoes it, as its time runs out, the next capsule of its group is
   * caught, or a life is lost. An effect without one is over as it starts.
   */
  readonly end?: (field: Field) => void;
}

/** What each effect does, so an effect without its rule fails to compile. */
const EFFECT_RULES: { readonly [K in EffectKind]: EffectRule<EffectOf[K]> } = {
  "paddle-size": {
    start: (field, { width }) => {
      field.paddle.goalWidth = width;
    },
    end: (field) => {
      field.paddle.goalWidth = PADDLE_WIDTH;
    },
  },
  "paddle-mode": {
    start: (field, { mode }) => {
      field.mode = mode;
    },
    end: (field) => {
      field.mode = null;
    },
  },
  ball: {
    start: (field, { ball }) => {
      field.ballKind = ball;
    },
    end: (field) => {
      field.ballKind = "normal";
    },
  },
  pace: {
    start: (field, { scale, climb, fromBase }) => {
      if (fromBase) field.climbed = 0;
      field.paceScale = scale;
      field.climbRate = climb;
    },
    end: (field) => {
      field.paceScale = 1;
      field.climbRate = 1;
    },
  },
  split: {
    start: (field, { into, spreadDeg }) => {
      splitBalls(field, into, spreadDeg);
    },
  },
  life: {
    start: (field) => {
      field.livesGained++;
    },
  },
  net: {
    start: (field) => {
      field.net = true;
    },
    end: (field) => {
      field.net = false;
    },
  },
};

/** Every kind of effect, in the order the field shows their tags. */
// Object.keys() types its keys as strings; the table's keys are the kinds.
export const EFFECT_KINDS = Object.keys(EFFECT_RULES) as readonly EffectKind[];

// Made once and reused, so a step makes nothing.
const paddleArea: Box = { left: 0, top: 0, right: 0, bottom: 0 };

/** Returns the records of the capsules a field may have falling, none falling. */
export function createFalling(): Falling[] {
  // A record out of play keeps whichever capsule it last held.
  return Array.from({ length: FALLING_POOL }, () => ({
    live: false,
    id: "wide",
    x: 0,
    y: 0,
    lastY: 0,
  }));
}

/** Returns the records of the effects in play, none yet. */
export function createEffects(): Effects {
  const none = (): InEffect => ({ capsule: null, endsAt: 0 });
  return {
    "paddle-size": none(),
    "paddle-mode": none(),
    ball: none(),
    pace: none(),
    split: none(),
    life: none(),
    net: none(),
  };
}

/**
 * Lets a capsule fall from a brick as it breaks, while the level is in
 * play: always from a gift brick, and by the level's chance from another
 * the level needs.
 */
export function dropFrom(field: Field, brick: Readonly<Brick>): void {
  if (field.state !== "playing") return;
  if (hasTrait(brick.kind, "gives")) dropGift(field, brick);
  else if (brickKind(brick.kind).needed) dropByChance(field, brick);
}

/**
 * Lets a capsule drawn from the level's pool fall from a brick, by the
 * level's chance, while fewer than {@link MAX_CAPSULES} are falling.
 */
function dropByChance(field: Field, brick: Readonly<Brick>): void {
  if (field.level.drops <= 0 || fallingCount(field) >= MAX_CAPSULES) return;
  if (nextDraw(field) >= field.level.drops) return;
  const id = drawCapsule(field);
  if (id) drop(field, brick, id);
}

/**
 * Lets a gift brick's capsule fall, however many are falling: the one the
 * level pinned to it, or else one drawn from the level's pool.
 */
function dropGift(field: Field, brick: Readonly<Brick>): void {
  const pinned = brick.capsule;
  const id = pinned && mayFall(field, pinned) ? pinned : drawCapsule(field);
  if (id) drop(field, brick, id);
}

/**
 * Moves each falling capsule down a step: the paddle catches one that
 * touches it, and one past the floor is missed.
 */
export function stepCapsules(field: Field): void {
  paddleBox(field.paddle, paddleArea);
  for (const falling of field.falling) {
    if (!falling.live) continue;
    falling.lastY = falling.y;
    falling.y += CAPSULE_FALL_SPEED * STEP_S;
    if (touches(falling, paddleArea)) {
      falling.live = false;
      catchCapsule(field, falling.id, falling.x, falling.y);
    } else if (falling.y - CAPSULE_HEIGHT / 2 > FIELD_HEIGHT) {
      falling.live = false;
      field.events.add("missed", falling.x, FIELD_HEIGHT, -1, falling.id);
    }
  }
}

/**
 * Starts a capsule's effect, ending the one of its group in play, if any,
 * so the same capsule again starts its time over.
 */
export function catchCapsule(
  field: Field,
  id: CapsuleId,
  x: number,
  y: number,
): void {
  const { effect } = capsule(id);
  endEffect(field, effect.kind);
  startEffect(field, effect.kind, effect);
  if (EFFECT_RULES[effect.kind].end) {
    const inEffect = field.effects[effect.kind];
    inEffect.capsule = id;
    inEffect.endsAt = "ms" in effect ? field.steps + stepsIn(effect.ms) : 0;
  }
  field.events.add("caught", x, y, -1, id);
}

/** Ends the effects whose time has run out. */
export function stepEffects(field: Field): void {
  for (const kind of EFFECT_KINDS) {
    const inEffect = field.effects[kind];
    if (!inEffect.capsule || inEffect.endsAt === 0) continue;
    if (field.steps >= inEffect.endsAt) endEffect(field, kind);
  }
}

/** Ends an effect of a group, if one is in play. */
export function endEffect(field: Field, kind: EffectKind): void {
  const inEffect = field.effects[kind];
  if (!inEffect.capsule) return;
  inEffect.capsule = null;
  inEffect.endsAt = 0;
  EFFECT_RULES[kind].end?.(field);
}

/** Ends every effect, as a life is lost. */
export function endEffects(field: Field): void {
  for (const kind of EFFECT_KINDS) endEffect(field, kind);
}

/** Lets go of the falling capsules, as a life is lost. */
export function clearFalling(field: Field): void {
  for (const falling of field.falling) falling.live = false;
}

/** Runs an effect's start rule. */
function startEffect<K extends EffectKind>(
  field: Field,
  kind: K,
  effect: EffectOf[K],
): void {
  EFFECT_RULES[kind].start(field, effect);
}

/** Returns a capsule drawn by weight from those of the level's pool that may fall, or null if none may. */
function drawCapsule(field: Field): CapsuleId | null {
  let total = 0;
  for (const id of field.level.capsules) {
    if (mayFall(field, id)) total += capsule(id).weight;
  }
  if (total <= 0) return null;
  let left = nextDraw(field) * total;
  let drawn: CapsuleId | null = null;
  for (const id of field.level.capsules) {
    if (!mayFall(field, id)) continue;
    drawn = id;
    left -= capsule(id).weight;
    if (left < 0) break;
  }
  return drawn;
}

/** Returns whether a capsule may fall at the field's speed, which may keep out the bad ones. */
function mayFall(field: Field, id: CapsuleId): boolean {
  return (
    SPEED_INFO[field.setup.speed].badCapsules || capsule(id).tone === "good"
  );
}

/** Lets a capsule fall from a brick's middle, if the field has a record free for it. */
function drop(field: Field, brick: Readonly<Brick>, id: CapsuleId): void {
  const falling = field.falling.find((each) => !each.live);
  if (!falling) return;
  falling.live = true;
  falling.id = id;
  falling.x = columnMiddle(columnOf(brick.cell));
  falling.y = rowMiddle(rowOf(brick.cell));
  falling.lastY = falling.y;
  field.events.add("dropped", falling.x, falling.y, brick.cell, id);
}

/** Returns how many capsules are falling. */
function fallingCount(field: Field): number {
  let count = 0;
  for (const falling of field.falling) if (falling.live) count++;
  return count;
}

/** Returns whether a falling capsule touches a box. */
function touches(falling: Readonly<Falling>, box: Readonly<Box>): boolean {
  return (
    falling.x + CAPSULE_WIDTH / 2 >= box.left &&
    falling.x - CAPSULE_WIDTH / 2 <= box.right &&
    falling.y + CAPSULE_HEIGHT / 2 >= box.top &&
    falling.y - CAPSULE_HEIGHT / 2 <= box.bottom
  );
}

/**
 * Splits each ball in flight into `into`, the others turned `spreadDeg`
 * either way, then twice that, up to as many balls as the field holds.
 */
function splitBalls(field: Field, into: number, spreadDeg: number): void {
  // The balls to split, a bit each, taken first, as the copies take records
  // later in the list, which mustn't split again.
  let inFlight = 0;
  for (const [i, ball] of field.balls.entries()) {
    if (ball.live && !ball.held) inFlight |= 1 << i;
  }
  for (const [i, ball] of field.balls.entries()) {
    if ((inFlight & (1 << i)) === 0) continue;
    for (let k = 1; k < into; k++) {
      const copy = field.balls.find((each) => !each.live);
      if (!copy) return;
      const turns = Math.ceil(k / 2) * (k % 2 === 1 ? 1 : -1);
      splitOff(ball, copy, turns * spreadDeg);
    }
  }
}
