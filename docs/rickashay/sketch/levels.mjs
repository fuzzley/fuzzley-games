// The draft levels, read from ../levels/ as the game would read them.
import { readFileSync } from "node:fs";

/** The sets' ids, in the order the game plays them. */
export const SETS = ["warm-up", "angles", "tricks", "long-rallies"];

/** Every draft level, in order, each with its set's name. */
export const LEVELS = SETS.flatMap((id) => {
  const set = JSON.parse(
    readFileSync(new URL(`../levels/${id}.json`, import.meta.url), "utf8"),
  );
  return set.levels.map((level) => ({ ...level, set: set.name }));
});
