#!/usr/bin/env node
/**
 * Writes Sudoku's puzzle bank, the puzzles the game deals from.
 *
 *   yarn generate:puzzles
 *
 * Writes `src/rules/bank/<level>.json` for each level: a list of puzzles, each
 * the 81 characters of its givens, row by row, with `.` for a blank. It loads
 * the rules' generator through Vite, as the game's build does, and keeps the
 * puzzles the seeds from 1 up make, in the seeds' order, until each level
 * has its count, so running it again writes the same bank. Workers try the
 * seeds side by side, each loading the rules once, and a seed's puzzle is
 * kept only once every seed before it has been tried, so the bank doesn't
 * depend on which worker finishes first. On eight workers the whole bank
 * takes about a minute and a half, most of it Hard's. `bank.spec.ts` holds
 * every puzzle in it to one solution and its level.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { runnerImport } from "vite";

/** @import { MessagePort } from "node:worker_threads" */

const USAGE = `Usage: yarn generate:puzzles [options]

Writes the puzzle bank, src/rules/bank/<level>.json.

  --count <n>    The puzzles a level (default: 100)
  --workers <n>  The workers trying seeds side by side (default: 8, or one
                 fewer than the machine's cores where it has fewer)
  -h, --help     Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RULES = join(ROOT, "src/rules");

/** How many seeds a worker tries before it reports back. */
const BATCH = 4;

/**
 * What the script takes from the rules.
 *
 * @typedef {object} Rules
 * @property {readonly string[]} levels The levels, easiest first.
 * @property {(level: string, seed: number) => number[] | null} generate
 * @property {(digits: readonly number[]) => string} digitsText
 */

/**
 * Asks a worker to try a run of seeds at a level.
 *
 * @typedef {object} Task
 * @property {string} level
 * @property {number} first The first seed to try.
 * @property {number} count How many seeds to try, from the first.
 */

/**
 * Says what a worker found: each seed's puzzle as text, from the first seed
 * on, or null where a seed made none at the level.
 *
 * @typedef {object} Found
 * @property {number} first
 * @property {(string | null)[]} puzzles
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
 * Tries each run of seeds the main thread sends, and sends back what each
 * seed made. It says "ready" once it has loaded the rules.
 *
 * @param {MessagePort} port
 * @returns {Promise<void>}
 */
async function serve(port) {
  const rules = await loadRules();
  port.on("message", (/** @type {Task} */ { level, first, count }) => {
    /** @type {(string | null)[]} */
    const puzzles = [];
    for (let seed = first; seed < first + count; seed++) {
      const givens = rules.generate(level, seed);
      puzzles.push(givens ? rules.digitsText(givens) : null);
    }
    port.postMessage(/** @type {Found} */ ({ first, puzzles }));
  });
  port.postMessage("ready");
}

/**
 * Starts a worker running this script, and resolves once it has loaded the
 * rules.
 *
 * @returns {Promise<Worker>}
 */
function startWorker() {
  const worker = new Worker(fileURLToPath(import.meta.url));
  return new Promise((resolve, reject) => {
    worker.once("message", () => {
      resolve(worker);
    });
    worker.once("error", reject);
  });
}

/**
 * Returns a level's puzzles, the first `count` the seeds from 1 up make, in
 * the seeds' order, and the seed that made the last of them.
 *
 * @param {readonly Worker[]} workers
 * @param {string} level
 * @param {number} count
 * @returns {Promise<{puzzles: string[], tries: number}>}
 */
function bankFor(workers, level, count) {
  return new Promise((resolve, reject) => {
    /** @type {Map<number, string | null>} */
    const tried = new Map();
    /** @type {string[]} */
    const puzzles = [];
    let checked = 0;
    let nextSeed = 1;
    let busy = 0;

    /**
     * Gives a worker the next run of seeds.
     *
     * @param {Worker} worker
     */
    const send = (worker) => {
      busy++;
      worker.postMessage(
        /** @type {Task} */ ({ level, first: nextSeed, count: BATCH }),
      );
      nextSeed += BATCH;
    };

    /**
     * Keeps what a worker found, in the seeds' order, and gives it more
     * seeds until the level has its puzzles.
     *
     * @param {Worker} worker
     * @param {Found} found
     */
    const take = (worker, { first, puzzles: made }) => {
      busy--;
      made.forEach((puzzle, i) => tried.set(first + i, puzzle));
      while (puzzles.length < count && tried.has(checked + 1)) {
        checked++;
        const puzzle = tried.get(checked);
        if (puzzle) puzzles.push(puzzle);
      }
      if (puzzles.length < count) {
        send(worker);
        return;
      }
      // Done, once the seeds still being tried come back unwanted.
      if (busy > 0) return;
      for (const each of workers) {
        each.removeAllListeners("message");
        each.removeAllListeners("error");
      }
      resolve({ puzzles, tries: checked });
    };

    for (const worker of workers) {
      worker.on("message", (/** @type {Found} */ found) => {
        take(worker, found);
      });
      worker.on("error", reject);
      send(worker);
    }
  });
}

/**
 * Writes every level's puzzles, each level's seeds tried by the workers
 * side by side.
 *
 * @param {number} count The puzzles a level.
 * @param {number} workerCount
 * @returns {Promise<void>}
 */
async function main(count, workerCount) {
  const rules = await loadRules();
  const workers = await Promise.all(
    Array.from({ length: workerCount }, startWorker),
  );
  try {
    await mkdir(join(RULES, "bank"), { recursive: true });
    for (const level of rules.levels) {
      const start = performance.now();
      const { puzzles, tries } = await bankFor(workers, level, count);
      const file = join(RULES, "bank", `${level}.json`);
      await writeFile(file, `${JSON.stringify(puzzles, null, 2)}\n`);
      const seconds = Math.round((performance.now() - start) / 1000);
      console.log(
        `${level}: ${count} puzzles from ${tries} seeds in ${seconds}s`,
      );
    }
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}

if (isMainThread) {
  const { values } = parseArgs({
    options: {
      count: { type: "string", default: "100" },
      workers: {
        type: "string",
        default: String(Math.max(1, Math.min(8, availableParallelism() - 1))),
      },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const count = Number(values.count);
  const workerCount = Number(values.workers);
  if (!Number.isInteger(count) || count < 1) {
    console.error(`${values.count} isn't a count of puzzles.\n\n${USAGE}`);
    process.exit(1);
  }
  if (!Number.isInteger(workerCount) || workerCount < 1) {
    console.error(`${values.workers} isn't a count of workers.\n\n${USAGE}`);
    process.exit(1);
  }
  await main(count, workerCount);
} else if (parentPort) {
  await serve(parentPort);
}
