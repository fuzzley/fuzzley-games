import type { LevelEntry } from "./levels";

/**
 * Returns whether a run may start at a level: the first, any level cleared,
 * and the level after one cleared, at any speed.
 */
export function isOpen(
  levels: readonly LevelEntry[],
  cleared: ReadonlySet<string>,
  level: number,
): boolean {
  if (level === 1) return true;
  const entry = levels[level - 1];
  const before = levels[level - 2];
  if (!entry || !before) return false;
  return cleared.has(entry.data.id) || cleared.has(before.data.id);
}

/** Returns the ids of the levels cleared, as stored, keeping only those of a level the game still has. */
export function clearedOf(
  value: unknown,
  levels: readonly LevelEntry[],
): ReadonlySet<string> {
  if (!Array.isArray(value)) return new Set();
  const known = new Set(levels.map((entry) => entry.data.id));
  return new Set(
    value.filter(
      (id: unknown): id is string => typeof id === "string" && known.has(id),
    ),
  );
}
