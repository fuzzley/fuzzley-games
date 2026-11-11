#!/usr/bin/env node
/**
 * Finds a line that clears every level on every depth, and writes the lines
 * as the levels' certificates, with each level's par.
 *
 *   yarn certify:levels [--set <id>] [--level <id or number>] [--depth <n>]…
 *
 * It runs the solver, `solveLevel()` in `src/testing/solver.ts`, for each
 * level on each depth, on a pool of worker threads as many as the machine
 * runs at once, each loading the solver and the rules through Vite
 * (`CERTIFY_API` in `src/testing/certify_api.ts`). It writes each set's lines
 * to `src/rules/levels/certificates/<set>.json`, and each level's par on each
 * depth, from every set's lines, to `src/rules/levels/par.json`, their keys
 * sorted, so a run writes the same bytes as the last unless a line changed.
 * As each level is done, it prints the rounds its lines take and how widely
 * the solver searched for them. The specs in `src/rules/levels/every_level/`
 * replay every line, so a change to the rules that breaks one fails them
 * until this is run again.
 *
 * With `--set`, `--level` or `--depth`, it certifies only those, keeping the
 * other lines as they are written.
 *
 * It exits with 1 where a level has no line on a depth, leaving it none, and
 * with 2, saying why, for a command line it can't read, before it solves
 * anything.
 */
