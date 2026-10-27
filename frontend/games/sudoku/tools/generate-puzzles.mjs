#!/usr/bin/env node
/**
 * Writes Sudoku's puzzle bank, the puzzles the game deals from.
 *
 *   yarn generate:puzzles
 *
 * Writes `src/rules/bank/<level>.json` for each level: a list of puzzles, each
 * the 81 characters of its givens, row by row, with `.` for a blank. It loads
 * the rules' generator through Vite, as the game's build does, and tries
 * seeds from 1 up until each level has its puzzles, so running it again
 * writes the same bank. `bank.spec.ts` holds every puzzle in it to one
 * solution and its level. Hard takes the longest, about six minutes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runnerImport } from "vite";

const USAGE = `Usage: yarn generate:puzzles [options]

Writes the puzzle bank, src/rules/bank/<level>.json.

  --count <n>  The puzzles a level (default: 100)
  -h, --help   Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RULES = join(ROOT, "src/rules");

/**
 * What the script takes from the rules.
 *
 * @typedef {object} Rules
 * @property {readonly string[]} levels The levels, easiest first.
 * @property {(level: string, seed: number) => number[] | null} generate
 * @property {(digits: readonly number[]) => string} digitsText
 */

/**
 * Returns the rules' generator, levels and writer, loaded through Vite.
 *
 * @returns {Promise<Rules>}
 */
async function loadRules() {
  /**
   * Returns one of the rules' modules.
   *
   * @param {string} file
   * @returns {Promise<Record<string, unknown>>}
   */
  async function load(file) {
    const { module } = await runnerImport(join(RULES, file), {
      configFile: false,
      root: ROOT,
      logLevel: "silent",
    });
    return /** @type {Record<string, unknown>} */ (module);
  }
  const [generate, difficulty, puzzle] = await Promise.all([
    load("generate.ts"),
    load("difficulty.ts"),
    load("puzzle.ts"),
  ]);
  return /** @type {Rules} */ ({
    levels: difficulty["LEVELS"],
    generate: generate["generate"],
    digitsText: puzzle["digitsText"],
  });
}

/**
 * Returns a level's puzzles, trying seeds from 1 up.
 *
 * @param {Rules} rules
 * @param {string} level
 * @param {number} count
 * @returns {{puzzles: string[], tries: number}}
 */
function bankFor(rules, level, count) {
  const puzzles = [];
  let seed = 0;
  while (puzzles.length < count) {
    seed++;
    const givens = rules.generate(level, seed);
    if (givens) puzzles.push(rules.digitsText(givens));
  }
  return { puzzles, tries: seed };
}

const { values } = parseArgs({
  options: {
    count: { type: "string", default: "100" },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const count = Number(values.count);
if (!Number.isInteger(count) || count < 1) {
  console.error(`${values.count} isn't a count of puzzles.\n\n${USAGE}`);
  process.exit(1);
}

const rules = await loadRules();
await mkdir(join(RULES, "bank"), { recursive: true });
for (const level of rules.levels) {
  const start = performance.now();
  const { puzzles, tries } = bankFor(rules, level, count);
  const file = join(RULES, "bank", `${level}.json`);
  await writeFile(file, `${JSON.stringify(puzzles, null, 2)}\n`);
  const seconds = Math.round((performance.now() - start) / 1000);
  console.log(`${level}: ${count} puzzles from ${tries} seeds in ${seconds}s`);
}
