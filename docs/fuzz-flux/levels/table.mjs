/**
 * Prints the draft levels as the tables the design's appendix holds, a set at
 * a time: `node docs/fuzz-flux/levels/table.mjs`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TARGETS } from "../sketch/report.mjs";
import { SETS, allLevels } from "./drafts.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tuned = JSON.parse(
  readFileSync(join(here, "..", "sketch", "results.json"), "utf8"),
).levels;
const WORDS = {
  dust: "all the dust",
  brick: "every brick",
  cage: "every cage",
  sleepy: "every sleepyhead",
};

/**
 * Returns a level's goals in words.
 * @param {ReturnType<typeof allLevels>[number]} level
 * @returns {string}
 */
function goals(level) {
  return level.goals
    .map((g) => (g.type === "gather" ? `${g.count} ${g.kind}` : WORDS[g.type]))
    .join(", ");
}

/**
 * Returns what stands on a level's board besides fuzzballs, in words.
 * @param {ReturnType<typeof allLevels>[number]} level
 * @returns {string}
 */
function holds(level) {
  const all = level.board.join("");
  const dust = (level.dust ?? []).join("");
  const count = (/** @type {RegExp} */ re, /** @type {string} */ text = all) =>
    (text.match(re) ?? []).length;
  /** @type {[number, string][]} */
  const parts = [
    [count(/_/g), "gaps"],
    [count(/[1-9]/g, dust), "dusty squares"],
    [count(/[1-4]/g), "bricks"],
    [count(/[A-Z?]/g), "cages"],
    [count(/z/g), "sleepyheads"],
    [count(/\*/g), "burrs"],
    [(level.specials ?? []).length, "specials"],
  ];
  const list = parts.filter(([n]) => n > 0).map(([n, name]) => `${n} ${name}`);
  if (level.wind)
    list.push(
      level.wind.every
        ? `wind ${level.wind.dir}, turning every ${level.wind.every} moves`
        : `wind ${level.wind.dir}`,
    );
  return list.join(", ") || "fuzzballs only";
}

const levels = allLevels();
SETS.forEach((set, at) => {
  console.log(
    `### ${set.name}, levels ${at * 9 + 1} to ${at * 9 + 9}\n\n${set.about}\n`,
  );
  console.log(
    "| # | Level | The idea | Board | Kinds | On the board | Goals | Moves | Casual clears |",
  );
  console.log(
    "| - | ----- | -------- | ----- | ----- | ------------ | ----- | ----- | ------------- |",
  );
  levels
    .filter((level) => level.set === set.id)
    .forEach((level, n) => {
      const size = `${level.board[0].length} by ${level.board.length}`;
      console.log(
        `| ${level.id} | ${level.name} | ${level.idea} | ${size} | ${level.kinds.length} | ${holds(level)} | ${goals(level)} | ${tuned[level.id].moves} | ${Math.round(TARGETS[at][n] * 100)}% |`,
      );
    });
  console.log("");
});