import { readFile, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";
import {
  CONSOLE,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "@fz/dev/script";

/** @import { MessagePort } from "node:worker_threads" */
/** @import { Printer, ScriptIo, Stop } from "@fz/dev/script" */
/** @import { CertifyApi, ScriptLevel, ScriptSearch, ScriptShot, SolvedLine } from "../src/testing/script_api.ts" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the certificates are kept, a file a set, from the workspace's folder. */
export const CERTIFICATES_FOLDER = "src/rules/levels/certificates";

/** Where each level's par on each depth is kept, from the workspace's folder. */
export const PAR_FILE = "src/rules/levels/par.json";

/** What a thread of the pool is started with, which tells it from the script's own. */
const POOL_THREAD = "certify-levels";

/** Lists words as a sentence does, the last after "and". */
const AND_LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

/** Lists words as a message does, the last after "or". */
const OR_LIST = new Intl.ListFormat("en-GB", { type: "disjunction" });

const USAGE = `Usage: yarn certify:levels [options]

Finds a line that clears every level on every depth, and writes them as the
levels' certificates, with each level's par.

  --set <id>      Certify only the levels of a set
  --level <id>    Certify only a level, by its id or its number
  --depth <n>     Certify only on a field n rows deep, given once for
                  each depth
  -h, --help      Show this message`;

/**
 * What a command line asks to certify, each as it was given, or every one
 * where it isn't.
 *
 * @typedef {object} Request
 * @property {string | undefined} set A set's id.
 * @property {string | undefined} level A level's id or its number.
 * @property {ReadonlyArray<string> | undefined} depths The fields' depths.
 */

/**
 * A level to certify on a depth.
 *
 * @typedef {object} Job
 * @property {number} level The level's number.
 * @property {number} depth
 */

/**
 * A level certified on a depth: the line the solver found, or null for
 * none.
 *
 * @typedef {Job & { solved: SolvedLine | null }} Certified
 */

/**
 * Each level's line on each depth, by the level's id, then by the depth.
 *
 * @typedef {Record<string, Record<string, readonly ScriptShot[]>>} Certificates
 */

/**
 * Solves jobs, handing each to `done` as it is certified, and resolves once
 * every one is.
 *
 * @typedef {(jobs: ReadonlyArray<Job>, done: (certified: Certified) => void) => Promise<void>} Solver
 */

/**
 * Reads and writes the workspace's files, by their paths from its folder.
 *
 * @typedef {object} Files
 * @property {(path: string) => Promise<string | null>} read Returns a file's
 *   text, or null for one that isn't there.
 * @property {(path: string, text: string) => Promise<void>} write
 */

/**
 * Says where the script prints, what it loads, how it solves and what files
 * it reads and writes, each the script's own unless a spec hands it another.
 *
 * @typedef {ScriptIo<CertifyApi> & { solve?: Solver, files?: Files }} CertifyIo
 */

/**
 * The workspace's files, as the script reads and writes them.
 *
 * @type {Files}
 */
const WORKSPACE_FILES = {
  read: async (path) => {
    try {
      return await readFile(join(ROOT, path), "utf8");
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  },
  write: (path, text) => writeFile(join(ROOT, path), text),
};

/**
 * Returns whether reading a file failed because it isn't there.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isMissingFile(error) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/**
 * Returns what a command line asks to certify, or, for `--help` or one the
 * script can't read, what to print and the code to exit with.
 *
 * @param {readonly string[]} args
 * @returns {Request | Stop}
 */
export function readCommandLine(args) {
  const read = readArgs(args, {
    options: {
      set: { type: "string" },
      level: { type: "string" },
      depth: { type: "string", multiple: true },
    },
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const { set, level, depth } = read.values;
  return { set, level, depths: depth };
}

/**
 * Returns the levels to certify on the depths to certify them on, one job a
 * level and depth, in the order played and shallowest first, or, for a set,
 * a level or a depth the game doesn't have, what to print and the code to
 * exit with.
 *
 * @param {CertifyApi} api
 * @param {Request} request
 * @returns {Job[] | Stop}
 */
export function jobsOf(api, request) {
  const sets = setIdsOf(api.levels);
  if (request.set !== undefined && !sets.includes(request.set)) {
    return misread(
      `--set takes ${OR_LIST.format(sets.map(quoted))}, not ${quoted(request.set)}.`,
      USAGE,
    );
  }
  const { level } = request;
  const chosen = api.levels.find(
    (entry) => entry.data.id === level || String(entry.number) === level,
  );
  if (level !== undefined && chosen === undefined) {
    return misread(
      `--level takes a level's id or its number, from 1 to ${String(api.levels.length)}, not ${quoted(level)}.`,
      USAGE,
    );
  }
  if (
    chosen !== undefined &&
    request.set !== undefined &&
    chosen.set.id !== request.set
  ) {
    return misread(
      `Level ${quoted(chosen.data.id)} is in the set ${quoted(chosen.set.id)}, not ${quoted(request.set)}.`,
      USAGE,
    );
  }
  const depths = depthsOf(api, request.depths);
  if (isStop(depths)) return depths;
  return api.levels
    .filter(
      (entry) =>
        (chosen === undefined || entry === chosen) &&
        (request.set === undefined || entry.set.id === request.set),
    )
    .flatMap((entry) =>
      depths.map((depth) => ({ level: entry.number, depth })),
    );
}

/**
 * Returns the depths `--depth` asks for, shallowest first and each once,
 * every one where it isn't given, or, for a depth no field has, what to
 * print and the code to exit with.
 *
 * @param {CertifyApi} api
 * @param {ReadonlyArray<string> | undefined} asked
 * @returns {ReadonlyArray<number> | Stop}
 */
function depthsOf(api, asked) {
  if (asked === undefined) return api.depths;
  const rows = asked.map(Number);
  for (const [index, depth] of asked.entries()) {
    if (!api.depths.includes(rows[index] ?? Number.NaN)) {
      return misread(
        `--depth takes a whole number from ${String(api.depths[0])} to ${String(api.depths.at(-1))}, not ${quoted(depth)}.`,
        USAGE,
      );
    }
  }
  return api.depths.filter((depth) => rows.includes(depth));
}

/**
 * Returns the ids of the sets the levels are in, in the order played.
 *
 * @param {readonly ScriptLevel[]} levels
 * @returns {string[]}
 */
function setIdsOf(levels) {
  return [...new Set(levels.map((entry) => entry.set.id))];
}

/**
 * Returns a word in double quotes, as a message quotes what was given.
 *
 * @param {string} word
 * @returns {string}
 */
function quoted(word) {
  return `"${word}"`;
}

/**
 * Returns what the script plays, `CERTIFY_API`, loaded through Vite.
 *
 * @returns {Promise<CertifyApi>}
 */
export async function loadCertifyApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/certify_api.ts"),
    ROOT,
  );
  return /** @type {CertifyApi} */ (module["CERTIFY_API"]);
}

/**
 * The pool's threads: the script each runs, and how many there are at
 * most.
 *
 * @typedef {object} Pool
 * @property {URL} script The script's own file, unless a spec hands it
 *   another.
 * @property {number} threads
 */

/**
 * The script's pool: a thread for each the machine runs at once.
 *
 * @type {Pool}
 */
const POOL = {
  script: new URL(import.meta.url),
  threads: availableParallelism(),
};

/**
 * Solves jobs on a pool of worker threads, or fewer threads for fewer jobs,
 * each taking the next job as it finishes one; and hands each to `done` as
 * it is certified, so the order they come in may change from run to run.
 *
 * Once a thread fails, it stops every thread and rejects with what failed.
 *
 * @param {ReadonlyArray<Job>} jobs
 * @param {(certified: Certified) => void} done
 * @param {Pool} [pool]
 * @returns {Promise<void>}
 */
export async function solveOnThreads(jobs, done, pool = POOL) {
  const queue = [...jobs];
  const threads = Array.from(
    { length: Math.min(pool.threads, queue.length) },
    () => new Worker(pool.script, { workerData: POOL_THREAD }),
  );
  try {
    await Promise.all(
      threads.map((thread) => solveOnThread(thread, queue, done)),
    );
  } finally {
    await Promise.all(threads.map((thread) => thread.terminate()));
  }
}

/**
 * Has a thread of the pool solve jobs from the queue until none is left,
 * rejecting if it fails or stops before then.
 *
 * @param {Worker} thread
 * @param {Job[]} queue
 * @param {(certified: Certified) => void} done
 * @returns {Promise<void>}
 */
function solveOnThread(thread, queue, done) {
  return new Promise((resolve, reject) => {
    let idle = false;
    const next = () => {
      const job = queue.shift();
      if (job === undefined) {
        idle = true;
        resolve();
        return;
      }
      thread.postMessage(job);
    };
    thread.on("message", (/** @type {Certified} */ certified) => {
      done(certified);
      next();
    });
    thread.on("error", reject);
    thread.on("exit", (code) => {
      if (!idle) {
        reject(new Error(`A thread of the pool stopped with ${String(code)}.`));
      }
    });
    next();
  });
}

/**
 * Solves each job the script's thread posts, as a thread of its pool, and
 * posts back the line found.
 *
 * @param {MessagePort} port
 * @returns {Promise<void>}
 */
async function serveJobs(port) {
  const api = await loadCertifyApi();
  port.on("message", (/** @type {Job} */ job) => {
    /** @type {SolvedLine | null} */
    let solved;
    try {
      solved = api.solve(job.level, job.depth);
    } catch (error) {
      throw new Error(
        `Solving level ${String(job.level)} on a field ${String(job.depth)} deep failed.`,
        { cause: error },
      );
    }
    port.postMessage({ ...job, solved });
  });
}

/**
 * Certifies every job, printing each level's line once it and every level
 * before it are certified, and returns them.
 *
 * @param {CertifyApi} api
 * @param {readonly Job[]} jobs
 * @param {Solver} solve
 * @param {(line: string) => void} print
 * @returns {Promise<Certified[]>}
 */
async function certify(api, jobs, solve, print) {
  const levels = api.levels.filter((entry) =>
    jobs.some((job) => job.level === entry.number),
  );
  const nameWidth = Math.max(...levels.map((entry) => entry.data.name.length));
  /** @type {Map<number, Certified[]>} */
  const byLevel = new Map(levels.map((entry) => [entry.number, []]));
  const depthCount = jobs.length / levels.length;
  let printed = 0;
  await solve(jobs, (certified) => {
    byLevel.get(certified.level)?.push(certified);
    for (const entry of levels.slice(printed)) {
      const done = byLevel.get(entry.number) ?? [];
      if (done.length < depthCount) break;
      print(levelLine(entry, done, nameWidth));
      printed++;
    }
  });
  return [...byLevel.values()].flat();
}

/**
 * Returns the line the script prints of a level once it is certified: its
 * number and name, the rounds its lines take, fewest to most, and how
 * widely the solver searched for each, by the depths it searched so on.
 *
 * @param {ScriptLevel} entry
 * @param {readonly Certified[]} done
 * @param {number} nameWidth How wide the names are laid out.
 * @returns {string}
 */
function levelLine(entry, done, nameWidth) {
  const ordered = [...done].sort((a, b) => a.depth - b.depth);
  const rounds = ordered.flatMap(({ solved }) =>
    solved === null ? [] : [solved.line.length],
  );
  const least = Math.min(...rounds);
  const most = Math.max(...rounds);
  const roundWords =
    rounds.length === 0
      ? "-"
      : least === most
        ? `${String(least)} ${least === 1 ? "round" : "rounds"}`
        : `${String(least)} to ${String(most)} rounds`;
  /** @type {Map<string, { search: ScriptSearch | null, depths: number[] }>} */
  const searches = new Map();
  for (const { solved, depth } of ordered) {
    const search = solved?.search ?? null;
    const key = search === null ? "none" : searchWords(search);
    const group = searches.get(key) ?? { search, depths: [] };
    group.depths.push(depth);
    searches.set(key, group);
  }
  const groups = [...searches.values()].sort(bySearch);
  const searchText = groups
    .map(({ search, depths }) => {
      const words = search === null ? "no line" : searchWords(search);
      return groups.length === 1 && search !== null
        ? words
        : `${words} on ${depthList(depths)}`;
    })
    .join("; ");
  return `${String(entry.number).padStart(2)} ${entry.data.name.padEnd(nameWidth)}   ${roundWords.padEnd(15)}   ${searchText}`;
}

/**
 * Orders the searches a level's lines took, the narrowest first, and the
 * depths with no line last.
 *
 * @param {{ search: ScriptSearch | null }} a
 * @param {{ search: ScriptSearch | null }} b
 * @returns {number}
 */
function bySearch(a, b) {
  if (a.search === null || b.search === null) {
    return Number(a.search === null) - Number(b.search === null);
  }
  return b.search.aimStep - a.search.aimStep || a.search.beam - b.search.beam;
}

/**
 * Returns how widely the solver searched, in words: which aims, and how
 * many walls it kept each round.
 *
 * @param {ScriptSearch} search
 * @returns {string}
 */
function searchWords({ aimStep, beam }) {
  const aims = aimStep === 1 ? "every aim" : `every ${String(aimStep)}th aim`;
  return `${aims}, ${beam === 1 ? "greedy" : `a beam of ${String(beam)}`}`;
}

/**
 * Returns depths in words, three or more in a row as a span.
 *
 * @param {readonly number[]} depths In order, shallowest first.
 * @returns {string}
 */
function depthList(depths) {
  /** @type {number[][]} */
  const runs = [];
  for (const depth of depths) {
    const run = runs.at(-1);
    if (run !== undefined && run.at(-1) === depth - 1) run.push(depth);
    else runs.push([depth]);
  }
  return AND_LIST.format(
    runs.flatMap((run) =>
      run.length >= 3
        ? [`${String(run[0])} to ${String(run.at(-1))}`]
        : run.map(String),
    ),
  );
}

/**
 * Returns every set's certificates as their files hold them, by the set's
 * id, none for a file that isn't there, or throws, naming the file, for one
 * that isn't JSON, before anything is solved.
 *
 * @param {CertifyApi} api
 * @param {Files} files
 * @returns {Promise<Map<string, Certificates>>}
 */
async function readCertificates(api, files) {
  /** @type {Map<string, Certificates>} */
  const kept = new Map();
  for (const set of setIdsOf(api.levels)) {
    const path = certificatesPath(set);
    const text = await files.read(path);
    try {
      kept.set(set, text === null ? {} : JSON.parse(text));
    } catch (error) {
      throw new Error(`${path} isn't JSON.`, { cause: error });
    }
  }
  return kept;
}

/**
 * Writes the lines found to their sets' certificates, keeping the other
 * lines as they were and leaving a level none on a depth it has no line
 * on, then writes each level's par on each depth from every set's
 * certificates.
 *
 * @param {CertifyApi} api
 * @param {readonly Certified[]} certified
 * @param {ReadonlyMap<string, Certificates>} kept Every set's certificates
 *   as they were, by the set's id.
 * @param {Files} files
 * @returns {Promise<string[]>} The files written.
 */
async function writeCertificates(api, certified, kept, files) {
  const written = [];
  /** @type {Record<string, Record<string, number>>} */
  const pars = {};
  for (const set of setIdsOf(api.levels)) {
    const levels = api.levels.filter((entry) => entry.set.id === set);
    const was = kept.get(set) ?? {};
    const touched = certified.some((job) =>
      levels.some((entry) => entry.number === job.level),
    );
    /** @type {Certificates} */
    const certificates = touched ? {} : was;
    if (touched) {
      for (const entry of levels) {
        for (const depth of api.depths) {
          const job = certified.find(
            (each) => each.level === entry.number && each.depth === depth,
          );
          const line =
            job === undefined
              ? was[entry.data.id]?.[String(depth)]
              : job.solved?.line;
          if (line !== undefined) {
            (certificates[entry.data.id] ??= {})[String(depth)] = line;
          }
        }
      }
      const path = certificatesPath(set);
      await files.write(path, certificatesText(certificates));
      written.push(path);
    }
    for (const [id, lines] of Object.entries(certificates)) {
      for (const [depth, line] of Object.entries(lines)) {
        (pars[id] ??= {})[depth] = api.parFrom(line.length);
      }
    }
  }
  await files.write(PAR_FILE, `${JSON.stringify(sorted(pars), null, 2)}\n`);
  return [...written, PAR_FILE];
}

/**
 * Returns where a set's certificates are kept, from the workspace's folder.
 *
 * @param {string} set The set's id.
 * @returns {string}
 */
function certificatesPath(set) {
  return `${CERTIFICATES_FOLDER}/${set}.json`;
}

/**
 * Returns certificates as their file holds them: each level's lines by its
 * id, sorted, then each line by its depth, which JavaScript keeps in order
 * as a whole number, each shot on a line of its own but in a line of one
 * shot, as Prettier lays the file out.
 *
 * @param {Certificates} certificates
 * @returns {string}
 */
export function certificatesText(certificates) {
  const text = JSON.stringify(sorted(certificates), null, 2)
    .replaceAll(/\[\s+(\d+),\s+(\d+)\s+\]/g, "[$1, $2]")
    .replaceAll(/\[\s+(\[\d+, \d+\])\s+\]/g, "[$1]");
  return `${text}\n`;
}

/**
 * Returns a copy of a record with its keys sorted.
 *
 * @template T
 * @param {Readonly<Record<string, T>>} record
 * @returns {Record<string, T>}
 */
function sorted(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/**
 * Certifies what a command line asks for, or prints its usage, and returns
 * the code to exit with: 0, 1 if a level has no line on a depth, or 2 for a
 * command line it can't read, certifying nothing.
 *
 * @param {readonly string[]} args
 * @param {CertifyIo} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadCertifyApi,
    solve = solveOnThreads,
    files = WORKSPACE_FILES,
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
  const kept = await readCertificates(api, files);
  const certified = await certify(api, jobs, solve, print);
  const written = await writeCertificates(api, certified, kept, files);
  const found = certified.filter((job) => job.solved !== null).length;
  print("");
  print(`Wrote ${AND_LIST.format(written)}.`);
  if (found === certified.length) return 0;
  print(
    `The solver found ${String(found)} of ${String(certified.length)} lines: redraw the levels it found "no line" for.`,
  );
  return 1;
}

if (!isMainThread && workerData === POOL_THREAD && parentPort !== null) {
  await serveJobs(parentPort);
} else if (import.meta.main) {
  process.exitCode = await run(process.argv.slice(2));
}
