/**
 * Writes Fuzz Flux's draft levels out a set a file, each level with the
 * moves, the deals and the stars the sketch found for it.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { allLevels, SETS } from "./drafts.mjs";

if (import.meta.main) {
  const here = dirname(fileURLToPath(import.meta.url));
  const found = join(here, "..", "sketch", "results.json");
  /** @type {Record<string, { moves: number, deals: number[], stars: number[] }>} */
  const tuned = existsSync(found)
    ? JSON.parse(readFileSync(found, "utf8")).levels
    : {};
  const levels = allLevels();
  for (const set of SETS) {
    const out = levels
      .filter((level) => level.set === set.id)
      .map((level) => ({ ...level, ...(tuned[level.id] ?? {}) }));
    const file = join(here, `${set.id}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        { id: set.id, name: set.name, about: set.about, levels: out },
        null,
        2,
      ) + "\n",
    );
    console.log(`${set.id}.json: ${out.length} levels`);
  }
}
