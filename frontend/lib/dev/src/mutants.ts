// Runs a mutation pass over a workspace: breaks its code one mutant at a
// time, runs the specs that should catch each, puts the file back whatever
// the run came to, and prints each mutant's verdict for the commit's body:
// the root's `yarn mutants`, through its `tools/mutants.mjs`.

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { constants } from "node:os";
import { isAbsolute, join, normalize, resolve, sep } from "node:path";
import { waitForTurn, waitedWords, waitingWords } from "./queue.ts";
import {
  CONSOLE,
  type Printer,
  type Stop,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "./script.ts";
import { declaredWorkspaces, shellQuoted } from "./workspaces.ts";

/** A change a mutation pass makes to a workspace's file, and the specs that should catch it. */
export interface Mutant {
  /** What the pass's table calls it. */
  readonly name: string;
  /** The file it changes, from the workspace's folder. */
  readonly file: string;
  /** The text it changes, which must appear in the file once. */
  readonly find: string;
  /** What takes that text's place. */
  readonly replace: string;
  /** The Vitest project whose specs should catch it, left out where the workspace has one. */
  readonly project?: string;
  /** The folder, or the spec, whose specs should catch it, from the workspace's folder. */
  readonly folder: string;
}

/** What a mutant can come to, as the pass's table says it, in the order the table counts them. */
const VERDICTS = [
  "killed",
  "survived",
  "timed out",
  "matched nothing",
  "matched more than once",
  "never ran",
] as const;

/** What a mutant came to, as the pass's table says it. */
export type Verdict = (typeof VERDICTS)[number];

/** How a run of a command ended: by itself, passing or failing, at its time limit, or stopped. */
export type RunEnd = "passed" | "failed" | "timed out" | "stopped";

/**
 * Runs a command line in a folder, in the platform's shell, till it ends,
 * runs out of time or is stopped, and says which.
 */
export type RunUntil = (
  command: string,
  folder: string,
  limitMs: number,
  stop: AbortSignal,
) => Promise<RunEnd>;

/**
 * Says where a pass prints, how it runs a command, the clock it keeps to
 * its limit by, how it waits its turn and how it hears a signal, each its
 * own unless a spec hands it another.
 */
export interface MutantsIo extends Partial<Printer> {
  /** Runs a command line in a folder till it ends, runs out of time or is stopped. */
  readonly run?: RunUntil;
  /** Reads a clock in milliseconds. */
  readonly now?: () => number;
  /**
   * Waits for the pass's turn in the queue of the runs that take the whole
   * machine, from the frontend's folder, telling `onWait` how many runs are
   * ahead, and returns the function that leaves it.
   */
  readonly queue?: (
    root: string,
    onWait: (ahead: number) => void,
  ) => Promise<() => void>;
  /** Calls `stop` with each signal the process is sent, until the function it returns is called. */
  readonly onSignal?: (stop: (signal: NodeJS.Signals) => void) => () => void;
}

/** How long a mutant's specs may run before the pass stops them, in milliseconds. */
export const MUTANT_LIMIT_MS = 2 * 60_000;

/** How long a pass may run, from its turn in the queue, before it runs no more, in milliseconds. */
export const PASS_LIMIT_MS = 20 * 60_000;

/** The signals a pass stops on, putting back what it changed. */
const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

/** How wide the table's verdicts are, so the names line up. */
const VERDICT_WIDTH = Math.max(...VERDICTS.map((verdict) => verdict.length));

const USAGE = `Usage: yarn mutants <workspace> <list> [options]

Breaks a workspace's code one mutant at a time, runs the specs that should
catch each with yarn vitest run, puts the file back whatever the run came to,
on a signal too, and prints each mutant's verdict for the commit's body:
killed, survived, timed out, matched nothing (or more than once), or never
ran. It waits its turn in the queue yarn verify:changed keeps, then runs
each project and folder's specs with no mutant in place, and runs no mutant
where they fail or run out of time. A mutant's specs stop at 2 minutes, and
the pass at 20.

<workspace> is the workspace's folder, from the frontend's, such as
games/brick-fuzz-pop. <list> is a JSON file, kept outside the repository,
from the frontend's folder or absolute: a list of mutants, each

  { "name": "the cap's bound", "file": "src/rules/cap.ts",
    "find": "count < most", "replace": "count <= most",
    "project": "pure", "folder": "src/rules" }

its file and folder from the workspace's, its text found once in its file,
and its project left out where the workspace has one.

It exits with 0 where every mutant was killed, 1 where one wasn't or the
specs fail with none in place, 2 for a command line or a list it can't
read, and 128 and the signal's number on a signal.

  -h, --help      Show this message`;

/** A mutant's name, and what it came to. */
interface Judged {
  readonly name: string;
  readonly verdict: Verdict;
}

/** What a command line asks a pass for: a workspace, from the frontend's folder, and its mutants. */
interface Request {
  readonly workspace: string;
  readonly mutants: readonly Mutant[];
}

/**
 * Returns the mutants a list holds, or what is wrong with it: JSON, a list
 * of one mutant at least, each with a name, a file and a folder inside its
 * workspace, a text to find and one to put in its place, and a project
 * where it names one, its folder and project words the platform's shell
 * takes as they are.
 */
export function readMutants(
  text: string,
  platform: NodeJS.Platform = process.platform,
): readonly Mutant[] | string {
  let read: unknown;
  try {
    read = JSON.parse(text);
  } catch (error) {
    return `The list of mutants isn't JSON: ${String(error)}`;
  }
  if (!Array.isArray(read) || read.length === 0) {
    return "The list of mutants is a JSON array of one mutant at least.";
  }
  const mutants: Mutant[] = [];
  for (const [index, entry] of read.entries()) {
    const mutant = mutantOf(entry, platform);
    if (typeof mutant === "string") {
      return `Mutant ${String(index + 1)} of the list ${mutant}`;
    }
    mutants.push(mutant);
  }
  return mutants;
}

/**
 * Runs a mutation pass, as `tools/mutants.mjs` does, from the frontend's
 * folder, and returns the code to exit with: 0 where every mutant was
 * killed; 1 where one wasn't, or the specs fail with none in place; 2 for a
 * command line or a list it can't read, before it waits in the queue; and
 * 128 and the signal's number on a signal.
 *
 * It applies one mutant at a time, runs the specs of its project and
 * folder, and puts the file's bytes back whether the run passed, failed,
 * timed out or was stopped. It hears a signal only once its turn comes, so
 * one sent while it waits ends it as it would any script, nothing changed.
 */
export async function runMutants(
  args: readonly string[],
  root: string,
  {
    print = CONSOLE.print,
    printError = CONSOLE.printError,
    run = runUntil,
    now = Date.now,
    queue = waitForTurn,
    onSignal = onProcessSignal,
  }: MutantsIo = {},
): Promise<number> {
  const request = await readRequest(args, root);
  if (isStop(request)) return stopWith(request, { print, printError });
  const { workspace, mutants } = request;
  const folder = join(root, workspace);
  const joined = now();
  const heard: number[] = [];
  const leave = await queue(root, (ahead) => {
    heard.push(ahead);
    print(waitingWords(ahead));
  });
  const started = now();
  if (heard.length > 0) print(waitedWords(started - joined));
  const stopper = new AbortController();
  let signalled: NodeJS.Signals | undefined;
  const unlisten = onSignal((signal) => {
    signalled ??= signal;
    stopper.abort();
  });
  try {
    const limit = (): number =>
      Math.min(MUTANT_LIMIT_MS, PASS_LIMIT_MS - (now() - started));
    for (const specs of specsOf(mutants)) {
      const limitMs = limit();
      const end = await run(commandOf(specs), folder, limitMs, stopper.signal);
      // Stopped, or cut short by the pass's limit, every mutant never ran.
      if (
        end === "stopped" ||
        (end === "timed out" && limitMs < MUTANT_LIMIT_MS)
      )
        break;
      if (end !== "passed") {
        printError(
          `${commandOf(specs)} ${end === "failed" ? "fails" : "runs out of time"} in ${workspace} with no mutant in place, so the pass runs none. Run it there to see why.`,
        );
        return 1;
      }
    }
    const judged: Judged[] = [];
    for (const mutant of mutants) {
      const left = limit();
      judged.push({
        name: mutant.name,
        verdict:
          signalled !== undefined || left <= 0
            ? "never ran"
            : await verdictOf(mutant, folder, left, run, stopper.signal),
      });
    }
    for (const line of tableOf(workspace, judged)) print(line);
    if (signalled !== undefined) return 128 + constants.signals[signalled];
    return judged.every(({ verdict }) => verdict === "killed") ? 0 : 1;
  } finally {
    unlisten();
    leave();
  }
}

/**
 * Runs a command line in a folder, in the platform's shell, till it ends,
 * `limitMs` passes or `stop` aborts, and says which, ending the command
 * and every process it started in the last two cases, as `platform` ends
 * them.
 */
export function runUntil(
  command: string,
  folder: string,
  limitMs: number,
  stop: AbortSignal,
  platform: NodeJS.Platform = process.platform,
): Promise<RunEnd> {
  const windows = platform === "win32";
  return new Promise((resolvePromise, reject) => {
    // Off Windows, a group of its own, so ending it ends what it started:
    // Yarn, Vitest and Vitest's workers.
    const child = spawn(command, {
      cwd: folder,
      shell: true,
      stdio: "ignore",
      detached: !windows,
    });
    let cut: "timed out" | "stopped" | undefined;
    const end = (why: "timed out" | "stopped"): void => {
      cut ??= why;
      endTree(child, windows);
    };
    const timeUp = setTimeout(() => {
      end("timed out");
    }, limitMs);
    const stopped = (): void => {
      end("stopped");
    };
    const settle = (): void => {
      clearTimeout(timeUp);
      stop.removeEventListener("abort", stopped);
    };
    child.on("error", (error) => {
      settle();
      reject(error);
    });
    child.on("close", (code) => {
      settle();
      resolvePromise(cut ?? (code === 0 ? "passed" : "failed"));
    });
    if (stop.aborted) stopped();
    else stop.addEventListener("abort", stopped);
  });
}

/** Returns what a command line asks a pass for, or the stop that says why it runs none. */
async function readRequest(
  args: readonly string[],
  root: string,
): Promise<Request | Stop> {
  const read = readArgs(args, {
    options: {},
    allowPositionals: true,
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const [workspace, list, ...more] = read.positionals;
  if (workspace === undefined || list === undefined || more.length > 0) {
    return misread("Name a workspace and a list of mutants.", USAGE);
  }
  const folder = resolve(root, workspace);
  if (
    !declaredWorkspaces(root).some((declared) => declared.folder === folder)
  ) {
    return misread(`${workspace} is no workspace of the frontend's.`, USAGE);
  }
  let text: string;
  try {
    text = await readFile(resolve(root, list), "utf8");
  } catch {
    return misread(`There is no list of mutants at ${list}.`, USAGE);
  }
  const mutants = readMutants(text);
  if (typeof mutants === "string") return misread(mutants, USAGE);
  const missing = mutants.find(
    ({ file }) => !existsSync(join(root, workspace, file)),
  );
  if (missing !== undefined) {
    return misread(
      `The mutant "${missing.name}" changes ${missing.file}, which ${workspace} has no file at.`,
      USAGE,
    );
  }
  return { workspace, mutants };
}

/** Returns a list's entry as a mutant, or what is wrong with it, to follow "Mutant 2 of the list". */
function mutantOf(entry: unknown, platform: NodeJS.Platform): Mutant | string {
  if (!isObject(entry)) return "isn't an object.";
  const { name, file, find, replace, project, folder } = entry;
  if (
    typeof name !== "string" ||
    typeof file !== "string" ||
    typeof find !== "string" ||
    typeof replace !== "string" ||
    typeof folder !== "string" ||
    (project !== undefined && typeof project !== "string")
  ) {
    return "needs a name, a file, a find, a replace and a folder, and may have a project, each a string.";
  }
  if (name === "" || find === "") return "needs a name and a text to find.";
  const outside = [file, folder].find((path) => !isInside(path));
  if (outside !== undefined) {
    return `names ${outside}, which isn't a path inside its workspace.`;
  }
  const optional = [folder, project].find((word) => word?.startsWith("-"));
  if (optional !== undefined) {
    return `names ${optional}, which Vitest would take for an option.`;
  }
  const unquoted = [folder, project].find(
    (word) => word !== undefined && shellQuoted(word, platform) === undefined,
  );
  if (unquoted !== undefined) {
    return `names ${unquoted}, which the shell can't take as one word.`;
  }
  return {
    name,
    file,
    find,
    replace,
    folder,
    ...(project === undefined ? {} : { project }),
  };
}

/** Returns whether a value read from JSON is an object, its keys' values unknown. */
function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns whether a path, from a workspace's folder, stays inside it. */
function isInside(path: string): boolean {
  const normal = normalize(path);
  return (
    path !== "" &&
    !isAbsolute(path) &&
    normal !== ".." &&
    !normal.startsWith(`..${sep}`)
  );
}

/** Returns each project and folder the mutants' specs run in, once, in the list's order. */
function specsOf(
  mutants: readonly Mutant[],
): Pick<Mutant, "project" | "folder">[] {
  const seen = new Map<string, Pick<Mutant, "project" | "folder">>();
  for (const { project, folder } of mutants) {
    const specs = { folder, ...(project === undefined ? {} : { project }) };
    seen.set(commandOf(specs), specs);
  }
  return [...seen.values()];
}

/** Returns the command line that runs the specs of a project and folder. */
function commandOf({
  project,
  folder,
}: Pick<Mutant, "project" | "folder">): string {
  // The list's reader refused any word the shell can't take.
  const words = [
    ...(project === undefined ? [] : ["--project", project]),
    folder,
  ];
  return `yarn vitest run ${words.map((word) => shellQuoted(word) ?? word).join(" ")}`;
}

/**
 * Applies a mutant, runs its specs, puts its file's bytes back however the
 * run ends, and returns its verdict.
 */
async function verdictOf(
  mutant: Mutant,
  folder: string,
  limitMs: number,
  run: RunUntil,
  stop: AbortSignal,
): Promise<Verdict> {
  const path = join(folder, mutant.file);
  const bytes = await readFile(path);
  const text = bytes.toString("utf8");
  const at = text.indexOf(mutant.find);
  if (at === -1) return "matched nothing";
  if (text.includes(mutant.find, at + 1)) return "matched more than once";
  // Spliced, not `replace()`d, which would read `$&` in the replacement.
  await writeFile(
    path,
    text.slice(0, at) + mutant.replace + text.slice(at + mutant.find.length),
  );
  let end: RunEnd;
  try {
    end = await run(commandOf(mutant), folder, limitMs, stop);
  } finally {
    await writeFile(path, bytes);
  }
  switch (end) {
    case "passed":
      return "survived";
    case "failed":
      return "killed";
    case "timed out":
      // Cut short by the pass's limit, its specs said nothing.
      return limitMs < MUTANT_LIMIT_MS ? "never ran" : "timed out";
    case "stopped":
      return "never ran";
  }
}

/** Returns the pass's table for a commit's body: a line that counts each verdict, then each mutant's. */
function tableOf(workspace: string, judged: readonly Judged[]): string[] {
  const counts = VERDICTS.flatMap((verdict) => {
    const count = judged.filter((given) => given.verdict === verdict).length;
    return count === 0 ? [] : [`${String(count)} ${verdict}`];
  });
  const total =
    judged.length === 1 ? "1 mutant" : `${String(judged.length)} mutants`;
  return [
    `Mutation pass over ${workspace}: ${total}, ${counts.join(", ")}.`,
    "",
    ...judged.map(
      ({ name, verdict }) => `  ${verdict.padEnd(VERDICT_WIDTH)}  ${name}`,
    ),
  ];
}

/** Ends a process and every process it started: its group, off Windows, or its tree, on it. */
function endTree(child: ChildProcess, windows: boolean): void {
  const { pid } = child;
  if (pid === undefined) return;
  if (windows) {
    // A taskkill that can't start would crash the pass before it puts the
    // file back, so the shell alone is ended then.
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore",
    }).on("error", () => {
      child.kill();
    });
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // The group had ended already.
  }
}

/** Calls `stop` with each signal a pass stops on that the process is sent, until the function it returns is called. */
function onProcessSignal(stop: (signal: NodeJS.Signals) => void): () => void {
  for (const signal of SIGNALS) process.on(signal, stop);
  return () => {
    for (const signal of SIGNALS) process.off(signal, stop);
  };
}
