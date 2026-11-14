// Runs a script of each of the frontend's workspaces, the slowest first, a
// few side by side: the root's `yarn test` and `yarn test:coverage`, through
// its `tools/run-tests.mjs`.

import { spawn } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import {
  CONSOLE,
  type Printer,
  type Stop,
  isStop,
  misread,
  readArgs,
  readCount,
  stopWith,
} from "./script.ts";

/** A workspace of the frontend's, as the root runs its scripts. */
export interface Workspace {
  /** Its name, as its `package.json` gives it. */
  readonly name: string;
  /** Its folder. */
  readonly folder: string;
  /** How many spec files it holds, which stands for how long its tests run. */
  readonly specs: number;
}

/** What one workspace's run of a script came to. */
export interface Outcome {
  readonly workspace: Workspace;
  /** The code its script exited with. */
  readonly code: number;
  /** When it started, in milliseconds after the first did. */
  readonly startedMs: number;
  /** How long it ran, in milliseconds. */
  readonly tookMs: number;
}

/** What a command came to: its exit code, and all it printed, in order. */
export interface Ran {
  readonly code: number;
  readonly output: string;
}

/**
 * Says where `runTestsScript()` prints, how many cores it shares out, the
 * platform whose shell it quotes for, how it runs a command and the clock it
 * times them by, each its own unless a spec hands it another.
 */
export interface TestsScriptIo extends Partial<Printer> {
  /** How many cores the machine has. */
  readonly cores?: number;
  /** The platform whose shell reads the command lines. */
  readonly platform?: NodeJS.Platform;
  /** Runs a command line in a folder. */
  readonly run?: (command: string, folder: string) => Promise<Ran>;
  /** Reads a clock in milliseconds. */
  readonly now?: () => number;
}

/** The folders a workspace's spec files are never in. */
const NOT_SPECS = new Set(["node_modules", "dist", "coverage"]);

/** How many workspaces run at once unless asked. */
const JOBS = 4;

const USAGE = `Usage: yarn test [options] [-- <vitest options>]
       yarn test:coverage [options] [-- <vitest options>]
       node tools/run-tests.mjs <script> [options] [-- <vitest options>]

Runs the script of every workspace that has one, those with the most spec
files first, as many at once as --jobs says, each Vitest on an equal share
of the machine's cores, and prints each workspace's output once it ends,
then when each started and how long it ran. It runs every workspace, and
fails if any fails. What follows -- is handed to each Vitest as it is, but
for a % or a " on Windows, whose shell can't be handed either.

  -j, --jobs <n>         How many workspaces run at once (4)
      --only <names>     Runs only the workspaces named, by commas
      --except <names>   Runs every workspace but those named, by commas
  -h, --help             Show this message`;

/**
 * Returns the workspaces a root's `package.json` declares that have a
 * script, the most spec files first, then by name.
 *
 * A suite's time follows how many files it holds closely enough to start
 * the longest first, which Yarn's `foreach` can't, as it starts them by
 * name: the Solitaire Collection's, the most files and the longest on one
 * worker, would start thirteenth of fourteen.
 */
export function workspacesWithScript(
  root: string,
  script: string,
): Workspace[] {
  const { workspaces = [] } = readPackage(root);
  const found: Workspace[] = [];
  for (const pattern of workspaces) {
    for (const path of globSync(`${pattern}/package.json`, { cwd: root })) {
      const folder = dirname(join(root, path));
      const { name, scripts = {} } = readPackage(folder);
      if (name !== undefined && Object.hasOwn(scripts, script)) {
        found.push({ name, folder, specs: specFiles(folder) });
      }
    }
  }
  return found.sort(
    (a, b) => b.specs - a.specs || a.name.localeCompare(b.name),
  );
}

/**
 * Runs `run` for each workspace in the order given, at most `lanes` at
 * once, and returns the outcomes in the order they finished.
 *
 * Every workspace runs, whatever another's comes to, as with Yarn's
 * `foreach --parallel`, so one run finds every failure.
 */
export async function runInLanes(
  workspaces: readonly Workspace[],
  lanes: number,
  run: (workspace: Workspace) => Promise<number>,
  now: () => number = () => performance.now(),
): Promise<Outcome[]> {
  const waiting = [...workspaces];
  const outcomes: Outcome[] = [];
  const first = now();
  const lane = async (): Promise<void> => {
    for (
      let workspace = waiting.shift();
      workspace !== undefined;
      workspace = waiting.shift()
    ) {
      const started = now();
      const code = await run(workspace);
      outcomes.push({
        workspace,
        code,
        startedMs: started - first,
        tookMs: now() - started,
      });
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(lanes, waiting.length)) }, lane),
  );
  return outcomes;
}

/**
 * Runs a command line in the platform's shell, in a folder, and returns its
 * exit code, 1 where a signal ended it, and all it printed, its output and
 * its errors as they came.
 *
 * Through the shell, `yarn` runs on Windows too, where it is a `.cmd` file
 * that only a shell starts, so the command line is the caller's to keep to
 * what every shell reads alike.
 */
export function runCommand(command: string, cwd: string): Promise<Ran> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString() });
    });
  });
}

/**
 * Returns an argument as the platform's shell reads it back as one word, or
 * nothing on Windows for one holding a `%` or a `"`, which its shell reads
 * in a variable's name or ends a quote at, even between quotes.
 */
