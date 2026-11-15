#!/usr/bin/env node
/**
 * Plays every level under every variant of the rules `tune_up.ts` lists,
 * and writes what each came to.
 *
 *   node docs/brick-fuzz-pop-tune-up/sim/run.mjs [--seeds <n>] [--level <n>]…
 *
 * It makes the scratch mirror (`mirror.mjs`), then plays each level in a
 * process of its own, as many at once as the machine has cores but two,
 * each loading `measureLevel()` through Vite from the mirror, and writes
 * each level's counts to `<tmp>/bfp-tune-up/results/levels/<number>.json`,
 * too large to keep here. `summarize.mjs`
 * reads them. With `--level` it plays only those, in the mirror as it
 * stands if `--keep-mirror` is given.
 */
import { fork } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { MIRROR_FOLDER, makeMirror } from "./mirror.mjs";

/** @import { LevelCount } from "./tune_up.ts" */

const SIM = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(MIRROR_FOLDER, "results/levels");

/** How many games each level is played on each depth under each variant unless `--seeds` says otherwise. */
const SEEDS = 12;

/**
 * Returns what the sim measures, loaded through Vite from the mirror.
 *
 * @param {string} workspace The mirrored workspace's path.
 * @returns {Promise<{ measureLevel: (level: number, seeds: number) => LevelCount, LEVEL_COUNT: number }>}
 */
async function loadTuneUp(workspace) {
  const { runnerImport } = await import(
    join(workspace, "../../node_modules/vite/dist/node/index.js")
  );
  const { module } = await runnerImport(
    join(workspace, "src/testing/tune_up.ts"),
    { configFile: false, root: workspace, logLevel: "silent" },
  );
  return module;
}

/**
 * Plays one level in this process and writes its counts.
 *
 * @param {string} workspace
 * @param {number} level
 * @param {number} seeds
 * @returns {Promise<void>}
 */
async function playLevel(workspace, level, seeds) {
  const { measureLevel } = await loadTuneUp(workspace);
  const counted = measureLevel(level, seeds);
  await mkdir(RESULTS, { recursive: true });
  await writeFile(
    join(RESULTS, `${String(level).padStart(2, "0")}.json`),
    `${JSON.stringify(counted)}\n`,
  );
}

/**
 * Plays levels in processes of their own, a few at once, and resolves once
 * every one is done, rejecting if one fails.
 *
 * @param {string} workspace
 * @param {readonly number[]} levels
 * @param {number} seeds
 * @returns {Promise<void>}
 */
async function playLevels(workspace, levels, seeds) {
  const waiting = [...levels];
  const started = Date.now();
  /** @returns {Promise<void>} */
  const next = async () => {
    for (;;) {
      const level = waiting.shift();
      if (level === undefined) return;
      await new Promise((done, failed) => {
        const child = fork(fileURLToPath(import.meta.url), [
          "--one",
          workspace,
          String(level),
          String(seeds),
        ]);
        child.on("exit", (code) => {
          if (code === 0) done(undefined);
          else
            failed(
              new Error(`Level ${String(level)} exited with ${String(code)}.`),
            );
        });
      });
      const seconds = Math.round((Date.now() - started) / 1000);
      console.log(`level ${String(level)} done at ${String(seconds)} s`);
    }
  };
  const pool = Math.max(1, availableParallelism() - 2);
  await Promise.all(Array.from({ length: pool }, next));
}

if (process.argv[2] === "--one") {
  const [, , , workspace = "", level = "", seeds = ""] = process.argv;
  await playLevel(workspace, Number(level), Number(seeds));
} else {
  const { values } = parseArgs({
    options: {
      seeds: { type: "string" },
      level: { type: "string", multiple: true },
      "keep-mirror": { type: "boolean" },
    },
  });
  const workspace = values["keep-mirror"]
    ? join(MIRROR_FOLDER, "fz/frontend/games/brick-fuzz-pop")
    : await makeMirror(MIRROR_FOLDER);
  const { LEVEL_COUNT } = await loadTuneUp(workspace);
  const levels =
    values.level?.map(Number) ??
    Array.from({ length: LEVEL_COUNT }, (_, index) => index + 1);
  await playLevels(workspace, levels, Number(values.seeds ?? SEEDS));
}
