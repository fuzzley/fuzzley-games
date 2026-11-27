#!/usr/bin/env node
/**
 * Proves every deal of every level can be cleared in the level's moves, and
 * writes each set's certificates, the line that clears each deal.
 *
 *   yarn certify:deals [--set <id>]
 *
 * It loads `CERTIFY_API` (`src/testing/certify_api.ts`) through Vite and,
 * on one thread, finds the proof's line on each deal each level's file
 * keeps, dealt the level's own moves. It writes each set's lines to
 * `src/rules/levels/certificates/<set>.json` as the sketch's
 * `certificates.json` keeps them, by the level's id and then the deal's
 * seed, each move a pair of squares, from and to, but in the screen's
 * frame, which `play()` takes. It lays them out as Prettier lays them out,
 * so a run writes the same bytes as the last unless a line changed.
 *
 * With `--set`, it certifies only that set's levels, and writes only its
 * file. It waits its turn in the queue `yarn verify:changed` keeps, so its
 * proofs never run beside a check.
 *
 * It exits with 1 where a deal has no line, writing its set's file without
 * it, and with 2, saying why, for a command line it can't read, before it
 * proves anything.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { certificatesText, workspaceFiles } from "@fz/dev/certify";
import { waitForTurn, waitedWords, waitingWords } from "@fz/dev/queue";
import { CONSOLE, importThroughVite, isStop, stopWith } from "@fz/dev/script";
import { levelsOfSet, readSetOption } from "./set_option.mjs";

/** @import { CertifyFiles } from "@fz/dev/certify" */
/** @import { Printer } from "@fz/dev/script" */

/**
 * A level, so far as the script reads it: its place in the game, from 1,
 * its set, and its id, name and deals as its file keeps them.
 *
 * @typedef {object} CertifyLevel
 * @property {number} number
 * @property {{ readonly id: string }} set
 * @property {{ readonly id: string, readonly name: string, readonly deals: ReadonlyArray<number> }} data
 */

/**
 * A move of a line: the square picked up and the neighbor it is swapped
 * with, each in the screen's frame.
 *
 * @typedef {object} Move
 * @property {number} from
 * @property {number} to
 */

/**
 * What the script certifies the deals through: the levels, and the proof's
 * line on a deal of one, by the level's number and the deal's seed, dealt
 * the level's own moves, or null for none.
 *
 * `tools/certify-deals.spec.ts` holds the game's `CERTIFY_API` to it.
 *
 * @typedef {object} CertifyApi
 * @property {readonly CertifyLevel[]} levels Every level, in the order played.
 * @property {(level: number, seed: number) => ReadonlyArray<Move> | null} lineOf
 */

/**
 * Says what the script loads, what files it writes, how it waits its turn
 * and where it prints, each its own unless a spec hands it another.
 *
 * @typedef {object} CertifyIo
 * @property {() => Promise<CertifyApi>} [load]
 * @property {Pick<CertifyFiles, "write">} [files]
 * @property {(root: string, onWait: (ahead: number) => void) => Promise<() => void>} [queue]
 * @property {() => number} [now] Reads a clock in milliseconds.
 * @property {(line: string) => void} [print]
 * @property {(line: string) => void} [printError]
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The folder each set's certificates are kept in, from the game's folder, a file a set, `<set id>.json`. */
const CERTIFICATES_FOLDER = "src/rules/levels/certificates";

/** Lists words as a sentence does, the last after "and". */
const AND_LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

const USAGE = `Usage: yarn certify:deals [options]

Proves every deal of every level can be cleared in the level's moves, and
writes each set's certificates, the line that clears each deal.

  --set <id>      Certify only the levels of a set
  -h, --help      Show this message`;

/**
 * Returns what the script certifies through, `CERTIFY_API`, loaded through
 * Vite, or throws where the module exports none.
 *
 * @returns {Promise<CertifyApi>}
 */
export async function loadCertifyApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/certify_api.ts"),
    ROOT,
  );
  const api = module["CERTIFY_API"];
  if (api === undefined) {
    throw new Error("src/testing/certify_api.ts exports no CERTIFY_API.");
  }
  return /** @type {CertifyApi} */ (api);
}

/**
 * A level certified: each of its deals' lines, by the deal's seed, as its
 * set's file keeps them, and the deals no line was found for.
 *
 * @typedef {object} CertifiedLevel
 * @property {Readonly<Record<string, ReadonlyArray<ReadonlyArray<number>>>>} lines
 * @property {readonly number[]} unproven
 */

