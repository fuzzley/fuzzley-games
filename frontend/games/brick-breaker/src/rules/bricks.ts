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
import {
  type Box,
  brickBox,
  cellIndex,
  columnMiddle,
  columnOf,
  inGrid,
  rowMiddle,
  rowOf,
} from "./grid";
import type { LevelBrick } from "./level";
import { stepsIn } from "./stepper";
import { BALL_RADIUS } from "./tuning";

/**
 * Describes a brick in play.
 *
 * A trait that keeps state of its own keeps it here, and sets it as the
 * brick is laid by its rule's `laid`.
 */
export interface Brick {
  readonly kind: BrickKindId;
  /** Its cell in the grid. */
  readonly cell: number;
  /** Its tint, from 0 to 7. */
  readonly tint: number;
  /** The capsule it gives, where the level pins one, else null. */
  readonly capsule: CapsuleId | null;
  /**
   * The hits it takes whole, as the level laid it, 0 for one that never
   * breaks.
   */
  readonly whole: number;
  /** The hits left to break it. */
  hits: number;
  /** Whether it is broken, and so out of the balls' way. */
  broken: boolean;
  /** Whether it shows: a hidden brick doesn't until it is first hit. */
  shown: boolean;
  /** The step a broken brick that blasts goes off at, or 0 for none. */
  goesOffAt: number;
  /** The step a broken brick that regrows may grow back at. */
  regrowsAt: number;
}

/** A brick trait of each kind, by its kind. */
type TraitOf = { readonly [T in BrickTrait as T["kind"]]: T };

/** Says what the field does for one trait, at each moment a brick with it meets. */
interface TraitRule<T extends BrickTrait> {
  /** Runs as the level lays the brick out, to set its state. */
  readonly laid?: (brick: Brick, trait: T) => void;
  /** Runs as the brick takes a hit, before its damage. */
  readonly hit?: (field: Field, brick: Brick, trait: T) => void;
  /** Runs as it breaks. */
  readonly broken?: (field: Field, brick: Brick, trait: T) => void;
  /** Runs at each step while it is in the level, broken or not. */
  readonly step?: (field: Field, brick: Brick, trait: T) => void;
}

/** A moment in play a trait's rule may run at. */
type Moment = "hit" | "broken" | "step";

/** What each trait does, so a trait without its rule fails to compile. */
const TRAIT_RULES: {
  readonly [K in TraitKind]: TraitRule<TraitOf[K]>;
} = {
  // Never breaking is its kind's `hits`, which the balls and bolts read.
  hard: {},
  blasts: {
    broken: (field, brick, { delayMs }) => {
      brick.goesOffAt = field.steps + stepsIn(delayMs);
    },
    step: (field, brick) => {
      if (brick.goesOffAt === 0 || field.steps < brick.goesOffAt) return;
      brick.goesOffAt = 0;
      goOff(field, brick);
    },
  },
  gives: {
    broken: (field, brick) => {
      dropGift(field, brick);
    },
  },
  hidden: {
    laid: (brick) => {
      brick.shown = false;
    },
    hit: (_, brick) => {
      brick.shown = true;
    },
  },
  regrows: {
    broken: (field, brick, { afterMs }) => {
      brick.regrowsAt = field.steps + stepsIn(afterMs);
    },
    step: (field, brick) => {
      if (!brick.broken || field.steps < brick.regrowsAt) return;
      if (isBallIn(field, brick)) return;
      brick.broken = false;
      brick.hits = brick.whole;
      field.events.add("regrown", middleX(brick), middleY(brick), brick.cell);
    },
  },
};

// Made once and reused, so a step makes nothing.
const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };

/** Returns a brick as a level lays it out, whole. */
export function createBrick(placed: LevelBrick, cell: number): Brick {
  const brick: Brick = {
    kind: placed.kind,
    cell,
    tint: placed.tint,
    capsule: placed.capsule,
    whole: placed.hits,
    hits: placed.hits,
    broken: false,
    shown: true,
    goesOffAt: 0,
    regrowsAt: 0,
  };
  for (const trait of brickKind(brick.kind).traits) {
    layRule(brick, trait.kind, trait);
  }
  return brick;
}

/** Returns whether a brick's kind can break. */
export function canBreak(brick: Readonly<Brick>): boolean {
  return brickKind(brick.kind).hits !== "never";
}

/** Returns whether the level needs a brick broken to be cleared. */
export function isNeeded(brick: Readonly<Brick>): boolean {
  return brickKind(brick.kind).needed;
}

/**
 * Hits a brick once, as a ball, a bolt or a blast does, taking the hits
 * `damage` says off it, or all of them, and returns whether it broke.
 *
 * Its events are recorded at `x` and `y`, where the ball, the bolt or the
 * blast was. A brick the level needs may let a capsule fall as it breaks,
 * and breaking the last of them clears the level, after which, as before a
 * broken brick, a hit does nothing.
 */
export function hitBrick(
  field: Field,
  brick: Brick,
  x: number,
  y: number,
  damage: number | "breaks" = 1,
): boolean {
  if (brick.broken || field.state === "cleared") return false;
  runTraits("hit", field, brick);
  if (canBreak(brick)) {
    brick.hits = damage === "breaks" ? 0 : brick.hits - damage;
  }
  if (!canBreak(brick) || brick.hits > 0) {
    field.events.add("hit", x, y, brick.cell);
    return false;
  }
  brick.broken = true;
  field.events.add("broken", x, y, brick.cell);
  runTraits("broken", field, brick);
  if (!isNeeded(brick)) return true;
  field.needed--;
  if (field.needed === 0) {
    field.state = "cleared";
    field.events.add("cleared", x, y);
  } else if (!hasTrait(brick.kind, "gives")) {
    dropByChance(field, brick);
  }
  return true;
}

/** Hits once each of the eight bricks around a brick. */
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
      if (near && near !== brick) hitBrick(field, near, x, y);
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

/** Runs the rules of a brick's traits for a moment in play. */
function runTraits(moment: Moment, field: Field, brick: Brick): void {
  for (const trait of brickKind(brick.kind).traits) {
    runRule(moment, field, brick, trait.kind, trait);
  }
}

/** Runs one trait's rule for a moment in play, if it has one. */
function runRule<K extends TraitKind>(
  moment: Moment,
  field: Field,
  brick: Brick,
  kind: K,
  trait: TraitOf[K],
): void {
  TRAIT_RULES[kind][moment]?.(field, brick, trait);
}

/** Runs one trait's rule as the brick is laid, if it has one. */
function layRule<K extends TraitKind>(
  brick: Brick,
  kind: K,
  trait: TraitOf[K],
): void {
  TRAIT_RULES[kind].laid?.(brick, trait);
}

/** Sets a blast off: the eight bricks around it each take a hit. */
function goOff(field: Field, brick: Brick): void {
  const x = middleX(brick);
  const y = middleY(brick);
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

/** Returns where a brick's middle is, across. */
function middleX(brick: Readonly<Brick>): number {
  return columnMiddle(columnOf(brick.cell));
}

/** Returns where a brick's middle is, down. */
function middleY(brick: Readonly<Brick>): number {
  return rowMiddle(rowOf(brick.cell));
}
