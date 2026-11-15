import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { type Env, recordingPrinter } from "./script.ts";
import {
  type Budget,
  type Task,
  type TaskOptions,
  changedSince,
  reachOf,
  runTasks,
  runVerifyChanged,
  tasksOf,
} from "./verify.ts";
import type { DeclaredWorkspace, Ran } from "./workspaces.ts";

/** Where the runner keeps its times, from the root's folder. */
const TIMES = "node_modules/.cache/fz-verify/times.json";

/** Folders made for a spec, removed after it. */
const made: string[] = [];

afterEach(async () => {
  await Promise.all(
    made
      .splice(0)
      .map((folder) =>
        rm(folder, { recursive: true, force: true, maxRetries: 10 }),
      ),
  );
});

/** Writes files, each a path and its text, into a folder of their own, and returns it. */
async function folderOf(
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "fz-verify-"));
  made.push(folder);
  await writeFiles(folder, files);
  return folder;
}

/** Writes files, each a path and its text, into a folder. */
async function writeFiles(
  folder: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(folder, path)), { recursive: true });
    await writeFile(join(folder, path), text);
  }
}

/** Runs git in a folder, as a spec's author, and returns what it printed. */
function git(folder: string, ...args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.name=Spec", "-c", "user.email=spec@example.com", ...args],
    { cwd: folder, encoding: "utf8" },
  );
}

/**
 * Returns a repository of files committed on `main`, checked out on a
 * branch of its own, `work`.
 */
async function repositoryOf(
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const top = await folderOf(files);
  git(top, "init", "--quiet", "--initial-branch=main");
  git(top, "add", "--all");
  git(top, "commit", "--quiet", "--message", "Start");
  git(top, "switch", "--quiet", "--create", "work");
  return top;
}

/** Commits every change in a repository. */
function commitAll(top: string, message: string): void {
  git(top, "add", "--all");
  git(top, "commit", "--quiet", "--message", message);
}

/** Returns a workspace of a root's, with its scripts and what it depends on. */
function workspaceOf(
  root: string,
  folder: string,
  scripts: readonly string[],
  dependsOn: readonly string[] = [],
): DeclaredWorkspace {
  return {
    name: folder.startsWith("lib/")
      ? `@fz/${basename(folder)}`
      : basename(folder),
    folder: join(root, folder),
    scripts,
    dependsOn,
  };
}

const LIBRARY = ["lint", "typecheck", "test", "test:coverage"];
const GAME = [...LIBRARY, "build", "check:layout"];
const SITE_SCRIPTS = [...LIBRARY, "build"];

/**
 * Returns a root's workspaces: two libraries, the second on the first, two
 * games on them, and the site on the second library.
 */
function workspacesIn(root: string): DeclaredWorkspace[] {
  return [
    workspaceOf(root, "lib/core", LIBRARY),
    workspaceOf(root, "lib/ui", LIBRARY, ["@fz/core"]),
    workspaceOf(root, "games/snake", GAME, ["@fz/core", "@fz/ui"]),
    workspaceOf(root, "games/snake-two", GAME, ["@fz/core"]),
    workspaceOf(root, "site", SITE_SCRIPTS, ["@fz/ui"]),
  ];
}

/** The root's folder, which lies in its repository at `frontend/`, for the specs that need no files. */
const ROOT = join(tmpdir(), "repository", "frontend");

/** Returns the names a change to some files reaches, sorted. */
function reachedBy(...files: string[]): string[] {
  return [
    ...reachOf(workspacesIn(ROOT), ROOT, "frontend/", files).names,
  ].sort();
}

/** Options for `tasksOf()` on a budget of some cores, and memory enough. */
function optionsOn(cores: number): TaskOptions {
  return { coverage: false, budget: { cores, memoryGb: 64 } };
}

/** A budget roomy enough that only the cores bound it, for the specs of tasks. */
const ROOMY: Budget = { cores: 8, memoryGb: 64 };

/**
 * Returns a task of a name, on a core and a GB unless given, waiting on
 * nothing unless given.
 */
