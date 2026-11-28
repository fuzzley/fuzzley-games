#!/usr/bin/env node
/**
 * Finds a line that clears every level on every depth, and writes the lines
 * as the levels' certificates, with each level's par and rally mark on each
 * depth and the line that reaches the mark.
 *
 *   yarn certify:levels [--set <id>] [--level <id or number>] [--depth <n>]…
 *
 * It certifies through `@fz/dev/certify`'s steps: its command line, its
 * jobs, and its pool, each of whose threads loads `CERTIFY_API`
 * (`src/testing/certify_api.ts`) through Vite and certifies a level on a
 * depth at a time, the library's solver finding the line and the careless
 * player's floor games setting the rally mark, the middle of their best
 * rallies, with the shortest start of them that reaches it. It writes three
 * files a set in `src/rules/levels/`: the lines to `certificates/<set>.json`,
 * each level's par and rally mark on each depth to `marks/<set>.json`,
 * which the game reads its stars by, and the lines that reach the marks to
 * `lines/<set>.json`, their keys sorted and laid out as Prettier lays them
 * out, so a run writes the same bytes as the last unless a line changed. As
 * each level is done, it prints the rounds its lines take and how widely
 * the solver searched. The specs in `src/rules/levels/every_level/` replay
 * every line, and those in `every_check/` hold the rally marks to the
 * careless player's games.
 *
 * With `--set`, `--level` or `--depth`, it certifies only those, keeping
 * every other line and mark as written, and writes only the files of the
 * sets it certifies a level of, each level's par from its set's lines. It
 * takes every core, so it waits its turn in the queue `yarn verify:changed`
 * keeps.
 *
 * It exits with 1 where a level has no line on a depth, leaving it none
 * there, nor a mark, and with 2, saying why, for a command line it can't
 * read, before it solves anything.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  certificatesText,
  certify,
  jobsOf,
  loadCertifyApi,
  poolOf,
  readCommandLine,
  solveOnThreads,
  sorted,
  workspaceFiles,
} from "@fz/dev/certify";
import { isListOf, isRecord, isWhole } from "@fz/core/json";
import { waitForTurn, waitedWords, waitingWords } from "@fz/dev/queue";
import { CONSOLE, isStop, setIdsOf, stopWith } from "@fz/dev/script";

/** @import { CertifyApi, CertifyFiles, CertifyIo, CertifyLevel, Certificates, Certified, SolvedLine } from "@fz/dev/certify" */
/** @import { Printer } from "@fz/dev/script" */

/**
 * Where the game keeps what the script reads and writes, each a path from
 * its folder, and what the pool's threads load of it.
 *
 * @typedef {object} CertifyGame
 * @property {string} root The game's workspace folder.
 * @property {string} api The module that exports the game's API as
 *   `CERTIFY_API`, which the script and each thread load through Vite.
 * @property {string} certificates The folder each set's certificates are
 *   kept in, `<set id>.json`.
 * @property {string} marks The folder each set's marks are kept in.
 * @property {string} lines The folder each set's rally lines are kept in.
 */

/**
 * A level's rally mark on a depth, and the line from its opening that
 * reaches it, each shot an aim's index.
 *
 * @typedef {object} RallyMark
 * @property {number} mark The rally a flight earns the level's third star at.
 * @property {readonly number[]} line
 */

/**
 * A table of a set's marks: a number for each level, by the level's id,
 * then by the depth.
 *
 * @typedef {Readonly<Record<string, Readonly<Record<string, number>>>>} MarkTable
 */

/**
 * A set's marks, as `marks/<set>.json` keeps them: each level's par and
 * rally mark.
 *
 * @typedef {object} Marks
 * @property {MarkTable} par
 * @property {MarkTable} rally
 */

/**
 * A set's rally lines, as `lines/<set>.json` keeps them: each level's line
 * to its rally mark, by the level's id, then by the depth.
 *
 * @typedef {Readonly<Record<string, Readonly<Record<string, readonly number[]>>>>} RallyLines
 */

/**
 * What a set keeps of its levels' lines: its certificates, its marks, and
 * its rally lines.
 *
 * @typedef {object} Kept
 * @property {Certificates} certificates
 * @property {Marks} marks
 * @property {RallyLines} lines
 */

/**
 * Where the game keeps its certificates, its marks and its rally lines, and
 * what the pool's threads load of it.
 *
 * @type {CertifyGame}
 */
export const CERTIFY_GAME = {
  root: join(dirname(fileURLToPath(import.meta.url)), ".."),
  api: "src/testing/certify_api.ts",
  certificates: "src/rules/levels/certificates",
  marks: "src/rules/levels/marks",
  lines: "src/rules/levels/lines",
};

/**
 * What a set keeps before it is first certified.
 *
 * @type {Kept}
 */
const NOTHING_KEPT = {
  certificates: {},
  marks: { par: {}, rally: {} },
  lines: {},
};

/** Lists words as a sentence does, the last after "and". */
const AND_LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

/**
 * Returns the rally mark a thread certified a level's line with, or throws
 * for a line that came without one, from an API that marks nothing.
 *
 * @param {SolvedLine} solved
 * @returns {RallyMark}
 */
