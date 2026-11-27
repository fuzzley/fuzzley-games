// The design's files under docs/fuzz-flux/, which specs hold the game to.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The design's folder, from the repository's root. */
const DESIGN = join(import.meta.dirname, "../../../../../docs/fuzz-flux");

/** The names of the design's four sets of levels, as their files are named. */
export const DESIGN_SETS = [
  "warm-up",
  "bricks-and-bars",
  "bedtime",
  "windy-days",
] as const satisfies readonly string[];

/** Returns the text of a file of the design's, by its path under docs/fuzz-flux/. */
export function designText(path: string): string {
  return readFileSync(join(DESIGN, path), "utf8");
}

/** Returns a JSON file of the design's, by its path under docs/fuzz-flux/, as it reads. */
export function designJson(path: string): unknown {
  return JSON.parse(designText(path));
}

/** Returns a set of the design's levels as its file holds it. */
export function designSet(set: (typeof DESIGN_SETS)[number]): unknown {
  return designJson(`levels/${set}.json`);
}
