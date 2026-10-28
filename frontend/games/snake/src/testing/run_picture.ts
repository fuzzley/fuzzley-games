import {
  type Direction,
  type Square,
  directionTo,
  opposite,
  stepFrom,
} from "../rules/geometry";
import { type Outcome, type Run, START_LENGTH } from "../rules/run";
import type { Speed } from "../rules/speed";

/** What an arrow on a square of the snake points to: the square nearer the head. */
const ARROWS: Readonly<Record<string, Direction>> = {
  "^": "up",
  ">": "right",
  v: "down",
  "<": "left",
};

/** What {@link runFrom} sets beyond what the picture shows. */
export interface RunPictureOptions {
  readonly id?: number;
  /** The way the head is heading; else away from the square behind it. */
  readonly heading?: Direction;
  readonly turns?: readonly Direction[];
  readonly speed?: Speed;
  readonly seed?: number;
  readonly outcome?: Outcome;
  /** The apples eaten; else as many as the snake has grown. */
  readonly eaten?: number;
  readonly steps?: number;
}

/**
 * Returns a run drawn as a square picture, one string a row: `@` for the
 * head, an arrow (`>`, `<`, `^`, `v`) on each other square of the snake
 * pointing toward the head, `*` for the apple and `.` for a free square. The
 * board is as big as the picture.
 */
export function runFrom(
  picture: readonly string[],
  options: RunPictureOptions = {},
): Run {
  const size = picture.length;
  const at = (square: Square): string => picture[square.y]?.[square.x] ?? " ";
  let head: Square | null = null;
  let apple: Square | null = null;
  for (const [y, row] of picture.entries()) {
    if (row.length !== size) throw new Error(`Row ${y} isn't ${size} long`);
    for (let x = 0; x < size; x++) {
      if (row[x] === "@") head = { x, y };
      if (row[x] === "*") apple = { x, y };
    }
  }
  if (!head) throw new Error("The picture has no head");

  const snake: Square[] = [head];
  for (let current: Square = head; ;) {
    const behind = Object.entries(ARROWS)
      .map(([mark, direction]) => ({
        square: stepFrom(current, opposite(direction)),
        mark,
      }))
      .find(({ square, mark }) => at(square) === mark);
    if (!behind) break;
    if (
      snake.some(({ x, y }) => x === behind.square.x && y === behind.square.y)
    ) {
      throw new Error("The snake's arrows go round in a circle");
    }
    current = behind.square;
    snake.push(current);
  }

  const neck = snake[1];
  const away = neck ? directionTo(neck, head) : null;
  return {
    id: options.id ?? 1,
    size,
    snake,
    heading: options.heading ?? away ?? "right",
    turns: options.turns ?? [],
    apple,
    seed: options.seed ?? 1,
    eaten: options.eaten ?? Math.max(0, snake.length - START_LENGTH),
    speed: options.speed ?? "normal",
    outcome: options.outcome ?? "playing",
    crash: null,
    steps: options.steps ?? 0,
    last: null,
  };
}

/** Returns a run drawn as {@link runFrom} reads it. */
export function pictureOf(run: Run): string[] {
  const rows = Array.from({ length: run.size }, () =>
    Array.from({ length: run.size }, () => "."),
  );
  const mark = (square: Square, char: string): void => {
    const row = rows[square.y];
    if (row) row[square.x] = char;
  };
  if (run.apple) mark(run.apple, "*");
  for (const [i, square] of run.snake.entries()) {
    const toward = run.snake[i - 1];
    const direction = toward ? directionTo(square, toward) : null;
    const arrow = Object.entries(ARROWS).find(([, d]) => d === direction);
    mark(square, i === 0 ? "@" : (arrow?.[0] ?? "?"));
  }
  return rows.map((row) => row.join(""));
}
