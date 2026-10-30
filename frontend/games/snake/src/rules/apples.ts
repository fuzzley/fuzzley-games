import { drawAt } from "@fz/core/random";
import type { Square } from "./geometry";

/**
 * Returns where the next apple goes: a square the snake doesn't cover,
 * chosen by a random seeded from the run's seed and the apples eaten so far,
 * so a run played the same way lays the same apples, and a saved run needs no
 * random state. Returns null when the snake covers the whole board.
 */
export function placeApple(
  snake: readonly Square[],
  size: number,
  seed: number,
  eaten: number,
): Square | null {
  const covered = new Set(snake.map(({ x, y }) => y * size + x));
  const free: number[] = [];
  for (let index = 0; index < size * size; index++) {
    if (!covered.has(index)) free.push(index);
  }
  if (free.length === 0) return null;
  const index = free[Math.floor(drawAt(seed, eaten + 1) * free.length)] ?? 0;
  return { x: index % size, y: Math.floor(index / size) };
}