export function rallyOf(solved) {
  const rally = "rally" in solved ? solved.rally : undefined;
  if (isRallyMark(rally)) return rally;
  throw new Error(
    "A line came without its rally mark: the game's CERTIFY_API marks each line it solves.",
  );
}

/**
 * Returns whether a value is a rally mark and the line of aims that reaches
 * it.
 *
 * @param {unknown} value
 * @returns {value is RallyMark}
 */
function isRallyMark(value) {
  return (
    isRecord(value) &&
    isWhole(value["mark"]) &&
    isListOf(value["line"], isWhole)
  );
}

/**
 * Returns whether a value is a table of a set's file: a row for each
 * level, by its id, of a value for each depth, each of which `isKept`
 * holds.
 *
 * @param {unknown} value
 * @param {(kept: unknown) => boolean} isKept
 * @returns {boolean}
 */
function isTableOf(value, isKept) {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (row) => isRecord(row) && Object.values(row).every(isKept),
    )
  );
}

/**
 * Returns whether a value is a set's certificates, a line for each level
 * on each depth, each shot as the game keeps one.
 *
 * @param {unknown} value
 * @returns {value is Certificates}
 */
function isCertificates(value) {
  return isTableOf(value, Array.isArray);
}

/**
 * Returns whether a value is a set's marks, a table of each level's par and
 * one of its rally marks, each a whole number.
 *
 * @param {unknown} value
 * @returns {value is Marks}
 */
function isMarks(value) {
  return (
    isRecord(value) &&
    isTableOf(value["par"], isWhole) &&
    isTableOf(value["rally"], isWhole)
  );
}

/**
 * Returns whether a value is a set's rally lines, a line of aims' indices
 * for each level on each depth.
 *
 * @param {unknown} value
 * @returns {value is RallyLines}
 */
function isRallyLines(value) {
  return isTableOf(value, (line) => isListOf(line, isWhole));
}

/**
 * Returns where a set keeps one of its files, from the game's folder.
 *
 * @param {string} folder
 * @param {string} set
 * @returns {string}
 */
function pathOf(folder, set) {
  return `${folder}/${set}.json`;
}

/**
 * Returns what a set's file keeps, or null for one that isn't there, or
 * throws, naming the file, for one that isn't JSON or doesn't keep what
 * the script reads of it.
 *
 * @template T
 * @param {CertifyFiles} files
 * @param {string} path
 * @param {(value: unknown) => value is T} isKept
 * @param {string} kept What the file keeps, as an error names it.
 * @returns {Promise<T | null>}
 */
async function readKeptFile(files, path, isKept, kept) {
  const text = await files.read(path);
  if (text === null) return null;
  /** @type {unknown} */
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} isn't JSON.`, { cause: error });
  }
  if (isKept(value)) return value;
  throw new Error(`${path} isn't a set's ${kept}.`);
}

/**
 * Returns what every set keeps, by its id, nothing for a file that isn't
 * there, or throws, naming the file, for one that isn't JSON or doesn't
 * keep what the script reads of it, before anything is solved.
 *
 * @param {CertifyApi} api
 * @param {CertifyGame} game
 * @param {CertifyFiles} files
 * @returns {Promise<Map<string, Kept>>}
 */
async function readKept(api, game, files) {
  /** @type {Map<string, Kept>} */
  const kept = new Map();
  for (const set of setIdsOf(api.levels)) {
    const [certificates, marks, lines] = await Promise.all([
      readKeptFile(
        files,
        pathOf(game.certificates, set),
        isCertificates,
        "certificates",
      ),
      readKeptFile(files, pathOf(game.marks, set), isMarks, "marks"),
      readKeptFile(files, pathOf(game.lines, set), isRallyLines, "rally lines"),
    ]);
    kept.set(set, {
      certificates: certificates ?? NOTHING_KEPT.certificates,
      marks: marks ?? NOTHING_KEPT.marks,
      lines: lines ?? NOTHING_KEPT.lines,
    });
  }
  return kept;
}

/**
 * Returns what a set keeps once its levels are certified: for each of its
 * levels on each depth, the line certified, or the one kept where it wasn't
 * certified there, with its rally mark and the line that reaches it, and
 * none where the solver found no line; and each level's par from its line.
 *
 * @param {CertifyApi} api
 * @param {readonly CertifyLevel[]} levels The set's levels.
 * @param {readonly Certified[]} certified
 * @param {Kept} was What the set kept before.
 * @returns {Kept}
 */
function keptOf(api, levels, certified, was) {
  /** @type {Record<string, Record<string, readonly unknown[]>>} */
  const certificates = {};
  /** @type {Record<string, Record<string, readonly number[]>>} */
  const lines = {};
  /** @type {Record<string, Record<string, number>>} */
  const par = {};
  /** @type {Record<string, Record<string, number>>} */
  const rally = {};
  for (const entry of levels) {
    const { id } = entry.data;
    for (const depth of api.depths) {
      const key = String(depth);
      const job = certified.find(
        (each) => each.level === entry.number && each.depth === depth,
      );
      const line =
        job === undefined ? was.certificates[id]?.[key] : job.solved?.line;
      const mark =
        job === undefined
          ? keptMark(was, id, key)
          : job.solved && rallyOf(job.solved);
      if (line === undefined) continue;
      (certificates[id] ??= {})[key] = line;
      (par[id] ??= {})[key] = api.parFrom(line.length);
      if (mark === null) continue;
      (rally[id] ??= {})[key] = mark.mark;
      (lines[id] ??= {})[key] = mark.line;
    }
  }
  return { certificates, marks: { par, rally }, lines };
}

