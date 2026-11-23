// The pool of worker threads a wall game's `yarn certify:levels` certifies
// its levels on: each thread loads the game's `CERTIFY_API` through Vite and
// solves a level on a depth at a time, and the pool writes each set's lines
// to its certificates and each level's par, sorted and laid out as Prettier
// lays them out, so a run writes the same bytes as the last unless a line
// changed. A run waits its turn in the queue `yarn verify:changed` keeps,
// since it takes the whole machine. This module is the threads' own script.
// Its steps are exported for a game that keeps more beside its lines, such as
// a rally mark, to certify through them and write its own files.

import { readFile, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import {
  type MessagePort,
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";
import {
  queueFolder,
  waitInQueue,
  waitedWords,
  waitingWords,
} from "./queue.ts";
import {
  CONSOLE,
  type Printer,
  type ScriptIo,
  type Stop,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "./script.ts";

/** Describes a level of a game, so far as the pool names it. */
export interface CertifyLevel {
  /** Its place in the game, from 1. */
  readonly number: number;
  readonly set: { readonly id: string };
  readonly data: { readonly id: string; readonly name: string };
}

/** Says how widely the solver searched for a line: every aim, or every so many, and how many walls it kept each round. */
export interface CertifySearch {
  readonly aimStep: number;
  readonly beam: number;
}

/** Describes a line the solver found to clear a level: its shots, a round each, each as the game's certificates keep one, and how widely it searched for them. */
export interface SolvedLine {
  readonly line: readonly unknown[];
  readonly search: CertifySearch;
}

/** Holds what the pool certifies a game's levels through: the levels, the depths, the solver and the par a line earns. */
export interface CertifyApi {
  /** Every level, in the order played. */
  readonly levels: readonly CertifyLevel[];
  /** Every depth a field has, shallowest first. */
  readonly depths: readonly number[];
  /** Returns a line that clears a level, by its number, on a field of a depth, or null where the solver finds none. */
  readonly solve: (level: number, depth: number) => SolvedLine | null;
  /** Returns a level's par on a depth from the rounds of its certificate there. */
  readonly parFrom: (rounds: number) => number;
}

/**
 * Says where a game keeps what the pool reads and writes, and what its
 * threads load, each a path from the game's workspace folder.
 */
export interface CertifyGame {
  /** The game's workspace folder. */
  readonly root: string;
  /** The module that exports the game's {@link CertifyApi} as `CERTIFY_API`, which the script and each thread load through Vite. */
  readonly api: string;
  /** The folder the certificates are kept in, a file a set, `<set id>.json`. */
  readonly certificates: string;
  /** The file each level's par on each depth is kept in. */
  readonly par: string;
}

/** Says what a command line asks to certify, each as it was given, or every one where it isn't. */
export interface CertifyRequest {
  /** A set's id. */
  readonly set: string | undefined;
  /** A level's id or its number. */
  readonly level: string | undefined;
  /** The fields' depths. */
  readonly depths: readonly string[] | undefined;
}

/** Names a level to certify, by its number, on a depth. */
export interface CertifyJob {
  readonly level: number;
  readonly depth: number;
}

/** Describes a level certified on a depth: the line the solver found, or null for none. */
export interface Certified extends CertifyJob {
  readonly solved: SolvedLine | null;
}

/** Solves jobs, handing each to `done` as it is certified, and resolves once every one is. */
export type Solver = (
  jobs: readonly CertifyJob[],
  done: (certified: Certified) => void,
) => Promise<void>;

/** Reads and writes a game's files, by their paths from its workspace folder. */
export interface CertifyFiles {
  /** Returns a file's text, or null for one that isn't there. */
  readonly read: (path: string) => Promise<string | null>;
  readonly write: (path: string, text: string) => Promise<void>;
}

/** Holds each level's line on each depth, as a set's file keeps them: by the level's id, then by the depth. */
export type Certificates = Readonly<
  Record<string, Readonly<Record<string, readonly unknown[]>>>
>;

/**
 * Says where the pool prints, what it loads, how it solves, what files it
 * reads and writes, how it waits its turn and the clock it says how long by,
 * each its own unless a spec hands it another.
 */
export interface CertifyIo extends ScriptIo<CertifyApi> {
  readonly solve?: Solver;
  readonly files?: CertifyFiles;
  /**
   * Waits for the run's turn in the queue of the runs that take the whole
   * machine, from the game's folder, telling `onWait` how many runs are
   * ahead, and returns the function that leaves it.
   */
  readonly queue?: (
    root: string,
    onWait: (ahead: number) => void,
  ) => Promise<() => void>;
  /** Reads a clock in milliseconds. */
  readonly now?: () => number;
}

/** Says where a pool's threads run from and how many there are at most. */
export interface Pool {
  /** The script each thread runs. */
  readonly script: URL;
  readonly threads: number;
  /** What each thread is started with. */
  readonly workerData: unknown;
}

/** What a thread of the pool is started with: the mark that tells it from any other thread, and the game whose API it loads. */
interface PoolThread {
  readonly pool: typeof POOL_MARK;
  readonly game: Pick<CertifyGame, "root" | "api">;
}

/** The mark of a thread of the pool. */
const POOL_MARK = "fz-certify";

/** Lists words as a sentence does, the last after "and". */
const AND_LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

/** Lists words as a message does, the last after "or". */
const OR_LIST = new Intl.ListFormat("en-GB", { type: "disjunction" });

/** How wide Prettier lays a file out. */
const PRINT_WIDTH = 80;

const USAGE = `Usage: yarn certify:levels [options]

Finds a line that clears every level on every depth, and writes them as the
levels' certificates, with each level's par.

  --set <id>      Certify only the levels of a set
  --level <id>    Certify only a level, by its id or its number
  --depth <n>     Certify only on a field n rows deep, given once for
                  each depth
  -h, --help      Show this message`;

/**
 * Returns what a command line asks to certify, or, for `--help` or one the
 * script can't read, what to print and the code to exit with.
 */
export function readCommandLine(
  args: readonly string[],
): CertifyRequest | Stop {
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
 */
export function jobsOf(
  api: CertifyApi,
  request: CertifyRequest,
): CertifyJob[] | Stop {
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
  const depths =
    request.depths === undefined
      ? api.depths
      : readDepths(request.depths, api.depths, USAGE);
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
 * Returns the depths `--depth` names, of a game's depths, shallowest first
 * and each once, or, for one no field has, what to print and the code to
 * exit with.
 */
export function readDepths(
  asked: readonly string[],
  depths: readonly number[],
  usage: string,
): readonly number[] | Stop {
  const rows = asked.map(Number);
  for (const [index, depth] of asked.entries()) {
    if (!depths.includes(rows[index] ?? Number.NaN)) {
      return misread(
        `--depth takes a whole number from ${String(depths[0])} to ${String(depths.at(-1))}, not ${quoted(depth)}.`,
        usage,
      );
    }
  }
  return depths.filter((depth) => rows.includes(depth));
}

/** Returns the ids of the sets the levels are in, in the order played. */
export function setIdsOf(levels: readonly CertifyLevel[]): string[] {
  return [...new Set(levels.map((entry) => entry.set.id))];
}

/** Returns a word in double quotes, as a message quotes what was given. */
function quoted(word: string): string {
  return `"${word}"`;
}

/** Returns a game's `CERTIFY_API`, loaded through Vite, or throws, naming its module, where that exports none. */
export async function loadCertifyApi(
  game: Pick<CertifyGame, "root" | "api">,
): Promise<CertifyApi> {
  const module = await importThroughVite<{
    readonly CERTIFY_API?: CertifyApi;
  }>(join(game.root, game.api), game.root);
  if (module.CERTIFY_API === undefined) {
    throw new Error(`${game.api} exports no CERTIFY_API.`);
  }
  return module.CERTIFY_API;
}

/** Returns the pool a game's levels are certified on: a thread for each the machine runs at once, each running this module. */
export function poolOf(game: Pick<CertifyGame, "root" | "api">): Pool {
  const thread: PoolThread = {
    pool: POOL_MARK,
    game: { root: game.root, api: game.api },
  };
  return {
    script: new URL(import.meta.url),
    threads: availableParallelism(),
    workerData: thread,
  };
}

/**
 * Solves jobs on a pool of worker threads, or fewer threads for fewer jobs,
 * each taking the next job as it finishes one; and hands each to `done` as
 * it is certified, so the order they come in may change from run to run.
 *
 * Once a thread fails, it stops every thread and rejects with what failed.
 *
 * A script whose own pool's threads answer jobs of more than a level and a
 * depth hands those in, and `done` is handed whatever its threads post back.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- a thread's message comes untyped, and what it posts is its script's to say.
export async function solveOnThreads<Done = Certified>(
  jobs: readonly CertifyJob[],
  done: (certified: Done) => void,
  pool: Pool,
): Promise<void> {
  const queue = [...jobs];
  const threads = Array.from(
    { length: Math.min(pool.threads, queue.length) },
    () => new Worker(pool.script, { workerData: pool.workerData }),
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
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- as solveOnThreads()'s.
function solveOnThread<Done>(
  thread: Worker,
  queue: CertifyJob[],
  done: (certified: Done) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let idle = false;
    const next = (): void => {
      const job = queue.shift();
      if (job === undefined) {
        idle = true;
        resolve();
        return;
      }
      thread.postMessage(job);
    };
    thread.on("message", (certified: Done) => {
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
 * Solves each job posted to a port, as a thread of the pool does, and posts
 * back the line found, or throws, naming the level and the depth, where the
 * solver throws.
 */
export function serveJobs(port: MessagePort, api: CertifyApi): void {
  port.on("message", (job: CertifyJob) => {
    let solved: SolvedLine | null;
    try {
      solved = api.solve(job.level, job.depth);
    } catch (error) {
      throw new Error(
        `Solving level ${String(job.level)} on a field ${String(job.depth)} deep failed.`,
        { cause: error },
      );
    }
    const certified: Certified = { ...job, solved };
    port.postMessage(certified);
  });
}

/**
 * Certifies every job, printing each level's line once it and every level
 * before it are certified, and returns them.
 */
export async function certify(
  api: CertifyApi,
  jobs: readonly CertifyJob[],
  solve: Solver,
  print: (line: string) => void,
): Promise<Certified[]> {
  const levels = api.levels.filter((entry) =>
    jobs.some((job) => job.level === entry.number),
  );
  const nameWidth = Math.max(...levels.map((entry) => entry.data.name.length));
  const byLevel = new Map<number, Certified[]>(
    levels.map((entry) => [entry.number, []]),
  );
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
 * number and name, laid out as wide as the widest, the rounds its lines
 * take, fewest to most, and how widely the solver searched for each, by the
 * depths it searched so on.
 */
function levelLine(
  entry: CertifyLevel,
  done: readonly Certified[],
  nameWidth: number,
): string {
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
  const searches = new Map<
    string,
    { search: CertifySearch | null; depths: number[] }
  >();
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

/** Orders the searches a level's lines took, the narrowest first, and the depths with no line last. */
function bySearch(
  a: { readonly search: CertifySearch | null },
  b: { readonly search: CertifySearch | null },
): number {
  if (a.search === null || b.search === null) {
    return Number(a.search === null) - Number(b.search === null);
  }
  return b.search.aimStep - a.search.aimStep || a.search.beam - b.search.beam;
}

/** Returns how widely the solver searched, in words: which aims, and how many walls it kept each round. */
function searchWords({ aimStep, beam }: CertifySearch): string {
  const aims = aimStep === 1 ? "every aim" : `every ${String(aimStep)}th aim`;
  return `${aims}, ${beam === 1 ? "greedy" : `a beam of ${String(beam)}`}`;
}

/** Returns depths in words, shallowest first, three or more in a row as a span. */
function depthList(depths: readonly number[]): string {
  const runs: number[][] = [];
  for (const depth of depths) {
    const run = runs.at(-1);
    if (run?.at(-1) === depth - 1) run.push(depth);
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
 */
async function readCertificates(
  api: CertifyApi,
  game: CertifyGame,
  files: CertifyFiles,
): Promise<Map<string, Certificates>> {
  const kept = new Map<string, Certificates>();
  for (const set of setIdsOf(api.levels)) {
    const path = certificatesPath(game, set);
    const text = await files.read(path);
    try {
      kept.set(set, text === null ? {} : (JSON.parse(text) as Certificates));
    } catch (error) {
      throw new Error(`${path} isn't JSON.`, { cause: error });
    }
  }
  return kept;
}

/**
 * Writes the lines found to their sets' certificates, keeping the other
 * lines as they were and leaving a level none on a depth it has no line on,
 * then writes each level's par on each depth from every set's certificates,
 * and returns the files written.
 */
async function writeCertificates(
  api: CertifyApi,
  game: CertifyGame,
  certified: readonly Certified[],
  kept: ReadonlyMap<string, Certificates>,
  files: CertifyFiles,
): Promise<string[]> {
  const written: string[] = [];
  const pars: Record<string, Record<string, number>> = {};
  for (const set of setIdsOf(api.levels)) {
    const levels = api.levels.filter((entry) => entry.set.id === set);
    const was = kept.get(set) ?? {};
    const touched = certified.some((job) =>
      levels.some((entry) => entry.number === job.level),
    );
    const certificates: Record<
      string,
      Record<string, readonly unknown[]>
    > = touched ? {} : { ...was };
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
      const path = certificatesPath(game, set);
      await files.write(path, certificatesText(certificates));
      written.push(path);
    }
    for (const [id, lines] of Object.entries(certificates)) {
      for (const [depth, line] of Object.entries(lines)) {
        (pars[id] ??= {})[depth] = api.parFrom(line.length);
      }
    }
  }
  await files.write(game.par, fileText(sorted(pars)));
  return [...written, game.par];
}

/** Returns where a set's certificates are kept, from the game's folder. */
function certificatesPath(game: CertifyGame, set: string): string {
  return `${game.certificates}/${set}.json`;
}

/**
 * Returns certificates as their file holds them: each level's lines by its
 * id, sorted, then each line by its depth, which JavaScript keeps in order
 * as a whole number, laid out as Prettier lays the file out.
 */
export function certificatesText(certificates: Certificates): string {
  return fileText(sorted(certificates));
}

/**
 * Returns a value as a JSON file holds it, laid out as Prettier lays out
 * what JSON.stringify() writes: an object a key a line; a list on one line
 * where it fits in 80 columns, but a list of two lists or more of two items
 * or more; else a list of numbers as many to a line as fit, and any other
 * an item a line.
 */
function fileText(value: unknown): string {
  return `${linesOf(value, "", "", "").join("\n")}\n`;
}

/** Returns the lines of a value in a JSON file, at an indent, after what comes before it on its first line and with what comes after it on its last. */
function linesOf(
  value: unknown,
  indent: string,
  before: string,
  after: string,
): string[] {
  const inner = `${indent}  `;
  const items: [string, unknown][] | null = Array.isArray(value)
    ? value.map((item) => ["", item])
    : isRecord(value)
      ? Object.entries(value).map(([key, item]) => [
          `${JSON.stringify(key)}: `,
          item,
        ])
      : null;
  if (items === null) {
    return [`${indent}${before}${JSON.stringify(value)}${after}`];
  }
  const flat = flatText(value);
  if (flat !== null && !alwaysBroken(value)) {
    const oneLine = `${indent}${before}${flat}${after}`;
    if (oneLine.length <= PRINT_WIDTH) return [oneLine];
  }
  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  const body = isListOfNumbers(value)
    ? filled(value, inner)
    : items.flatMap(([key, item], index) =>
        linesOf(item, inner, key, index < items.length - 1 ? "," : ""),
      );
  return [`${indent}${before}${open}`, ...body, `${indent}${close}${after}`];
}

/** Returns a value as Prettier writes it on one line, or null for an object with keys, which it always breaks. */
function flatText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const items = value.map(flatText);
    return items.includes(null) ? null : `[${items.join(", ")}]`;
  }
  if (isRecord(value)) return Object.keys(value).length === 0 ? "{}" : null;
  return JSON.stringify(value);
}

/** Returns whether Prettier breaks a list wherever it fits: one of two lists or more, each of two items or more. */
function alwaysBroken(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 1 &&
    value.every((item) => Array.isArray(item) && item.length > 1)
  );
}

/** Returns a list of numbers' lines at an indent, as many to a line as fit, each but the last followed by a comma. */
function filled(numbers: readonly number[], indent: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const [index, number] of numbers.entries()) {
    const word = `${JSON.stringify(number)}${index < numbers.length - 1 ? "," : ""}`;
    if (line === "") {
      line = `${indent}${word}`;
    } else if (`${line} ${word}`.length <= PRINT_WIDTH) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = `${indent}${word}`;
    }
  }
  return [...lines, line];
}

/** Returns whether a value is a list of one number or more. */
function isListOfNumbers(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "number")
  );
}

/** Returns whether a value is an object of keys, not a list. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns a copy of a record with its keys sorted. */
export function sorted<T>(
  record: Readonly<Record<string, T>>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/** Reads and writes a game's files, by their paths from its folder. */
export function workspaceFiles(root: string): CertifyFiles {
  return {
    read: async (path) => {
      try {
        return await readFile(join(root, path), "utf8");
      } catch (error) {
        if (isMissingFile(error)) return null;
        throw error;
      }
    },
    write: (path, text) => writeFile(join(root, path), text),
  };
}

/** Returns whether reading a file failed because it isn't there. */
function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Waits for a run's turn in the queue `yarn verify:changed` keeps, from a folder of the repository. */
export async function waitForTurn(
  root: string,
  onWait: (ahead: number) => void,
): Promise<() => void> {
  return waitInQueue(await queueFolder(root), { onWait });
}

/**
 * Certifies a game's levels as a command line asks, or prints its usage,
 * and returns the code to exit with: 0, 1 if a level has no line on a
 * depth, or 2 for a command line it can't read, certifying nothing.
 *
 * It reads the certificates before it waits its turn in the queue, so a
 * file that isn't JSON fails it at once, and leaves the queue once it has
 * written them.
 */
export async function certifyLevels(
  args: readonly string[],
  game: CertifyGame,
  {
    load = () => loadCertifyApi(game),
    solve = (jobs, done) => solveOnThreads(jobs, done, poolOf(game)),
    files = workspaceFiles(game.root),
    queue = waitForTurn,
    now = Date.now,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  }: CertifyIo = {},
): Promise<number> {
  const printer: Printer = { print, printError };
  const request = readCommandLine(args);
  if (isStop(request)) return stopWith(request, printer);
  const api = await load();
  const jobs = jobsOf(api, request);
  if (isStop(jobs)) return stopWith(jobs, printer);
  const kept = await readCertificates(api, game, files);
  const joined = now();
  const heard: number[] = [];
  const leave = await queue(game.root, (ahead) => {
    heard.push(ahead);
    print(waitingWords(ahead));
  });
  let certified: Certified[];
  let written: string[];
  try {
    if (heard.length > 0) print(waitedWords(now() - joined));
    certified = await certify(api, jobs, solve, print);
    written = await writeCertificates(api, game, certified, kept, files);
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

/** Returns whether what a thread was started with marks it a thread of the pool. */
function isPoolThread(data: unknown): data is PoolThread {
  return (
    typeof data === "object" &&
    data !== null &&
    "pool" in data &&
    data.pool === POOL_MARK
  );
}

if (!isMainThread && isPoolThread(workerData) && parentPort !== null) {
  serveJobs(parentPort, await loadCertifyApi(workerData.game));
}
