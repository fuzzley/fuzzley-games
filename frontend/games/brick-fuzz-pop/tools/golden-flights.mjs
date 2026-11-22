#!/usr/bin/env node
/**
 * Writes the golden flights: how every level's certificate, and the shots
 * drawn at its opening, fly on every depth, hashed.
 *
 *   yarn golden:flights
 *
 * For each level and depth it plays the level's certificate round by round,
 * and each shot drawn from a seed at the level's opening, through
 * `playRound()`, and hashes each round's flight, outcome and next start,
 * the certificate's rounds together and the shots' together
 * (`src/testing/golden_flights.ts`). It writes them to
 * `src/rules/levels/golden/golden.json`, the levels' ids sorted, so a run
 * writes the same bytes as the last unless a round flies otherwise. The spec
 * beside it plays them again, so a change that moves the rules' code without
 * changing how a shot plays keeps it passing. It loads what it plays,
 * `GOLDEN_API` in `src/testing/golden_api.ts`, through Vite, as the game's
 * build loads the rules.
 *
 * It exits with 2, saying why, for a command line it can't read, before it
 * plays anything.
 */
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONSOLE,
  importThroughVite,
  isStop,
  readArgs,
  stopWith,
} from "@fz/dev/script";

/** @import { Printer, ScriptIo, Stop } from "@fz/dev/script" */
/** @import { GoldenApi } from "../src/testing/script_api.ts" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the golden flights are kept, from the workspace's folder. */
export const GOLDEN_FILE = "src/rules/levels/golden/golden.json";

const USAGE = `Usage: yarn golden:flights [options]

Writes how every level's certificate, and the shots drawn at its opening,
fly on every depth, hashed, to ${GOLDEN_FILE}.

  -h, --help      Show this message`;

/**
 * Each level's hash on each depth, by the level's id, then by the depth.
 *
 * @typedef {Record<string, Record<string, string>>} Hashes
 */

/**
 * The golden flights, as their file holds them: the hashes of each level's
 * certificate's rounds, and of its drawn shots' rounds, on each depth.
 *
 * @typedef {object} Golden
 * @property {Hashes} certificates
 * @property {Hashes} shots
 */

/**
 * Says where the script prints, what it loads and how it writes its file,
 * each the script's own unless a spec hands it another.
 *
 * @typedef {ScriptIo<GoldenApi> & { write?: (path: string, text: string) => Promise<void> }} GoldenIo
 */

/**
 * Returns what a command line asks for, which is nothing but the flights,
 * or, for `--help` or one the script can't read, what to print and the code
 * to exit with.
 *
 * @param {readonly string[]} args
 * @returns {Record<string, never> | Stop}
 */
export function readCommandLine(args) {
  const read = readArgs(args, { options: {}, usage: USAGE });
  return isStop(read) ? read : {};
}

/**
 * Returns what the script plays, `GOLDEN_API`, loaded through Vite.
 *
 * @returns {Promise<GoldenApi>}
 */
export async function loadGoldenApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/golden_api.ts"),
    ROOT,
  );
  return /** @type {GoldenApi} */ (module["GOLDEN_API"]);
}

/**
 * Returns the golden flights of every level an API has on each of its
 * depths, the levels by their ids, sorted.
 *
 * @param {GoldenApi} api
 * @returns {Golden}
 */
export function goldenOf(api) {
  const levels = api.levels.toSorted((a, b) =>
    a.data.id < b.data.id ? -1 : a.data.id > b.data.id ? 1 : 0,
  );
  /**
   * Returns each level's hash on each depth, by a level's number and a depth.
   *
   * @param {(level: number, depth: number) => string} hash
   * @returns {Hashes}
   */
  const hashes = (hash) =>
    Object.fromEntries(
      levels.map(({ number, data }) => [
        data.id,
        Object.fromEntries(
          api.depths.map((depth) => [String(depth), hash(number, depth)]),
        ),
      ]),
    );
  return {
    certificates: hashes(api.certificateHash),
    shots: hashes(api.shotsHash),
  };
}

/**
 * Returns the golden flights as their file holds them, as Prettier lays it
 * out.
 *
 * @param {Golden} golden
 * @returns {string}
 */
export function goldenText(golden) {
  return `${JSON.stringify(golden, null, 2)}\n`;
}

/**
 * Writes the golden flights, or prints the script's usage, and returns the
 * code to exit with: 0, or 2 for a command line it can't read, played
 * nothing.
 *
 * @param {readonly string[]} args
 * @param {GoldenIo} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadGoldenApi,
    write = (path, text) => writeFile(join(ROOT, path), text),
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  /** @type {Printer} */
  const printer = { print, printError };
  const request = readCommandLine(args);
  if (isStop(request)) return stopWith(request, printer);
  const api = await load();
  await write(GOLDEN_FILE, goldenText(goldenOf(api)));
  print(
    `Wrote ${GOLDEN_FILE}: ${String(api.levels.length)} levels on ${String(api.depths.length)} depths.`,
  );
  return 0;
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