function taskOf(
  name: string,
  {
    cores = 1,
    memoryGb = 1,
    after = [],
  }: { cores?: number; memoryGb?: number; after?: readonly string[] } = {},
): Task {
  return {
    name,
    folder: "/",
    command: name,
    cores,
    memoryGb,
    after,
    keepsCompileCache: false,
  };
}

/** Returns the names of tasks in the order they ran, from their outcomes. */
function startedInOrder(
  outcomes: readonly { task: Task; startedMs: number }[],
): string[] {
  return [...outcomes]
    .sort((a, b) => a.startedMs - b.startedMs)
    .map(({ task }) => task.name);
}

describe("changedSince", () => {
  it("finds the files the branch's commits changed since it left the base", async () => {
    const top = await repositoryOf({ "a.txt": "a", "b.txt": "b" });
    await writeFiles(top, { "a.txt": "changed" });
    commitAll(top, "Change a");

    expect(await changedSince(top, "main")).toEqual(["a.txt"]);
  });

  it("leaves out what the base changed after the branch left it", async () => {
    const top = await repositoryOf({ "a.txt": "a", "b.txt": "b" });
    git(top, "switch", "--quiet", "main");
    await writeFiles(top, { "b.txt": "changed on main" });
    commitAll(top, "Change b");
    git(top, "switch", "--quiet", "work");
    await writeFiles(top, { "a.txt": "changed" });
    commitAll(top, "Change a");

    expect(await changedSince(top, "main")).toEqual(["a.txt"]);
  });

  it("finds what is staged, unstaged and untracked, but not what git ignores", async () => {
    const top = await repositoryOf({
      ".gitignore": "ignored.txt\n",
      "staged.txt": "",
      "unstaged.txt": "",
    });
    await writeFiles(top, {
      "staged.txt": "staged",
      "unstaged.txt": "unstaged",
      "untracked.txt": "",
      "ignored.txt": "",
    });
    git(top, "add", "staged.txt");

    expect(await changedSince(top, "main")).toEqual([
      "staged.txt",
      "unstaged.txt",
      "untracked.txt",
    ]);
  });

  it("finds a renamed file under both its names, and a deleted one", async () => {
    const top = await repositoryOf({ "old.txt": "moved", "gone.txt": "" });
    git(top, "mv", "old.txt", "new.txt");
    git(top, "rm", "--quiet", "gone.txt");
    commitAll(top, "Move and delete");

    expect(await changedSince(top, "main")).toEqual([
      "gone.txt",
      "new.txt",
      "old.txt",
    ]);
  });

  it("finds the files from the repository's root, run from a folder in it", async () => {
    const top = await repositoryOf({ "frontend/a.txt": "a" });
    await writeFiles(top, { "frontend/a.txt": "changed" });

    expect(await changedSince(join(top, "frontend"), "main")).toEqual([
      "frontend/a.txt",
    ]);
  });

  it("finds nothing on a branch that changed nothing", async () => {
    const top = await repositoryOf({ "a.txt": "a" });

    expect(await changedSince(top, "main")).toEqual([]);
  });

  it("throws where the branch shares no commit with the base, saying to fetch it, with git's error as its cause", async () => {
    const top = await repositoryOf({ "a.txt": "a" });

    const thrown: unknown = await changedSince(top, "origin/main").catch(
      (error: unknown) => error,
    );

    expect(thrown).toMatchObject({
      message:
        "Found no commit HEAD shares with origin/main; fetch it, or name another with --base.",
      cause: expect.any(Error) as unknown,
    });
  });

  it("finds a file whose name git would quote, by its name", async () => {
    const top = await repositoryOf({ "a.txt": "a" });
    await writeFiles(top, { "naïve name.txt": "" });

    expect(await changedSince(top, "main")).toEqual(["naïve name.txt"]);
  });

  it("finds the files from the repository's root, whatever diff.relative says", async () => {
    const top = await repositoryOf({
      "frontend/a.txt": "a",
      "docs/b.txt": "b",
    });
    git(top, "config", "diff.relative", "true");
    await writeFiles(top, { "docs/b.txt": "changed" });
    commitAll(top, "Change b");

    expect(await changedSince(join(top, "frontend"), "main")).toEqual([
      "docs/b.txt",
    ]);
  });

  it("finds what is untracked outside the folder it is run from", async () => {
    const top = await repositoryOf({ "frontend/a.txt": "a" });
    await writeFiles(top, { "docs/new.txt": "" });

    expect(await changedSince(join(top, "frontend"), "main")).toEqual([
      "docs/new.txt",
    ]);
  });
});

