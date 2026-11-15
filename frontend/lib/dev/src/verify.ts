// Verifies what a branch changed, each workspace's steps side by side under
// a budget of cores and memory: the root's `yarn verify:changed`, through
// its `tools/verify-changed.mjs`.

import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { promisify } from "node:util";
import {
  CONSOLE,
  type Env,
  type Printer,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "./script.ts";
import {
  type DeclaredWorkspace,
  type RunCommand,
  compileCached,
  declaredWorkspaces,
  printedRun,
  runCommand,
  timesTable,
} from "./workspaces.ts";

/** A command the runner starts once the tasks it waits on have passed. */
export interface Task {
  /** What the runner calls it, the workspace's name and its script's, such as `snake lint`. */
  readonly name: string;
  /** The folder it runs in. */
  readonly folder: string;
  /** Its command line, which the platform's shell runs. */
  readonly command: string;
  /** How many of the budget's cores it claims while it runs. */
  readonly cores: number;
  /** How much of the budget's memory it claims while it runs, in GB. */
  readonly memoryGb: number;
  /** The tasks that must pass before it starts, by name. */
  readonly after: readonly string[];
  /** Whether it keeps Node's compile cache, as a workspace's `test` does. */
  readonly keepsCompileCache: boolean;
}

/** How many cores, and how much memory in GB, the tasks may claim at once. */
export interface Budget {
  readonly cores: number;
  readonly memoryGb: number;
}

/** Says how `tasksOf()` makes the tasks. */
export interface TaskOptions {
  /** Whether the tests run `test:coverage` rather than `test`. */
  readonly coverage: boolean;
  /** The budget the tasks share. */
  readonly budget: Budget;
}

/** What a task came to, and when. */
export interface TaskOutcome {
  readonly task: Task;
  /** The code it exited with, or `skipped` where a task it waits on didn't pass. */
  readonly code: number | "skipped";
  /** When it started, in milliseconds after the first did. */
  readonly startedMs: number;
  /** How long it ran, in milliseconds. */
  readonly tookMs: number;
}

/** What a change reaches: the workspaces to verify, and why every one is. */
export interface Reach {
  /** The names of the workspaces to verify. */
  readonly names: ReadonlySet<string>;
  /** The file that reaches every workspace, where one does. */
  readonly everything: string | undefined;
}

/**
 * Says where `runVerifyChanged()` prints, how many cores and how much free
 * memory it shares out, the environment it runs in, how it runs a command
 * and the clock it times them by, each its own unless a spec hands it
 * another.
 */
export interface VerifyIo extends Partial<Printer> {
  /** How many cores the machine has. */
  readonly cores?: number;
  /** How much memory is free as it starts, in GB. */
  readonly freeMemoryGb?: number;
  /** The environment the script runs in, which says whether it runs on CI. */
  readonly env?: Env;
  /** Runs a command line in a folder, in an environment. */
  readonly run?: RunCommand;
  /** Reads a clock in milliseconds. */
  readonly now?: () => number;
}

/** The root's scripts, which run whatever changed. */
const ROOT_SCRIPTS = ["lint:root", "typecheck:root", "prettier:check"];

/**
 * The root's files, from its folder, that only the root's scripts read, so
 * a change to one reaches no workspace, a folder ending in a slash.
 *
 * Any other file of the root's, such as `package.json`, `yarn.lock` or
 * `.yarnrc.yml`, reaches every workspace.
 */
const ROOT_ONLY = [
  "tools/",
  "eslint.config.js",
  "yarn.config.cjs",
  "tsconfig.scripts.json",
  "LICENSE",
  ".gitignore",
];

/** The files outside the root's folder, from the repository's, that reach every workspace. */
const REACHING_EVERY_WORKSPACE = [".node-version"];

/**
 * What Markdown's names end in, which reaches no workspace, wherever it
 * lies, as only the root's skill-reference check and Prettier's read it, as
 * CI's `changes-code.sh` holds too.
 */
const MARKDOWN = ".md";

/** The folder, from the root's, that holds the games, whose builds the site's takes. */
const GAMES = "games";

/** The workspace whose build takes the games'. */
const SITE = "site";

/** A workspace's steps, in the order `yarn verify` runs them. */
const STEPS = ["lint", "typecheck", "test", "build", "check:layout"] as const;

/** One of a workspace's steps. */
type Step = (typeof STEPS)[number];

/** The cores a step claims, but the tests, which claim their workers. */
const STEP_CORES = {
  lint: 1,
  typecheck: 2,
  build: 2,
  "check:layout": 2,
} as const;

/**
 * The memory a step claims, in GB, but the tests, which claim their
 * workers': about the most it took alone, on the largest workspace that has
 * it, as `docs/local-pipeline-audit/data/step-memory.tsv` records (2.1 GB
 * for Brick Fuzz Pop's lint, 1.1 GB for its build, 1.0 GB for Brick
 * Breaker's layout check), the headroom taking what a claim falls short of.
 */
const STEP_MEMORY_GB = {
  lint: 2,
  typecheck: 1,
  build: 1.5,
  "check:layout": 1.5,
} as const;

/**
 * The memory each of the tests' workers claims, in GB: about what one took,
 * Brick Fuzz Pop's 3.4 GB over four workers and the Solitaire Collection's
 * 3.6 GB over four and 9.0 GB over eight.
 */
const WORKER_MEMORY_GB = 1;

/** The cores and the memory, in GB, each of the root's scripts claims. */
const ROOT_CLAIM = { cores: 1, memoryGb: 1 } as const;

/**
 * The memory left free whatever the tasks claim, in GB: what the audit's
 * runs side by side kept where every spec passed, where the one that timed
 * a spec out kept 0.6 GB.
 */
const HEADROOM_GB = 3;

/** How many suites the tests' workers are sized for, at most, as if they ran at once. */
const SUITES_AT_ONCE = 4;

/** How long a task is taken to run, by its script, until the runner has timed it. */
const GUESSED_SECONDS: Readonly<Record<string, number>> = {
  "lint:root": 5,
  "typecheck:root": 2,
  "prettier:check": 2,
  lint: 10,
  typecheck: 5,
  test: 15,
  "test:coverage": 20,
  build: 5,
  "check:layout": 10,
};

/** How long a task of a script the guesses don't name is taken to run. */
const GUESSED_OTHERWISE_SECONDS = 10;

/** Where the runner keeps how long each task took when it last passed, from the root's folder. */
const TIMES_FILE = "node_modules/.cache/fz-verify/times.json";

const USAGE = `Usage: yarn verify:changed [options]

Verifies what changed since the branch left --base: the workspaces holding
a file changed in its commits, staged, unstaged or untracked, and those
that depend on them, or every workspace for a change to what all of them
read, such as yarn.lock; Markdown reaches none. It runs the root's lint,
typecheck and Prettier's check, and each of those workspaces' lint,
typecheck, tests, build and layout check where it has them, side by side,
as many at once as the cores and the free memory allow, those with the
longest way to go first; a layout check after its game's build, and the
site's build after the games'. It prints each task's output once it ends,
then when each started and how long it ran, and fails if any fails.
yarn verify still verifies everything.

      --base <ref>   What the branch is compared with (origin/main)
      --coverage     Runs test:coverage, holding each workspace's floors
      --dry-run      Says what it would run, and runs nothing
  -h, --help         Show this message`;

/**
 * Returns the files a branch changed since it left a base, each by its path
 * from the repository's root: those its commits, the index or the working
 * tree changed, a renamed file under both its names, and those git doesn't
 * track and doesn't ignore, anywhere in the repository.
 *
 * It throws where git finds no commit the branch shares with the base.
 */
export async function changedSince(
  folder: string,
  base: string,
): Promise<string[]> {
  const fork = await git(folder, "merge-base", base, "HEAD").catch(
    (error: unknown) => {
      throw new Error(
        `Found no commit HEAD shares with ${base}; fetch it, or name another with --base.`,
        { cause: error },
      );
    },
  );
  const changed = await git(
    folder,
    "diff",
    "-z",
    "--name-only",
    // Paths from the repository's root, whatever `diff.relative` says.
    "--no-relative",
    "--no-renames",
    fork.trim(),
  );
  const untracked = await git(
    folder,
    "ls-files",
    "-z",
    "--others",
    "--exclude-standard",
    "--full-name",
    "--",
    ":/",
  );
  return [...new Set([...namesIn(changed), ...namesIn(untracked)])].sort();
}

/**
 * Returns the workspaces some changed files reach, each file by its path
 * from the repository's root, which the root's folder lies under at
 * `prefix`, such as `frontend/`: the workspaces holding one and every
 * workspace that depends on those; or every workspace, for a file of the
 * root's that isn't only its scripts', or one outside it that every
 * workspace reads.
 *
 * Markdown reaches none.
 */
export function reachOf(
  workspaces: readonly DeclaredWorkspace[],
  root: string,
  prefix: string,
  files: readonly string[],
): Reach {
  const folders = workspaces.map((workspace) => ({
    workspace,
    path: `${prefix}${slashed(relative(root, workspace.folder))}/`,
  }));
  const reached = new Set<string>();
  for (const file of files) {
    if (file.endsWith(MARKDOWN)) continue;
    if (!file.startsWith(prefix)) {
      if (REACHING_EVERY_WORKSPACE.includes(file)) {
        return everyOf(workspaces, file);
      }
      continue;
    }
    const owner = folders.find(({ path }) => file.startsWith(path));
    if (owner !== undefined) {
      reached.add(owner.workspace.name);
      continue;
    }
    const own = file.slice(prefix.length);
    const rootOnly = ROOT_ONLY.some((only) =>
      only.endsWith("/") ? own.startsWith(only) : own === only,
    );
    if (!rootOnly) return everyOf(workspaces, file);
  }
  let grew: boolean;
  do {
    grew = false;
    for (const { name, dependsOn } of workspaces) {
      if (!reached.has(name) && dependsOn.some((on) => reached.has(on))) {
        reached.add(name);
        grew = true;
      }
    }
  } while (grew);
  return { names: reached, everything: undefined };
}

/**
 * Returns the tasks that verify some workspaces: the root's scripts, and
 * each workspace's steps it has a script for, its tests on as many workers
 * as its share of the budget allows and its layout check after its build.
 *
 * Once the site or a game is verified, the site builds too, after every
 * game builds, so it never takes a build another branch left in a `dist/`.
 *
 * Each suite's workers are sized as if the suites shared three quarters of
 * the budget, four at once at most, on as many as its share of the cores
 * and of the memory allows, two at least; the budget, not that share,
 * decides how many run at once.
 */
export function tasksOf(
  workspaces: readonly DeclaredWorkspace[],
  root: string,
  names: ReadonlySet<string>,
  { coverage, budget }: TaskOptions,
): Task[] {
  const tests = coverage ? "test:coverage" : "test";
  const chosen = workspaces.filter(({ name }) => names.has(name));
  const suites = Math.min(
    SUITES_AT_ONCE,
    Math.max(1, chosen.filter(({ scripts }) => scripts.includes(tests)).length),
  );
  const workers = Math.max(
    2,
    Math.min(
      Math.floor((budget.cores * 3) / 4 / suites),
      Math.floor((budget.memoryGb * 3) / 4 / suites / WORKER_MEMORY_GB),
    ),
  );
  const games = workspaces.filter(({ folder }) =>
    folder.startsWith(join(root, GAMES) + sep),
  );
  const site = workspaces.find(({ name }) => name === SITE);
  const siteBuilds =
    site !== undefined &&
    chosen.some((workspace) => workspace === site || games.includes(workspace));
  const built = workspaces.filter(
    (workspace) =>
      workspace.scripts.includes("build") &&
      (workspace === site
        ? siteBuilds
        : names.has(workspace.name) ||
          (siteBuilds && games.includes(workspace))),
  );
  const gamesBuilt = games.filter((game) => built.includes(game));
  const tasks: Task[] = ROOT_SCRIPTS.map((script) => ({
    name: `root ${script}`,
    folder: root,
    command: `yarn run ${script}`,
    ...ROOT_CLAIM,
    after: [],
    keepsCompileCache: false,
  }));
  for (const workspace of workspaces) {
    for (const step of STEPS) {
      const script = step === "test" ? tests : step;
      const runs =
        workspace.scripts.includes(script) &&
        (step === "build"
          ? built.includes(workspace)
          : names.has(workspace.name));
      if (!runs) continue;
      tasks.push({
        name: `${workspace.name} ${script}`,
        folder: workspace.folder,
        command:
          step === "test"
            ? `yarn run ${script} --maxWorkers=${workers}`
            : `yarn run ${script}`,
        cores: step === "test" ? workers : STEP_CORES[step],
        memoryGb:
          step === "test" ? workers * WORKER_MEMORY_GB : STEP_MEMORY_GB[step],
        after: afterOf(workspace, step, workspace === site ? gamesBuilt : []),
        keepsCompileCache: script === "test",
      });
    }
  }
  return tasks;
}

/**
 * Runs tasks as a budget allows, and returns what each came to, in the
 * order they finished.
 *
 * A task starts once those it waits on have passed and
 * its cores and memory are free, or at once where nothing else runs; those
 * with the longest way to the end first, each taken to run as long as
 * `secondsOf` says. A task waiting on one that didn't pass is skipped; every
 * other runs, whatever another's comes to, so one run finds every failure.
 */
export async function runTasks(
  tasks: readonly Task[],
  budget: Budget,
  secondsOf: (task: Task) => number,
  run: (task: Task) => Promise<number>,
  now: () => number = () => performance.now(),
): Promise<TaskOutcome[]> {
  const waiting = inOrder(tasks, secondsOf);
  const codes = new Map<string, number>();
  const outcomes: TaskOutcome[] = [];
  const running = new Set<Promise<void>>();
  const first = now();
  let cores = budget.cores;
  let memoryGb = budget.memoryGb;
  while (waiting.length > 0) {
    for (const task of [...waiting]) {
      const ready = task.after.every((name) => codes.get(name) === 0);
      const fits =
        (task.cores <= cores && task.memoryGb <= memoryGb) ||
        running.size === 0;
      if (!(ready && fits)) continue;
      waiting.splice(waiting.indexOf(task), 1);
      const started = now();
      cores -= task.cores;
      memoryGb -= task.memoryGb;
      const ran: Promise<void> = run(task)
        .catch(() => 1)
        .then((code) => {
          cores += task.cores;
          memoryGb += task.memoryGb;
          codes.set(task.name, code);
          const tookMs = now() - started;
          outcomes.push({ task, code, startedMs: started - first, tookMs });
          running.delete(ran);
        });
      running.add(ran);
    }
    if (running.size > 0) {
      await Promise.race(running);
    } else {
      // Nothing runs, so what still waits waits on a task that didn't pass.
      for (const task of waiting.splice(0)) {
        const startedMs = now() - first;
        outcomes.push({ task, code: "skipped", startedMs, tookMs: 0 });
      }
    }
  }
  await Promise.all(running);
  return outcomes;
}

/**
 * Verifies what a branch changed in a root's workspaces, as
 * `tools/verify-changed.mjs` does, and returns the code to exit with: 1
 * where a task failed or was skipped, and 2 for a command line it can't
 * read or a base git can't find.
 */
export async function runVerifyChanged(
  args: readonly string[],
  root: string,
  {
    print = CONSOLE.print,
    printError = CONSOLE.printError,
    cores = availableParallelism(),
    freeMemoryGb = process.availableMemory() / 1e9,
    env = process.env,
    run = runCommand,
    now,
  }: VerifyIo = {},
): Promise<number> {
  const printer = { print, printError };
  const read = readArgs(args, {
    options: {
      base: { type: "string" },
      coverage: { type: "boolean" },
      "dry-run": { type: "boolean" },
    },
    usage: USAGE,
  });
  if (isStop(read)) return stopWith(read, printer);
  const base = read.values.base ?? "origin/main";
  let files: string[];
  try {
    files = await changedSince(root, base);
  } catch (error) {
    const problem = error instanceof Error ? error.message : String(error);
    return stopWith(misread(problem, USAGE), printer);
  }
  const prefix = (await git(root, "rev-parse", "--show-prefix")).trim();
  const workspaces = declaredWorkspaces(root);
  const reach = reachOf(workspaces, root, prefix, files);
  print(reachWords(reach, base));
  const budget = {
    cores,
    memoryGb: Math.max(0, Math.floor((freeMemoryGb - HEADROOM_GB) * 10) / 10),
  };
  const tasks = tasksOf(workspaces, root, reach.names, {
    coverage: read.values.coverage === true,
    budget,
  });
  const timesFile = join(root, TIMES_FILE);
  const times = readTimes(timesFile);
  const secondsOf = (task: Task): number =>
    times[task.name] ??
    GUESSED_SECONDS[scriptOf(task)] ??
    GUESSED_OTHERWISE_SECONDS;
  if (read.values["dry-run"] === true) {
    print(`The budget: ${coresIn(budget.cores)} and ${budget.memoryGb} GB.`);
    for (const task of inOrder(tasks, secondsOf)) {
      const after =
        task.after.length > 0 ? `, after ${task.after.join(", ")}` : "";
      print(
        `${task.name}: ${task.command}, on ${coresIn(task.cores)} and ${task.memoryGb} GB${after}`,
      );
    }
    return 0;
  }
  const testsEnv = compileCached(env, root);
  const outcomes = await runTasks(
    tasks,
    budget,
    secondsOf,
    (task) =>
      printedRun(
        task.name,
        () =>
          run(
            task.command,
            task.folder,
            task.keepsCompileCache ? testsEnv : env,
          ),
        print,
      ),
    now,
  );
  for (const { task, code, tookMs } of outcomes) {
    if (code === 0) times[task.name] = Math.round(tookMs / 100) / 10;
  }
  writeTimes(timesFile, times);
  const rows = outcomes.map(({ task, code, startedMs, tookMs }) => ({
    name: task.name,
    startedMs,
    tookMs,
    note: noteOf(code),
  }));
  for (const line of timesTable("Task", rows)) print(line);
  const failed = outcomes.filter(({ code }) => code !== 0);
  if (failed.length === 0) return 0;
  printError(
    `\nFailed or skipped: ${failed.map(({ task }) => task.name).join(", ")}.`,
  );
  return 1;
}

/**
 * Returns the tasks a workspace's step waits on: a game's layout check its
 * build, and the site's build the games' builds that run, `gamesBuilt`.
 */
function afterOf(
  workspace: DeclaredWorkspace,
  step: Step,
  gamesBuilt: readonly DeclaredWorkspace[],
): string[] {
  if (step === "check:layout") return [`${workspace.name} build`];
  if (step === "build") return gamesBuilt.map(({ name }) => `${name} build`);
  return [];
}

/** Returns what the runner says of a reach: why every workspace is verified, or which are. */
function reachWords({ names, everything }: Reach, base: string): string {
  if (everything !== undefined) {
    return `${everything} changed since ${base}, which every workspace reads, so every workspace is verified.`;
  }
  if (names.size === 0) {
    return `No workspace changed since ${base}, so only the root's checks run.`;
  }
  return `What changed since ${base} reaches ${[...names].sort().join(", ")}.`;
}

/** Returns every workspace, as a reach, for the file that reaches them all. */
function everyOf(
  workspaces: readonly DeclaredWorkspace[],
  file: string,
): Reach {
  return {
    names: new Set(workspaces.map(({ name }) => name)),
    everything: file,
  };
}

/** Returns tasks in the order the runner starts them: the longest way to the end first. */
function inOrder(
  tasks: readonly Task[],
  secondsOf: (task: Task) => number,
): Task[] {
  const ways = new Map<string, number>();
  const wayOf = (task: Task): number => {
    const known = ways.get(task.name);
    if (known !== undefined) return known;
    const next = tasks.filter(({ after }) => after.includes(task.name));
    const way = secondsOf(task) + Math.max(0, ...next.map(wayOf));
    ways.set(task.name, way);
    return way;
  };
  return [...tasks].sort((a, b) => wayOf(b) - wayOf(a));
}

/** Returns the script a task runs, the last word of its name. */
function scriptOf(task: Task): string {
  return task.name.slice(task.name.lastIndexOf(" ") + 1);
}

/** Returns what the table says after a task that didn't pass. */
function noteOf(code: number | "skipped"): string {
  if (code === 0) return "";
  return code === "skipped" ? "skipped" : `exited with ${code}`;
}

/** Returns a count of cores in words, such as "1 core" or "8 cores". */
function coresIn(count: number): string {
  return count === 1 ? "1 core" : `${String(count)} cores`;
}

/** Returns a path with `/` between its parts, as git writes one. */
function slashed(path: string): string {
  return path.split(sep).join("/");
}

/** Returns git's output for a command in a folder. */
async function git(folder: string, ...args: string[]): Promise<string> {
  const { stdout } = await promisify(execFile)("git", args, {
    cwd: folder,
    maxBuffer: 1 << 26,
  });
  return stdout;
}

/** Returns the paths in git's output of names each ended by a NUL (`-z`). */
function namesIn(output: string): string[] {
  return output.split("\0").filter((name) => name !== "");
}

/**
 * Returns how long each task took when it last passed, in seconds, by its
 * name, or nothing where none are kept or the file can't be read.
 */
function readTimes(file: string): Record<string, number> {
  try {
    const read: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (typeof read !== "object" || read === null) return {};
    return Object.fromEntries(
      Object.entries(read).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  } catch {
    return {};
  }
}

/** Writes how long each task took when it last passed, in seconds, by its name. */
function writeTimes(
  file: string,
  times: Readonly<Record<string, number>>,
): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(times, null, 2)}\n`);
}
