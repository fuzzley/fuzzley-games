/** Names a square of the board by its column and row, from the top left. */
export interface Square {
  readonly x: number;
  readonly y: number;
}

/** Names a way the snake can head. */
export type Direction = "up" | "right" | "down" | "left";

/** The four directions, clockwise from up. */
export const DIRECTIONS: readonly Direction[] = ["up", "right", "down", "left"];

/** How far a step in each direction moves. */
const OFFSETS: Readonly<Record<Direction, Square>> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

const OPPOSITES: Readonly<Record<Direction, Direction>> = {
  up: "down",
  right: "left",
  down: "up",
  left: "right",
};

/** Returns the square a step in a direction leads to, on the board or not. */
export function stepFrom(square: Square, direction: Direction): Square {
  const offset = OFFSETS[direction];
  return { x: square.x + offset.x, y: square.y + offset.y };
}

/** Returns the direction back the way a direction goes. */
export function opposite(direction: Direction): Direction {
  return OPPOSITES[direction];
}

/** Returns whether two squares are the same. */
export function sameSquare(a: Square, b: Square): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Returns the direction from one square to the next beside it, if it is beside it. */
export function directionTo(from: Square, to: Square): Direction | null {
  return (
    DIRECTIONS.find((direction) => sameSquare(stepFrom(from, direction), to)) ??
    null
  );
}

/** Returns whether a value names a direction. */
export function isDirection(value: unknown): value is Direction {
  return DIRECTIONS.includes(value as Direction);
}