describe("reachOf", () => {
  it("reaches the workspace a changed file is in", () => {
    expect(reachedBy("frontend/games/snake/src/board.ts")).toEqual(["snake"]);
  });

  it("reaches a library's every dependent, through the libraries between", () => {
    expect(reachedBy("frontend/lib/core/src/random.ts")).toEqual([
      "@fz/core",
      "@fz/ui",
      "site",
      "snake",
      "snake-two",
    ]);
  });

  it("tells a workspace from another whose folder starts with its name", () => {
    expect(reachedBy("frontend/games/snake-two/src/board.ts")).toEqual([
      "snake-two",
    ]);
  });

  it.each([
    "frontend/yarn.lock",
    "frontend/package.json",
    "frontend/.yarnrc.yml",
    ".node-version",
  ])("reaches every workspace from %s, naming it", (file) => {
    const reach = reachOf(workspacesIn(ROOT), ROOT, "frontend/", [
      "frontend/games/snake/src/board.ts",
      file,
    ]);

    expect({ names: reach.names.size, everything: reach.everything }).toEqual({
      names: 5,
      everything: file,
    });
  });

  it.each([
    "frontend/tools/run-tests.mjs",
    "frontend/eslint.config.js",
    "frontend/yarn.config.cjs",
    "frontend/tsconfig.scripts.json",
    "frontend/AGENTS.md",
    "frontend/games/AGENTS.md",
    "frontend/games/CLAUDE.md",
    "frontend/games/snake/AGENTS.md",
    "frontend/games/snake/.agents/skills/snake-testing/SKILL.md",
    ".agents/skills/fuzzley-ui/SKILL.md",
    ".github/workflows/verify.yml",
    "docs/operations.md",
  ])(
    "reaches no workspace from %s, which only the root's checks read",
    (file) => {
      expect(reachedBy(file)).toEqual([]);
    },
  );

  it("matches files by their paths in the repository, whatever the root's own path is spelt as", () => {
    const root = join(tmpdir(), "Elsewhere", "FRONTEND");

    const reach = reachOf(workspacesIn(root), root, "frontend/", [
      "frontend/games/snake/src/board.ts",
    ]);

    expect([...reach.names]).toEqual(["snake"]);
  });

  it("reaches what a root at the repository's own root holds, with no prefix", () => {
    const reach = reachOf(workspacesIn(ROOT), ROOT, "", [
      "games/snake/src/board.ts",
    ]);

    expect([...reach.names]).toEqual(["snake"]);
  });
});

