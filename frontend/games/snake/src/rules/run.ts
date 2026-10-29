import { placeApple } from "./apples";
import { BOARD_SIZE, landing } from "./arena";
import { type Direction, type Square, opposite, sameSquare } from "./geometry";
import type { Speed } from "./speed";

/**
 * Says where a run stands: waiting for its first direction, under way,
 * paused, ended by a crash, or won by filling the board.
 */
export type Outcome = "ready" | "playing" | "paused" | "over" | "won";

/** Says what the snake ran into. */
export type Crash = "wall" | "self";

/**
 * Says what a step did: the snake moved, ate an apple (and another was laid),
 * crashed, or ate the last apple there was room for.
 */
export type StepKind = "moved" | "ate" | "crashed" | "won";

/** A run of the game, a value each move replaces. */
export interface Run {
  /** Tells runs apart: a new run takes a new one. */
  readonly id: number;
  /** How many squares the board has across, and down. */
  readonly size: number;
  /** The squares the snake covers, from its head to its tail. */
  readonly snake: readonly Square[];
  /** The way the head went on its last step, or will go on its first. */
  readonly heading: Direction;
  /** The turns pressed and not yet taken, at most {@link MAX_TURNS}. */
  readonly turns: readonly Direction[];
  /** The apple on the board, or null once the snake fills it. */
  readonly apple: Square | null;
  /** Where the apples come from: the same seed lays the same apples. */
  readonly seed: number;
  /** The apples eaten, which are the score. */
  readonly eaten: number;
  readonly speed: Speed;
  readonly outcome: Outcome;
  /** What the snake ran into, once it has. */
  readonly crash: Crash | null;
  /** How many steps the snake has taken. */
  readonly steps: number;
  /** What the last step did, or null before the first. */
  readonly last: StepKind | null;
}

/** Says how a new run starts. */
export interface RunStart {
  readonly id: number;
  readonly seed: number;
  readonly speed: Speed;
}

/** How many squares long the snake starts. */
export const START_LENGTH = 3;

/** How many turns can wait to be taken, so "up, then left" both happen. */
export const MAX_TURNS = 2;

/**
 * Returns a new run: the snake three squares long, left of the middle,
 * heading right, with an apple ahead of it, waiting for the first direction.
 */
export function createRun({ id, seed, speed }: RunStart): Run {
  const middle = Math.floor(BOARD_SIZE / 2);
  const head = middle - 4;
  return {
    id,
    size: BOARD_SIZE,
    snake: Array.from({ length: START_LENGTH }, (_, i) => ({
      x: head - i,
      y: middle,
    })),
    heading: "right",
    turns: [],
    apple: { x: middle + 4, y: middle },
    seed,
    eaten: 0,
    speed,
    outcome: "ready",
    crash: null,
    steps: 0,
    last: null,
  };
}

/** Returns whether a run has ended, by a crash or a full board. */
export function hasEnded(run: Run): boolean {
  return run.outcome === "over" || run.outcome === "won";
}

/**
 * Returns the run with a direction pressed: queued as a turn, if it turns the
 * way the snake will be heading by then, and there is room in the queue.
 *
 * A run waiting or paused starts or goes on at a direction. Back the way
 * the snake is heading starts nothing, but goes on with a paused run straight
 * ahead, since a player who stopped to think may press it. A turn back is
 * dropped, as is one the way the snake already goes.
 */
export function turn(run: Run, direction: Direction): Run {
  if (hasEnded(run)) return run;
  const ahead = run.turns.at(-1) ?? run.heading;
  if (direction === opposite(ahead)) return resume(run);
  const queues = direction !== ahead && run.turns.length < MAX_TURNS;
  if (run.outcome === "playing" && !queues) return run;
  return {
    ...run,
    outcome: "playing",
    turns: queues ? [...run.turns, direction] : run.turns,
  };
}

/**
 * Returns the run a step on: the head takes the next turn queued, or goes on
 * as it was heading, and the snake moves, eats, crashes or wins.
 *
 * The head may move onto the square the tail is leaving, unless the snake
 * grows on that step, when the tail stays.
 */
export function step(run: Run): Run {
  if (run.outcome !== "playing") return run;
  const [next, ...turns] = run.turns;
  const heading = next ?? run.heading;
  const moved = { ...run, heading, turns, steps: run.steps + 1 };
  const [head] = run.snake;
  const target = head && landing(head, heading, run.size);
  if (!target) return crash(moved, "wall");
  const grows = run.apple !== null && sameSquare(target, run.apple);
  const body = grows ? run.snake : run.snake.slice(0, -1);
  if (body.some((square) => sameSquare(square, target))) {
    return crash(moved, "self");
  }
  const snake = [target, ...body];
  if (!grows) return { ...moved, snake, last: "moved" };
  const eaten = run.eaten + 1;
  const apple = placeApple(snake, run.size, run.seed, eaten);
  return {
    ...moved,
    snake,
    eaten,
    apple,
    outcome: apple ? "playing" : "won",
    last: apple ? "ate" : "won",
  };
}

/** Returns a run that has crashed into something. */
function crash(run: Run, into: Crash): Run {
  return { ...run, outcome: "over", crash: into, turns: [], last: "crashed" };
}

/** Returns the run paused, if it is under way. */
export function pause(run: Run): Run {
  return run.outcome === "playing" ? { ...run, outcome: "paused" } : run;
}

/** Returns the run going on, if it is paused. */
export function resume(run: Run): Run {
  return run.outcome === "paused" ? { ...run, outcome: "playing" } : run;
}
