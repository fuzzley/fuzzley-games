// The draft levels, read from the sets in ../levels/.
import { readFileSync } from "node:fs";

const SETS = ["warm-up", "sparks", "tricks", "thick-walls"];

/** The thirty-six drafts in order, each with its name, its boon and its rows from the top. */
export const LEVELS = SETS.flatMap((set) => {
  const file = new URL(`../levels/${set}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, "utf8")).levels.map((level) => ({
    name: level.name,
    boon: level.boon,
    rows: level.bricks,
  }));
});