describe("tasksOf", () => {
  it("runs the root's lint, typecheck and Prettier's check on a core each, whatever changed", () => {
    const tasks = tasksOf(workspacesIn(ROOT), ROOT, new Set(), optionsOn(8));

    expect(tasks).toEqual(
      ["lint:root", "typecheck:root", "prettier:check"].map((script) => ({
        name: `root ${script}`,
        folder: ROOT,
        command: `yarn run ${script}`,
        cores: 1,
        memoryGb: 1,
        after: [],
        keepsCompileCache: false,
      })),
    );
  });

  it("runs each step a workspace has a script for, its tests on three quarters of the cores, a GB a worker", () => {
    const tasks = tasksOf(
      workspacesIn(ROOT),
      ROOT,
      new Set(["@fz/ui"]),
      optionsOn(24),
    );

    expect(
      tasks
        .slice(3)
        .map(({ name, command, cores, memoryGb }) => [
          name,
          command,
          cores,
          memoryGb,
        ]),
    ).toEqual([
      ["@fz/ui lint", "yarn run lint", 1, 2],
      ["@fz/ui typecheck", "yarn run typecheck", 2, 1],
      ["@fz/ui test", "yarn run test --maxWorkers=18", 18, 18],
    ]);
  });

  it("gives the tests no more workers than three quarters of the memory holds", () => {
    const tasks = tasksOf(workspacesIn(ROOT), ROOT, new Set(["@fz/ui"]), {
      ...optionsOn(24),
      budget: { cores: 24, memoryGb: 8 },
    });

    expect(
      tasks.find(({ keepsCompileCache }) => keepsCompileCache)?.command,
    ).toBe("yarn run test --maxWorkers=6");
  });

  it.each([
    [24, ["@fz/core", "@fz/ui", "snake", "snake-two", "site"], 4],
    [4, ["@fz/core", "@fz/ui"], 2],
  ])(
    "shares the tests' cores of %i out among the suites, four at most, two workers each at least",
    (cores, names, workers) => {
      const tasks = tasksOf(
        workspacesIn(ROOT),
        ROOT,
        new Set(names),
        optionsOn(cores),
      );

      expect(
        new Set(
          tasks
            .filter(({ keepsCompileCache }) => keepsCompileCache)
            .map(({ cores: c }) => c),
        ),
      ).toEqual(new Set([workers]));
    },
  );

  it("runs test:coverage where asked", () => {
    const tasks = tasksOf(workspacesIn(ROOT), ROOT, new Set(["@fz/core"]), {
      ...optionsOn(8),
      coverage: true,
    });

    expect(
      tasks.find(({ name }) => name === "@fz/core test:coverage")?.command,
    ).toBe("yarn run test:coverage --maxWorkers=6");
  });

  it("checks a game's layout after its build, and builds the site after the games it builds", () => {
    const tasks = tasksOf(
      workspacesIn(ROOT),
      ROOT,
      new Set(["snake"]),
      optionsOn(8),
    );

    expect(
      tasks
        .filter(({ after }) => after.length > 0)
        .map(({ name, after }) => [name, after]),
    ).toEqual([
      ["snake check:layout", ["snake build"]],
      ["site build", ["snake build", "snake-two build"]],
    ]);
  });

  it("builds every game where the site builds, so it takes no build another branch left", () => {
    const tasks = tasksOf(
      workspacesIn(ROOT),
      ROOT,
      new Set(["site"]),
      optionsOn(8),
    );

    expect(
      tasks
        .filter(({ name }) => name.endsWith(" build"))
        .map(({ name, after }) => [name, after]),
    ).toEqual([
      ["snake build", []],
      ["snake-two build", []],
      ["site build", ["snake build", "snake-two build"]],
    ]);
  });

  it("builds nothing for a library no game or site is verified beside", () => {
    const workspaces = workspacesIn(ROOT).filter(
      ({ name }) => name === "@fz/core",
    );

    const tasks = tasksOf(
      workspaces,
      ROOT,
      new Set(["@fz/core"]),
      optionsOn(8),
    );

    expect(tasks.some(({ name }) => name.endsWith(" build"))).toBe(false);
  });
});

