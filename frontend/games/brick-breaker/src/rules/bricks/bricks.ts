import type { Box } from "@fz/core/sweep";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  type BrickTrait,
  type TraitKind,
  brickKind,
  hasTrait,
  isNeeded,
} from "../catalog/bricks";
import type { CapsuleId } from "../catalog/capsules";
import { nextDraw } from "../draws";
import type { Field } from "../field/field";
import { scoreBreak, scoreHit } from "../field/scoring";
import {
  brickBox,
  cellIndex,
  cellMiddleX,
  cellMiddleY,
  columnOf,
  inGrid,
  rowOf,
} from "../grid";
import type { LevelBrick } from "../levels/level";
import { overlapsBox, releaseBall } from "../paddle/balls";
import { stepsIn } from "../stepper";
import { FRIEND_INKS, FRIEND_SPREAD } from "../tuning";
import { dropFrom } from "./capsules";

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
  // Its capsule is `dropFrom()`'s, which lets one fall from every brick that
  // breaks, by the level's chance or, for a gift, always.
  gives: {},
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
      field.events.add(
        "regrown",
        cellMiddleX(brick.cell),
        cellMiddleY(brick.cell),
        brick.cell,
      );
    },
  },
  frees: {
    broken: (field, brick) => {
      freeFriend(field, brick);
    },
  },
  // Its underside is the travel's and the bolts' to read (`isPlated()`).
  plated: {},
  unlocks: {
    broken: (field, brick) => {
      field.keysLeft--;
      if (field.keysLeft === 0) openGates(field, brick);
    },
  },
  // The last key's rule opens it.
  locked: {},
};

/** The kinds plated underneath, read at every contact, so a step makes nothing. */
const PLATED: ReadonlySet<BrickKindId> = new Set(
  BRICK_KIND_IDS.filter((id) => hasTrait(id, "plated")),
);

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

/**
 * Returns whether a brick is plated underneath: a ball rising into its
 * bottom face or corners turns there, a bolt is spent there, and it takes
 * no hit.
 */
export function isPlated(brick: Readonly<Brick>): boolean {
  return PLATED.has(brick.kind);
}

/** Returns how many of a level's bricks it needs that are not yet broken. */
export function neededLeft(
  bricks: readonly (Readonly<Brick> | null)[],
): number {
  return bricks.filter(
    (brick) => brick && isNeeded(brick.kind) && !brick.broken,
  ).length;
}

/**
 * Hits a brick once, as a ball, a bolt or a blast does, taking the hits
 * `damage` says off it, or all of them, and returns whether it broke.
 *
 * Its events are recorded at `x` and `y`, where the ball, the bolt or the
 * blast was. Each hit scores the hits it takes, and each brick broken
 * lengthens the streak, which multiplies the score, and may let a capsule
 * fall. Breaking the last brick the level needs clears it, after which, as
 * on a broken brick, a hit does nothing.
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
  const before = brick.hits;
  if (canBreak(brick)) {
    brick.hits = damage === "breaks" ? 0 : Math.max(0, brick.hits - damage);
  }
  if (!canBreak(brick) || brick.hits > 0) {
    scoreHit(field, brick, before - brick.hits);
    field.events.add("hit", x, y, brick.cell);
    return false;
  }
  brick.broken = true;
  scoreBreak(field, brick, before);
  field.events.add("broken", x, y, brick.cell, null, field.streak);
  if (isNeeded(brick.kind)) {
    field.needed--;
    field.dryBounces = 0;
    if (field.needed === 0) {
      field.state = "cleared";
      field.events.add("cleared", x, y);
    }
  }
  runTraits("broken", field, brick);
  dropFrom(field, brick);
  return true;
}

/** Returns how many of a level's keys are not yet broken. */
export function unbrokenKeys(
  bricks: readonly (Readonly<Brick> | null)[],
): number {
  return bricks.filter(
    (brick) => brick && hasTrait(brick.kind, "unlocks") && !brick.broken,
  ).length;
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

/**
 * Opens every gate at once, out of the balls' way, as the last key breaks,
 * and says so where the key was, unless that hit cleared the level, after
 * which nothing more is said.
 */
function openGates(field: Field, key: Readonly<Brick>): void {
  for (const brick of field.bricks) {
    if (brick && hasTrait(brick.kind, "locked")) brick.broken = true;
  }
  if (field.state === "cleared") return;
  field.events.add("opened", cellMiddleX(key.cell), cellMiddleY(key.cell));
}

/** Sets a blast off: the eight bricks around it each take a hit. */
function goOff(field: Field, brick: Brick): void {
  const x = cellMiddleX(brick.cell);
  const y = cellMiddleY(brick.cell);
  field.events.add("blast", x, y, brick.cell);
  hitAround(field, brick, x, y);
}

/**
 * Frees a cage's friend while the level is in play: a ball more, at the
 * cage's middle, heading up within {@link FRIEND_SPREAD} of straight up by
 * the field's next draw, wearing the next of the friends' inks. With every
 * ball the field holds in play, the cage frees nobody.
 */
function freeFriend(field: Field, brick: Readonly<Brick>): void {
  if (field.state !== "playing") return;
  const friend = field.balls.find((ball) => !ball.live);
  if (!friend) return;
  const x = cellMiddleX(brick.cell);
  const y = cellMiddleY(brick.cell);
  const degrees = (nextDraw(field) * 2 - 1) * FRIEND_SPREAD;
  releaseBall(friend, x, y, degrees, field.friendsFreed % FRIEND_INKS);
  field.friendsFreed++;
  field.events.add("freed", x, y, brick.cell);
}

/** Returns whether a ball in play overlaps a brick's place. */
function isBallIn(field: Field, brick: Readonly<Brick>): boolean {
  brickBox(columnOf(brick.cell), rowOf(brick.cell), box);
  return field.balls.some((ball) => ball.live && overlapsBox(ball, box));
}
