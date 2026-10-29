import { dropByChance, dropGift } from "./capsules";
import {
  type BrickKindId,
  type BrickTrait,
  type TraitKind,
  brickKind,
  hasTrait,
} from "./catalog/bricks";
import type { CapsuleId } from "./catalog/capsules";
import type { Field } from "./field";
import { type Box, brickBox, cellIndex, columnOf, inGrid, rowOf } from "./grid";
import type { LevelBrick } from "./level";
import { STEP_MS } from "./stepper";
import { BALL_RADIUS } from "./tuning";

/** Describes a brick in play. */
export interface Brick {
  readonly kind: BrickKindId;
  /** Its cell in the grid. */
  readonly cell: number;
  /** Its tint, from 0 to 7. */
  readonly tint: number;
  /** The capsule it gives, where the level pins one, else null. */
  readonly capsule: CapsuleId | null;
  /** The hits it takes whole, as the level laid it, 0 for one that never breaks. */
  readonly whole: number;
  /** The hits left to break it. */
  hits: number;
  /** Whether it is broken, and so out of the balls' way. */
  broken: boolean;
  /** Whether it shows: a hidden brick doesn't until it is first hit. */
  shown: boolean;
  /** How long until a broken brick that blasts goes off, in milliseconds, or 0. */
  fuseMs: number;
  /** How long until a broken brick that regrows grows back, in milliseconds. */
  regrowMs: number;
}

/** A brick trait of each kind, by its kind. */
type TraitOf = { readonly [T in BrickTrait as T["kind"]]: T };

/** Says what the field does for one trait, at each moment a brick with it meets. */
interface TraitRule<T extends BrickTrait> {
  /** Runs as the brick takes a hit, before its damage. */
  readonly hit?: (field: Field, brick: Brick, trait: T) => void;
  /** Runs as it breaks. */
  readonly broken?: (field: Field, brick: Brick, trait: T) => void;
  /** Runs at each step while it is in the level, broken or not. */
  readonly step?: (field: Field, brick: Brick, trait: T) => void;
}

/** A moment a trait's rule may run at. */
type Moment = keyof TraitRule<BrickTrait>;

/** What each trait does, so a trait without its rule fails to compile. */
const TRAIT_RULES: {
  readonly [K in TraitKind]: TraitRule<TraitOf[K]>;
} = {
  // Never breaking is its kind's `hits`; the balls and bolts that it stops
  // read the trait.
  hard: {},
  blasts: {
    broken: (_, brick, { delayMs }) => {
      brick.fuseMs = delayMs;
    },
    step: (field, brick) => {
      if (brick.fuseMs <= 0) return;
      brick.fuseMs -= STEP_MS;
      if (brick.fuseMs > 0) return;
      brick.fuseMs = 0;
      goOff(field, brick);
    },
  },
  gives: {
    broken: (field, brick) => {
      dropGift(field, brick);
    },
  },
  hidden: {
    hit: (_, brick) => {
      brick.shown = true;
    },
  },
  regrows: {
    broken: (_, brick, { afterMs }) => {
      brick.regrowMs = afterMs;
    },
    step: (field, brick) => {
      if (!brick.broken) return;
      brick.regrowMs = Math.max(0, brick.regrowMs - STEP_MS);
      if (brick.regrowMs > 0 || isBallIn(field, brick)) return;
      brick.broken = false;
      brick.hits = brick.whole;
      field.events.add("regrown", ...centerOf(brick), brick.cell);
    },
  },
};

// Made once and reused, so a step makes nothing.
const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

/** Returns a brick as a level lays it out, whole. */
export function createBrick(placed: LevelBrick, cell: number): Brick {
  return {
    kind: placed.kind,
    cell,
    tint: placed.tint,
    capsule: placed.capsule,
    whole: placed.hits,
    hits: placed.hits,
    broken: false,
    shown: !hasTrait(placed.kind, "hidden"),
    fuseMs: 0,
    regrowMs: 0,
  };
}