describe("runTasks", () => {
  /** Runs tasks, each taking as many ticks as its name's number, on a fake clock. */
  async function runTimed(
    tasks: readonly Task[],
    budget: Budget,
    codes: Readonly<Record<string, number>> = {},
  ): Promise<{
    readonly mostCores: number;
    readonly mostMemoryGb: number;
    readonly outcomes: Awaited<ReturnType<typeof runTasks>>;
  }> {
    let clock = 0;
    let cores = 0;
    let memoryGb = 0;
    let mostCores = 0;
    let mostMemoryGb = 0;
    const ticksOf = (task: Task): number =>
      Number(/\d+/.exec(task.name)?.[0] ?? 1);
    const outcomes = await runTasks(
      tasks,
      budget,
      ticksOf,
      async (task) => {
        cores += task.cores;
        memoryGb += task.memoryGb;
        mostCores = Math.max(mostCores, cores);
        mostMemoryGb = Math.max(mostMemoryGb, memoryGb);
        for (let tick = ticksOf(task); tick > 0; tick--) {
          await new Promise((resolve) => setImmediate(resolve));
          clock += 1;
        }
        cores -= task.cores;
        memoryGb -= task.memoryGb;
        return codes[task.name] ?? 0;
      },
      () => clock,
    );
    return { mostCores, mostMemoryGb, outcomes };
  }

  it("never claims more cores at once than the budget", async () => {
    const tasks = ["a3", "b2", "c4", "d1", "e2"].map((name) =>
      taskOf(name, { cores: 2 }),
    );

    const { mostCores } = await runTimed(tasks, { cores: 4, memoryGb: 64 });

    expect(mostCores).toBe(4);
  });

  it("never claims more memory at once than the budget", async () => {
    const tasks = ["a3", "b2", "c4", "d1", "e2"].map((name) =>
      taskOf(name, { memoryGb: 3 }),
    );

    const { mostMemoryGb } = await runTimed(tasks, { cores: 8, memoryGb: 7 });

    expect(mostMemoryGb).toBe(6);
  });

  it("starts the tasks with the longest way to the end first", async () => {
    const tasks = [taskOf("lint 2"), taskOf("test 5"), taskOf("typecheck 3")];

    const { outcomes } = await runTimed(tasks, { cores: 1, memoryGb: 64 });

    expect(startedInOrder(outcomes)).toEqual([
      "test 5",
      "typecheck 3",
      "lint 2",
    ]);
  });

  it("counts a task's way to the end through those that wait on it", async () => {
    const tasks = [
      taskOf("lint 5"),
      taskOf("build 1"),
      taskOf("layout 6", { after: ["build 1"] }),
    ];

    const { outcomes } = await runTimed(tasks, { cores: 1, memoryGb: 64 });

    expect(startedInOrder(outcomes)).toEqual(["build 1", "layout 6", "lint 5"]);
  });

  it("starts a task too big for the budget once nothing else runs, and nothing beside it", async () => {
    const tasks = [taskOf("small 1"), taskOf("big 2", { cores: 8 })];

    const { mostCores, outcomes } = await runTimed(tasks, {
      cores: 4,
      memoryGb: 64,
    });

    expect({ mostCores, codes: outcomes.map(({ code }) => code) }).toEqual({
      mostCores: 8,
      codes: [0, 0],
    });
  });

  it("skips a task whose prerequisite failed, and those waiting on it, running the rest", async () => {
    const tasks = [
      taskOf("build 1"),
      taskOf("layout 1", { after: ["build 1"] }),
      taskOf("site 1", { after: ["layout 1"] }),
      taskOf("lint 1"),
    ];

    const { outcomes } = await runTimed(tasks, ROOMY, { "build 1": 1 });

    expect(
      Object.fromEntries(outcomes.map(({ task, code }) => [task.name, code])),
    ).toEqual({
      "build 1": 1,
      "layout 1": "skipped",
      "site 1": "skipped",
      "lint 1": 0,
    });
  });

  it("counts a task that can't start as failed", async () => {
    const outcomes = await runTasks(
      [taskOf("broken")],
      ROOMY,
      () => 1,
      () => Promise.reject(new Error("no shell")),
    );

    expect(outcomes.map(({ code }) => code)).toEqual([1]);
  });
});