/**
 * Returns a level certified, each of its deals proven in turn, or throws,
 * naming the level and the deal, where a proof throws.
 *
 * @param {CertifyApi} api
 * @param {CertifyLevel} level
 * @returns {CertifiedLevel}
 */
function certified(api, { number, data }) {
  /** @type {Record<string, ReadonlyArray<ReadonlyArray<number>>>} */
  const lines = {};
  /** @type {number[]} */
  const unproven = [];
  for (const seed of data.deals) {
    /** @type {ReadonlyArray<Move> | null} */
    let line;
    try {
      line = api.lineOf(number, seed);
    } catch (error) {
      throw new Error(
        `Proving deal ${String(seed)} of level ${String(number)} failed.`,
        { cause: error },
      );
    }
    if (line === null) {
      unproven.push(seed);
    } else {
      lines[String(seed)] = line.map(({ from, to }) => [from, to]);
    }
  }
  return { lines, unproven };
}

/**
 * Returns the line the script prints of a level once it is certified: its
 * number and name, laid out as wide as the widest, the moves its lines
 * take, fewest to most, and the deals it has no line on.
 *
 * @param {CertifyLevel} level
 * @param {CertifiedLevel} done
 * @param {number} nameWidth
 * @returns {string}
 */
function levelLine({ number, data }, { lines, unproven }, nameWidth) {
  const moves = Object.values(lines).map((line) => line.length);
  const least = Math.min(...moves);
  const most = Math.max(...moves);
  const said = [
    moves.length === 0
      ? null
      : least === most
        ? `${String(least)} ${least === 1 ? "move" : "moves"}`
        : `${String(least)} to ${String(most)} moves`,
    unproven.length === 0
      ? null
      : `no line on ${unproven.length === 1 ? "deal" : "deals"} ${AND_LIST.format(unproven.map(String))}`,
  ].filter((words) => words !== null);
  return `${String(number).padStart(2)} ${data.name.padEnd(nameWidth)}   ${said.join("; ")}`;
}

/**
 * Proves the deals a command line asks for, or prints its usage, writes
 * each set's certificates, and returns the code to exit with: 0, 1 if a
 * deal has no line, or 2 for a command line it can't read, proving
 * nothing.
 *
 * @param {readonly string[]} args
 * @param {CertifyIo} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadCertifyApi,
    files = workspaceFiles(ROOT),
    queue = waitForTurn,
    now = Date.now,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  /** @type {Printer} */
  const printer = { print, printError };
  const request = readSetOption(args, USAGE);
  if (isStop(request)) return stopWith(request, printer);
  const api = await load();
  const levels = levelsOfSet(api.levels, request, USAGE);
  if (isStop(levels)) return stopWith(levels, printer);
  const nameWidth = Math.max(...levels.map(({ data }) => data.name.length));
  const joined = now();
  /** @type {number[]} */
  const heard = [];
  const leave = await queue(ROOT, (ahead) => {
    heard.push(ahead);
    print(waitingWords(ahead));
  });
  /** @type {Map<string, Record<string, CertifiedLevel["lines"]>>} */
  const bySet = new Map();
  /** @type {number[]} */
  const unproven = [];
  const deals = levels.reduce(
    (count, { data }) => count + data.deals.length,
    0,
  );
  /** @type {string[]} */
  const written = [];
  try {
    if (heard.length > 0) print(waitedWords(now() - joined));
    for (const level of levels) {
      const done = certified(api, level);
      print(levelLine(level, done, nameWidth));
      const set = bySet.get(level.set.id) ?? {};
      set[level.data.id] = done.lines;
      bySet.set(level.set.id, set);
      unproven.push(...done.unproven);
    }
    for (const [setId, certificates] of bySet) {
      const path = `${CERTIFICATES_FOLDER}/${setId}.json`;
      await files.write(path, certificatesText(certificates));
      written.push(path);
    }
  } finally {
    leave();
  }
  print("");
  print(`Wrote ${AND_LIST.format(written)}.`);
  if (unproven.length === 0) return 0;
  print(
    `The proof found ${String(deals - unproven.length)} of ${String(deals)} lines. The design proved every deal, so find out why one has none before its level is redrawn.`,
  );
  return 1;
}

if (import.meta.main) {
  process.exitCode = await run(process.argv.slice(2));
}