/** Returns whether a brick's kind can break. */
export function canBreak(brick: Readonly<Brick>): boolean {
  return brickKind(brick.kind).hits !== "never";
}

/**
 * Hits a brick once, as a ball, a bolt or a blast does, taking the hits
 * `damage` says off it, or all of them, and returns whether it broke.
 *
 * A brick the level needs may let a capsule fall as it breaks, and breaking
 * the last of them clears the level.
 */
export function hitBrick(
  field: Field,
  brick: Brick,
  x: number,
  y: number,
  damage: number | "breaks" = 1,
): boolean {
  const kind = brickKind(brick.kind);
  runTraits("hit", field, brick);
  if (kind.hits !== "never") {
    brick.hits = damage === "breaks" ? 0 : brick.hits - damage;
  }
  if (kind.hits === "never" || brick.hits > 0) {
    field.events.add("hit", x, y, brick.cell);
    return false;
  }
  brick.broken = true;
  field.events.add("broken", x, y, brick.cell);
  runTraits("broken", field, brick);
  if (!kind.needed) return true;
  field.needed--;
  if (field.needed === 0) {
    field.state = "cleared";
    field.events.add("cleared", x, y);
  } else if (!hasTrait(brick.kind, "gives")) {
    dropByChance(field, brick);
  }
  return true;
}

/** Hits once each of the eight bricks around a brick that isn't broken. */
export function hitAround(
  field: Field,
  brick: Readonly<Brick>,
  x: number,
  y: number,
): void {
  const column = columnOf(brick.cell);
  const row = rowOf(brick.cell);
  for (let down = -1; down <= 1; down++) {
    for (let across = -1; across <= 1; across++) {
      if (!inGrid(column + across, row + down)) continue;
      const near = field.bricks[cellIndex(column + across, row + down)];
      if (near && near !== brick && !near.broken) hitBrick(field, near, x, y);
    }
  }
}

/** Moves each brick's traits on by a step, until the level is cleared. */
export function stepBricks(field: Field): void {
  for (const brick of field.bricks) {
    if (brick) runTraits("step", field, brick);
    if (field.state === "cleared") return;
  }
}

/** Runs the rules of a brick's traits for a moment. */
function runTraits(moment: Moment, field: Field, brick: Brick): void {
  for (const trait of brickKind(brick.kind).traits) {
    runRule(moment, field, brick, trait.kind, trait);
  }
}

/** Runs one trait's rule for a moment, if it has one. */
function runRule<K extends TraitKind>(
  moment: Moment,
  field: Field,
  brick: Brick,
  kind: K,
  trait: TraitOf[K],
): void {
  TRAIT_RULES[kind][moment]?.(field, brick, trait);
}

/** Sets a blast off: the eight bricks around it each take a hit. */
function goOff(field: Field, brick: Brick): void {
  const [x, y] = centerOf(brick);
  field.events.add("blast", x, y, brick.cell);
  hitAround(field, brick, x, y);
}

/** Returns whether a ball in play overlaps a brick's place. */
function isBallIn(field: Field, brick: Readonly<Brick>): boolean {
  brickBox(columnOf(brick.cell), rowOf(brick.cell), box);
  return field.balls.some((ball) => {
    if (!ball.live) return false;
    const nearX = Math.min(box.right, Math.max(box.left, ball.x));
    const nearY = Math.min(box.bottom, Math.max(box.top, ball.y));
    return Math.hypot(ball.x - nearX, ball.y - nearY) < BALL_RADIUS;
  });
}

/** Returns where a brick's middle is, across and down. */
function centerOf(brick: Readonly<Brick>): [number, number] {
  brickBox(columnOf(brick.cell), rowOf(brick.cell), box);
  return [(box.left + box.right) / 2, (box.top + box.bottom) / 2];
}