describe("runVerifyChanged", () => {
  /** Returns a repository whose frontend holds a library, a game on it and the site, on a branch of its own. */
  async function frontendRepository(): Promise<{ top: string; root: string }> {
    const packageOf = (
      name: string,
      scripts: readonly string[],
      deps: Readonly<Record<string, string>> = {},
    ): string =>
      JSON.stringify({
        name,
        dependencies: deps,
        scripts: Object.fromEntries(scripts.map((s) => [s, "true"])),
      });
    const top = await repositoryOf({
      "frontend/.gitignore": "node_modules/\n",
      "frontend/package.json": JSON.stringify({
        workspaces: ["lib/*", "site", "games/*"],
      }),
      "frontend/lib/core/package.json": packageOf("@fz/core", LIBRARY),
      "frontend/lib/core/src/index.ts": "",
      "frontend/games/snake/package.json": packageOf("snake", GAME, {
        "@fz/core": "workspace:*",
      }),
      "frontend/games/snake/src/board.ts": "",
      "frontend/site/package.json": packageOf("site", SITE_SCRIPTS),
    });
    return { top, root: join(top, "frontend") };
  }

  /** Returns a stand-in for the shell that records each command and its folder, and exits with 0 unless told. */
  function fakeShell(codes: Readonly<Record<string, number>> = {}): {
    readonly run: (command: string, folder: string, env: Env) => Promise<Ran>;
    readonly ran: { command: string; folder: string; env: Env }[];
  } {
    const ran: { command: string; folder: string; env: Env }[] = [];
    return {
      ran,
      run: (command, folder, env) => {
        ran.push({ command, folder, env });
        const key = `${basename(folder)} ${command}`;
        return Promise.resolve({ code: codes[key] ?? 0, output: key });
      },
    };
  }

  it("runs the root's checks and each step of what the change reaches", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/games/snake/src/board.ts": "changed" });
    const shell = fakeShell();

    const code = await runVerifyChanged(["--base", "main"], root, {
      ...recordingPrinter(),
      cores: 8,
      freeMemoryGb: 35,
      env: { CI: "true" },
      run: shell.run,
    });

    expect({
      code,
      ran: shell.ran
        .map(({ command, folder }) => `${basename(folder)} ${command}`)
        .sort(),
    }).toEqual({
      code: 0,
      ran: [
        "frontend yarn run lint:root",
        "frontend yarn run prettier:check",
        "frontend yarn run typecheck:root",
        "site yarn run build",
        "snake yarn run build",
        "snake yarn run check:layout",
        "snake yarn run lint",
        "snake yarn run test --maxWorkers=6",
        "snake yarn run typecheck",
      ],
    });
  });

  it("says what the change reaches, and prints each task's output and the table", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/lib/core/src/index.ts": "changed" });
    const printer = recordingPrinter();

    await runVerifyChanged(["--base", "main"], root, {
      ...printer,
      cores: 8,
      run: fakeShell().run,
      now: () => 0,
    });

    expect(printer.out[0]).toBe(
      "What changed since main reaches @fz/core, snake.",
    );
    expect(printer.out).toContain("➤ snake lint exited with 0");
    expect(printer.out).toContain("snake yarn run lint");
    expect(printer.out.at(-1)).toMatch(/^ {4}0\.0 s {4}0\.0 s {2}\S/);
  });

  it("runs only the root's checks where no workspace changed, saying so", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "docs/notes.md": "notes" });
    const printer = recordingPrinter();
    const shell = fakeShell();

    await runVerifyChanged(["--base", "main"], root, {
      ...printer,
      run: shell.run,
    });

    expect({ said: printer.out[0], ran: shell.ran.length }).toEqual({
      said: "No workspace changed since main, so only the root's checks run.",
      ran: 3,
    });
  });

  it("runs the tests with Node's compile cache off CI", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/lib/core/src/index.ts": "changed" });
    const shell = fakeShell();

    await runVerifyChanged(["--base", "main"], root, {
      ...recordingPrinter(),
      env: {},
      run: shell.run,
    });

    expect(
      shell.ran
        .filter(({ command }) => command.includes("test"))
        .map(({ env }) => env["NODE_COMPILE_CACHE"]),
    ).toEqual([
      join(root, "node_modules/.cache/node-compile-cache"),
      join(root, "node_modules/.cache/node-compile-cache"),
    ]);
  });

  it("runs test:coverage for --coverage, without Node's compile cache", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/lib/core/src/index.ts": "changed" });
    const shell = fakeShell();

    await runVerifyChanged(["--base", "main", "--coverage"], root, {
      ...recordingPrinter(),
      env: {},
      run: shell.run,
    });

    expect(
      shell.ran
        .filter(({ command }) => command.includes("test"))
        .map(({ command, env }) => [
          command.split(" ")[2],
          env["NODE_COMPILE_CACHE"],
        ]),
    ).toEqual([
      ["test:coverage", undefined],
      ["test:coverage", undefined],
    ]);
  });

  it("fails where a task fails, skipping what waits on it, and names both", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/games/snake/src/board.ts": "changed" });
    const printer = recordingPrinter();

    const code = await runVerifyChanged(["--base", "main"], root, {
      ...printer,
      run: fakeShell({ "snake yarn run build": 1 }).run,
    });

    expect({ code, err: printer.err }).toEqual({
      code: 1,
      err: [
        "\nFailed or skipped: snake build, snake check:layout, site build.",
      ],
    });
  });

  it("keeps how long each task took when it passed, in seconds, and none of a task that failed", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/lib/core/src/index.ts": "changed" });
    const shell = fakeShell({ "snake yarn run build": 1 });
    let clock = 0;

    await runVerifyChanged(["--base", "main"], root, {
      ...recordingPrinter(),
      run: (command, folder, env) => {
        if (basename(folder) === "snake" && command === "yarn run lint") {
          clock += 2500;
        }
        return shell.run(command, folder, env);
      },
      now: () => clock,
    });

    const kept = JSON.parse(
      await readFile(join(root, TIMES), "utf8"),
    ) as Record<string, number>;
    expect({ lint: kept["snake lint"], build: kept["snake build"] }).toEqual({
      lint: 2.5,
      build: undefined,
    });
  });

  it("starts first the task whose kept time is the longest", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, {
      "frontend/lib/core/src/index.ts": "changed",
      [`frontend/${TIMES}`]: JSON.stringify({ "@fz/core typecheck": 600 }),
    });
    const printer = recordingPrinter();

    await runVerifyChanged(["--base", "main", "--dry-run"], root, {
      ...printer,
      run: fakeShell().run,
    });

    expect(printer.out[2]).toMatch(/^@fz\/core typecheck: /);
  });

  it("goes by its guesses where the kept times can't be read, as where none are kept", async () => {
    const dryRunWith = async (
      times: Record<string, string>,
    ): Promise<readonly string[]> => {
      const { top, root } = await frontendRepository();
      await writeFiles(top, {
        "frontend/lib/core/src/index.ts": "changed",
        ...times,
      });
      const printer = recordingPrinter();
      await runVerifyChanged(["--base", "main", "--dry-run"], root, {
        ...printer,
        cores: 8,
        freeMemoryGb: 16,
        run: fakeShell().run,
      });
      return printer.out;
    };
    const none = await dryRunWith({});

    const unreadable = await dryRunWith({ [`frontend/${TIMES}`]: "not JSON" });

    expect(unreadable).toEqual(none);
  });

  it("says which file reaches every workspace where one does", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/yarn.lock": "changed" });
    const printer = recordingPrinter();

    await runVerifyChanged(["--base", "main", "--dry-run"], root, {
      ...printer,
      run: fakeShell().run,
    });

    expect(printer.out[0]).toBe(
      "frontend/yarn.lock changed since main, which every workspace reads, so every workspace is verified.",
    );
  });

  it("goes by its guesses where the kept times aren't an object of them", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, {
      "frontend/lib/core/src/index.ts": "changed",
      [`frontend/${TIMES}`]: "5",
    });
    const printer = recordingPrinter();

    const code = await runVerifyChanged(["--base", "main", "--dry-run"], root, {
      ...printer,
      cores: 1,
      freeMemoryGb: 16,
      run: fakeShell().run,
    });

    expect({ code, budget: printer.out[1] }).toEqual({
      code: 0,
      budget: "The budget: 1 core and 13 GB.",
    });
  });

  it("says what it would run for --dry-run, and runs nothing", async () => {
    const { top, root } = await frontendRepository();
    await writeFiles(top, { "frontend/lib/core/src/index.ts": "changed" });
    const printer = recordingPrinter();
    const shell = fakeShell();

    const code = await runVerifyChanged(["--base", "main", "--dry-run"], root, {
      ...printer,
      cores: 8,
      freeMemoryGb: 16,
      run: shell.run,
    });

    expect({ code, ran: shell.ran.length }).toEqual({ code: 0, ran: 0 });
    expect(printer.out.slice(1, 2)).toEqual(["The budget: 8 cores and 13 GB."]);
    expect(printer.out).toContain(
      "snake check:layout: yarn run check:layout, on 2 cores and 1.5 GB, after snake build",
    );
  });

  it("refuses a base git can't find, with its usage, running nothing", async () => {
    const { root } = await frontendRepository();
    const printer = recordingPrinter();
    const shell = fakeShell();

    const code = await runVerifyChanged(["--base", "nowhere"], root, {
      ...printer,
      run: shell.run,
    });

    expect({ code, ran: shell.ran.length }).toEqual({ code: 2, ran: 0 });
    expect(printer.err.join("\n")).toMatch(
      /^Found no commit HEAD shares with nowhere[^]*Usage: yarn verify:changed/,
    );
  });
});