/**
 * Returns the rally mark a set kept of a level on a depth, with its line,
 * or null where it kept none.
 *
 * @param {Kept} kept
 * @param {string} id The level's id.
 * @param {string} depth
 * @returns {RallyMark | null}
 */
function keptMark(kept, id, depth) {
  const mark = kept.marks.rally[id]?.[depth];
  const line = kept.lines[id]?.[depth];
  return mark === undefined || line === undefined ? null : { mark, line };
}

/**
 * Returns a set's marks as their file holds them: an object a key a line,
 * as Prettier lays out JSON whose objects are written broken.
 *
 * @param {Marks} marks
 * @returns {string}
 */
export function marksText(marks) {
  return `${JSON.stringify({ par: sorted(marks.par), rally: sorted(marks.rally) }, null, 2)}\n`;
}

/**
 * Writes the files of each set a level of was certified, keeping the other
 * lines and marks as they were, and returns the files written. It works
 * out every set's files before it writes any, so a line it can't keep
 * leaves every file as it was.
 *
 * @param {CertifyApi} api
 * @param {CertifyGame} game
 * @param {readonly Certified[]} certified
 * @param {ReadonlyMap<string, Kept>} kept
 * @param {CertifyFiles} files
 * @returns {Promise<string[]>}
 */
async function writeKept(api, game, certified, kept, files) {
  /** @type {(readonly [path: string, text: string])[]} */
  const texts = [];
  for (const set of setIdsOf(api.levels)) {
    const levels = api.levels.filter((entry) => entry.set.id === set);
    if (
      !certified.some((job) =>
        levels.some((entry) => entry.number === job.level),
      )
    ) {
      continue;
    }
    const now = keptOf(api, levels, certified, kept.get(set) ?? NOTHING_KEPT);
    texts.push(
      [pathOf(game.certificates, set), certificatesText(now.certificates)],
      [pathOf(game.marks, set), marksText(now.marks)],
      [pathOf(game.lines, set), certificatesText(now.lines)],
    );
  }
  for (const [path, text] of texts) {
    await files.write(path, text);
  }
  return texts.map(([path]) => path);
}

/**
 * Reads and writes the game's files, by their paths from its folder, making
 * the folder a file is written to where it isn't there, as a set's first
 * certificates' is.
 *
 * @param {string} root
 * @returns {CertifyFiles}
 */
function gameFiles(root) {
  const files = workspaceFiles(root);
  return {
    read: files.read,
    write: async (path, text) => {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await files.write(path, text);
    },
  };
}

/**
 * Certifies the game's levels as a command line asks, or prints its usage,
 * and returns the code to exit with: 0, 1 if a level has no line on a
 * depth, or 2 for a command line it can't read, certifying nothing.
 *
 * It reads the sets' files before it waits its turn in the queue, so one
 * it can't read fails it at once, and leaves the queue once it has written
 * them.
 *
 * @param {readonly string[]} args
 * @param {CertifyGame} [game]
 * @param {CertifyIo} [io]
 * @returns {Promise<number>}
 */
export async function certifyLevels(
  args,
  game = CERTIFY_GAME,
  {
    load = () => loadCertifyApi(game),
    solve = (jobs, done) => solveOnThreads(jobs, done, poolOf(game)),
    files = gameFiles(game.root),
    queue = waitForTurn,
    now = Date.now,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  /** @type {Printer} */
  const printer = { print, printError };
  const request = readCommandLine(args);
  if (isStop(request)) return stopWith(request, printer);
  const api = await load();
  const jobs = jobsOf(api, request);
  if (isStop(jobs)) return stopWith(jobs, printer);
  const kept = await readKept(api, game, files);
  const joined = now();
  /** @type {number[]} */
  const heard = [];
  const leave = await queue(game.root, (ahead) => {
    heard.push(ahead);
    print(waitingWords(ahead));
  });
  /** @type {Certified[]} */
  let certified;
  /** @type {string[]} */
  let written;
  try {
    if (heard.length > 0) print(waitedWords(now() - joined));
    certified = await certify(api, jobs, solve, print);
    written = await writeKept(api, game, certified, kept, files);
  } finally {
    leave();
  }
  const found = certified.filter((job) => job.solved !== null).length;
  print("");
  print(`Wrote ${AND_LIST.format(written)}.`);
  if (found === certified.length) return 0;
  print(
    `The solver found ${String(found)} of ${String(certified.length)} lines: redraw the levels it found "no line" for.`,
  );
  return 1;
}

if (import.meta.main) {
  process.exitCode = await certifyLevels(process.argv.slice(2));
}
