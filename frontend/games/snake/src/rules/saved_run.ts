import { isCount, isListOf, isRecord, isWhole, listOf } from "@fz/core/json";
import { isUnderWay } from "@fz/core/run";
import { BOARD_SIZE, onBoard } from "./arena";
import {
  type Direction,
  type Square,
  directionTo,
  isDirection,
  opposite,
  sameSquare,
} from "./geometry";
import { MAX_TURNS, type Run, START_LENGTH } from "./run";
import { isSpeed } from "./speed";

/** A run under way as storage keeps it. */
export interface SavedRun {
  /** The snake from head to tail, as `[x, y]` pairs. */
  readonly snake: readonly (readonly [number, number])[];
  readonly heading: Direction;
  readonly turns: readonly Direction[];
  readonly apple: readonly [number, number];
  readonly seed: number;
  readonly eaten: number;
  readonly speed: string;
  readonly steps: number;
}

/**
 * Returns a run under way as storage keeps it, or null for one that isn't:
 * one waiting for its first direction, or one that has ended.
 */
export function saveRun(run: Run): SavedRun | null {
  if (!isUnderWay(run.outcome)) return null;
  if (!run.apple) return null;
  return {
    snake: run.snake.map(({ x, y }) => [x, y] as const),
    heading: run.heading,
    turns: run.turns,
    apple: [run.apple.x, run.apple.y],
    seed: run.seed,
    eaten: run.eaten,
    speed: run.speed,
    steps: run.steps,
  };
}

/**
 * Returns the run storage kept, paused, under a new id, or null if what was
 * kept can't be trusted: a snake off the board, broken, crossing itself,
 * heading back into itself, or not as long as its apples say; an apple
 * under it; or a turn that couldn't have been queued.
 */
export function restoreRun(value: unknown, id: number): Run | null {
  if (!isRecord(value)) return null;
  const { heading, turns, seed, eaten, speed, steps } = value;
  const snake = listOf(value["snake"], squareOf);
  const apple = squareOf(value["apple"]);
  if (
    !snake ||
    !apple ||
    !isDirection(heading) ||
    !isSpeed(speed) ||
    !isWhole(seed) ||
    !isCount(eaten) ||
    !isCount(steps) ||
    snake.length !== START_LENGTH + eaten ||
    !isListOf(turns, isDirection) ||
    turns.length > MAX_TURNS
  ) {
    return null;
  }
  if (!holdsTogether(snake, heading) || !queueable(heading, turns)) {
    return null;
  }
  if (snake.some((square) => sameSquare(square, apple))) return null;
  return {
    id,
    size: BOARD_SIZE,
    snake,
    heading,
    turns,
    apple,
    seed,
    eaten,
    speed,
    outcome: "paused",
    crash: null,
    steps,
    last: null,
  };
}

/** Returns an `[x, y]` pair as a square on the board, or null if it isn't one. */
function squareOf(pair: unknown): Square | null {
  if (!Array.isArray(pair) || pair.length !== 2) return null;
  const [x, y] = pair as unknown[];
  if (!isWhole(x) || !isWhole(y)) return null;
  const square = { x, y };
  return onBoard(square, BOARD_SIZE) ? square : null;
}

/**
 * Returns whether a snake is one piece, each square beside the next and none
 * twice, with its head heading anywhere but back into it.
 */
function holdsTogether(snake: readonly Square[], heading: Direction): boolean {
  const seen = new Set<number>();
  for (const [i, square] of snake.entries()) {
    const key = square.y * BOARD_SIZE + square.x;
    if (seen.has(key)) return false;
    seen.add(key);
    const next = snake[i + 1];
    if (next && !directionTo(square, next)) return false;
  }
  const [head, neck] = snake;
  return !head || !neck || directionTo(head, neck) !== heading;
}

/** Returns whether turns could have been queued after a heading. */
function queueable(heading: Direction, turns: readonly Direction[]): boolean {
  let ahead = heading;
  for (const next of turns) {
    if (next === ahead || next === opposite(ahead)) return false;
    ahead = next;
  }
  return true;
}