export function shellQuoted(
  arg: string,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  if (/^[\w@+=:,./-]+$/.test(arg)) return arg;
  if (platform !== "win32") return `'${arg.replaceAll("'", `'\\''`)}'`;
  return /["%]/.test(arg) ? undefined : `"${arg}"`;
}

/**
 * Runs the script a command line names in a root's workspaces, as
 * `tools/run-tests.mjs` does, and returns the code to exit with: 1 where a
 * workspace's failed, and 2 for a command line it can't read.
 *
 * Each workspace's Vitest is handed its share of the cores as a number,
 * never as a share such as 25%, which Windows' shell reads as the start of
 * a variable, and the cores are shared by the workspaces that run at once,
 * so one run alone gets them all.
 */
export async function runTestsScript(
  args: readonly string[],
  root: string,
  {
    print = CONSOLE.print,
    printError = CONSOLE.printError,
    cores = availableParallelism(),
    platform = process.platform,
    run = runCommand,
    now,
  }: TestsScriptIo = {},
): Promise<number> {
  const printer = { print, printError };
  const split = args.indexOf("--");
  const read = readArgs(split < 0 ? args : args.slice(0, split), {
    options: {
      jobs: { type: "string", short: "j" },
      only: { type: "string", multiple: true },
      except: { type: "string", multiple: true },
    },
    allowPositionals: true,
    usage: USAGE,
  });
  if (isStop(read)) return stopWith(read, printer);
  const [script, ...rest] = read.positionals;
  if (script === undefined || rest.length > 0) {
    return stopWith(misread("Name one script to run.", USAGE), printer);
  }
  const jobs = readCount("jobs", read.values.jobs, USAGE) ?? JOBS;
  if (isStop(jobs)) return stopWith(jobs, printer);
  const handed = split < 0 ? [] : args.slice(split + 1);
  const quoted = handed.map((arg) => shellQuoted(arg, platform));
  const unquotable = handed.find((_, i) => quoted[i] === undefined);
  if (unquotable !== undefined) {
    const problem = `Windows' shell can't be handed ${unquotable}.`;
    return stopWith(misread(problem, USAGE), printer);
  }
  const chosen = chosenOf(
    workspacesWithScript(root, script),
    script,
    namesIn(read.values.only),
    namesIn(read.values.except) ?? [],
  );
  if (isStop(chosen)) return stopWith(chosen, printer);

  const lanes = Math.min(jobs, chosen.length);
  const workers = Math.max(1, Math.round(cores / lanes));
  const command = [`yarn run ${script} --maxWorkers=${workers}`, ...quoted];
  const outcomes = await runInLanes(
    chosen,
    lanes,
    async (workspace) => {
      const { code, output } = await run(
        command.join(" "),
        workspace.folder,
      ).catch((error: unknown) => ({ code: 1, output: String(error) }));
      print(`➤ ${workspace.name}: ${script} exited with ${code}`);
      print(output.trimEnd());
      return code;
    },
    now,
  );

  print(`\n${"Started".padStart(9)}${"Took".padStart(9)}  Workspace`);
  for (const { workspace, startedMs, tookMs, code } of [...outcomes].sort(
    (a, b) => a.startedMs - b.startedMs,
  )) {
    const note = code === 0 ? "" : `  exited with ${code}`;
    print(
      `${seconds(startedMs).padStart(9)}${seconds(tookMs).padStart(9)}  ${workspace.name}${note}`,
    );
  }
  const failed = outcomes.filter(({ code }) => code !== 0);
  if (failed.length === 0) return 0;
  const names = failed.map(({ workspace }) => workspace.name).join(", ");
  printError(`\n${script} failed in ${names}.`);
  return 1;
}

/**
 * Returns the workspaces `--only` and `--except` leave of those with the
 * script, or the stop that says what is wrong where they name one without
 * it or leave none.
 */
function chosenOf(
  found: readonly Workspace[],
  script: string,
  only: readonly string[] | undefined,
  except: readonly string[],
): Workspace[] | Stop {
  const unknown = [...(only ?? []), ...except].filter(
    (name) => !found.some((workspace) => workspace.name === name),
  );
  if (unknown.length > 0) {
    const names = unknown.join(", ");
    return misread(
      `No workspace named ${names} has a ${script} script.`,
      USAGE,
    );
  }
  const chosen = found.filter(
    ({ name }) =>
      (only === undefined || only.includes(name)) && !except.includes(name),
  );
  return chosen.length > 0
    ? chosen
    : misread(`No workspace to run ${script} in.`, USAGE);
}

/**
 * Returns the names in an option's lists, each written with commas, if it
 * was given, leaving out the empty ones a stray comma makes.
 */
function namesIn(lists: readonly string[] | undefined): string[] | undefined {
  return lists
    ?.flatMap((list) => list.split(","))
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

/** Returns milliseconds as seconds, as the table prints them. */
function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

/** The fields of a `package.json` the root reads. */
interface Package {
  readonly name?: string;
  readonly workspaces?: readonly string[];
  readonly scripts?: Readonly<Record<string, string>>;
}

/** Returns the `package.json` in a folder. */
function readPackage(folder: string): Package {
  return JSON.parse(
    readFileSync(join(folder, "package.json"), "utf8"),
  ) as Package;
}

/** Returns how many spec files a workspace's folder holds. */
function specFiles(folder: string): number {
  return globSync("**/*.spec.ts", {
    cwd: folder,
    exclude: (name) => NOT_SPECS.has(name),
  }).length;
}
