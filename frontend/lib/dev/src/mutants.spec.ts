import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MUTANT_LIMIT_MS,
  type Mutant,
  type MutantsIo,
  PASS_LIMIT_MS,
  type RunEnd,
  readMutants,
  runMutants,
  runUntil,
} from "./mutants.ts";
import { recordingPrinter } from "./script.ts";
import { shellQuoted } from "./workspaces.ts";

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

/** Returns a folder of a spec's own. */
async function freshFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "fz-mutants-"));
  made.push(folder);
  return folder;
}

/** The workspace the specs mutate, from the made-up frontend's folder. */
const WORKSPACE = "games/made-up";

/** The file the specs' mutants change, from the workspace's folder. */
const FILE = "src/cap.ts";

/** What the file holds before a mutant changes it. */
const CAP =
  "export function capped(count: number, most: number): boolean {\n  return count < most;\n}\n";

/** A mutant its specs kill. */
const BOUND: Mutant = {
  name: "the cap's bound",
  file: FILE,
  find: "count < most",
  replace: "count <= most",
  project: "pure",
  folder: "src/rules",
};

/** A mutant its specs let by. */
const ALWAYS: Mutant = {
  ...BOUND,
  name: "the cap always",
  find: "return count < most;",
  replace: "return true;",
};

/** A mutant whose text the file doesn't hold. */
const ABSENT: Mutant = {
  ...BOUND,
  name: "a text not there",
  find: "count > most",
};

/** Returns a mutant of the folder given, naming no project. */
function unprojected(
  { name, file, find, replace }: Mutant,
  folder: string,
): Mutant {
  return { name, file, find, replace, folder };
}

/** Returns a made-up frontend's folder, its one workspace holding {@link CAP}. */
async function frontend(): Promise<string> {
  const root = await freshFolder();
  await mkdir(join(root, WORKSPACE, "src"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ workspaces: ["games/*"] }),
  );
  await writeFile(
    join(root, WORKSPACE, "package.json"),
    JSON.stringify({ name: "made-up" }),
  );
  await writeFile(join(root, WORKSPACE, FILE), CAP);
  return root;
}

/** Returns where a list of mutants is written, in a folder outside the frontend's. */
async function listOf(entries: unknown): Promise<string> {
  const path = join(await freshFolder(), "mutants.json");
  await writeFile(path, JSON.stringify(entries));
  return path;
}

/** A run of specs a fake ran: its command line, its folder, its limit, and the file as it stood then. */
interface FakeRun {
  readonly command: string;
  readonly folder: string;
  readonly limitMs: number;
  readonly text: string;
}

/**
 * Says how a pass's fake specs end for the file as it stands, and what
 * else they do as they run, such as move the clock.
 */
type FakeSpecs = (text: string, limitMs: number, stop: AbortSignal) => RunEnd;

/** Specs that fail where the cap reads `<=`, and pass otherwise. */
const catchingBounds: FakeSpecs = (text) =>
  text.includes("<=") ? "failed" : "passed";

/**
 * Runs a pass over the made-up frontend with fake specs, a queue that lets
 * it go at once and a clock that stands still unless the specs move it,
 * and returns the code it exits with, what it printed, the runs of specs
 * it made, whether it left the queue and what the file holds after it.
 */
async function pass(
  root: string,
  args: readonly string[],
  specs: FakeSpecs = catchingBounds,
  io: MutantsIo = {},
) {
  const printer = recordingPrinter();
  const runs: FakeRun[] = [];
  const queued: string[] = [];
  let left = false;
  const code = await runMutants(args, root, {
    ...printer,
    now: () => 0,
    queue: (folder) => {
      queued.push(folder);
      return Promise.resolve(() => {
        left = true;
      });
    },
    onSignal: () => () => {},
    run: async (command, folder, limitMs, stop) => {
      const text = await readFile(join(folder, FILE), "utf8");
      runs.push({ command, folder, limitMs, text });
      return specs(text, limitMs, stop);
    },
    ...io,
  });
  return {
    code,
    out: printer.out,
    err: printer.err,
    runs,
    queued,
    left,
    after: await readFile(join(root, WORKSPACE, FILE), "utf8"),
  };
}

/** Returns a line of the pass's table. */
function row(verdict: string, name: string): string {
  return `  ${verdict.padEnd("matched more than once".length)}  ${name}`;
}

describe("runMutants", () => {
  it("runs the specs with no mutant in place, then each mutant's with it in its file", async () => {
    const root = await frontend();

    const { runs } = await pass(root, [
      WORKSPACE,
      await listOf([BOUND, ALWAYS]),
    ]);

    expect(runs).toEqual([
      {
        command: "yarn vitest run --project pure src/rules",
        folder: join(root, WORKSPACE),
        limitMs: MUTANT_LIMIT_MS,
        text: CAP,
      },
      {
        command: "yarn vitest run --project pure src/rules",
        folder: join(root, WORKSPACE),
        limitMs: MUTANT_LIMIT_MS,
        text: CAP.replace("count < most", "count <= most"),
      },
      {
        command: "yarn vitest run --project pure src/rules",
        folder: join(root, WORKSPACE),
        limitMs: MUTANT_LIMIT_MS,
        text: CAP.replace("return count < most;", "return true;"),
      },
    ]);
  });

  it("prints each mutant's verdict for the commit's body, and exits with 1 where one wasn't killed", async () => {
    const root = await frontend();

    const { code, out } = await pass(root, [
      WORKSPACE,
      await listOf([BOUND, ALWAYS, ABSENT]),
    ]);

    expect({ code, out }).toEqual({
      code: 1,
      out: [
        "Mutation pass over games/made-up: 3 mutants, 1 killed, 1 survived, 1 matched nothing.",
        "",
        row("killed", "the cap's bound"),
        row("survived", "the cap always"),
        row("matched nothing", "a text not there"),
      ],
    });
  });

  it("exits with 0 where every mutant was killed", async () => {
    const root = await frontend();

    const { code, out } = await pass(root, [WORKSPACE, await listOf([BOUND])]);

    expect({ code, heading: out[0] }).toEqual({
      code: 0,
      heading: "Mutation pass over games/made-up: 1 mutant, 1 killed.",
    });
  });

  it("exits with 1 where a mutant matched nothing, though none survived", async () => {
    const root = await frontend();

    const { code } = await pass(root, [
      WORKSPACE,
      await listOf([BOUND, ABSENT]),
    ]);

    expect(code).toBe(1);
  });

  it("puts each file's bytes back once its mutant's specs have run", async () => {
    const root = await frontend();

    const { after } = await pass(root, [
      WORKSPACE,
      await listOf([BOUND, ALWAYS]),
    ]);

    expect(after).toBe(CAP);
  });

  it("runs nothing for a mutant whose text the file holds more than once", async () => {
    const root = await frontend();
    const twice = { ...BOUND, name: "every most", find: "most" };

    const { runs, out } = await pass(root, [WORKSPACE, await listOf([twice])]);

    expect({ runs: runs.length, verdict: out[2] }).toEqual({
      runs: 1,
      verdict: row("matched more than once", "every most"),
    });
  });

  it("puts a replacement in its text's place as written, `$&` and all", async () => {
    const root = await frontend();
    const dollars = { ...BOUND, replace: "count $& most" };

    const { runs } = await pass(root, [WORKSPACE, await listOf([dollars])]);

    expect(runs[1]?.text).toContain("return count $& most;");
  });

  it("runs each project and folder's specs once with no mutant in place, and a folder with no project as itself", async () => {
    const root = await frontend();
    const view = { ...ALWAYS, folder: "src/view" };

    const { runs } = await pass(root, [
      WORKSPACE,
      await listOf([BOUND, view, ALWAYS, unprojected(ALWAYS, "src/rules")]),
    ]);

    expect(runs.map(({ command }) => command).slice(0, 3)).toEqual([
      "yarn vitest run --project pure src/rules",
      "yarn vitest run --project pure src/view",
      "yarn vitest run src/rules",
    ]);
  });

  it("runs no mutant where the specs fail with none in place, and says which", async () => {
    const root = await frontend();

    const { code, runs, err, out } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND])],
      () => "failed",
    );

    expect({ code, runs: runs.length, err, out }).toEqual({
      code: 1,
      runs: 1,
      err: [
        "yarn vitest run --project pure src/rules fails in games/made-up with no mutant in place, so the pass runs none. Run it there to see why.",
      ],
      out: [],
    });
  });

  it("runs no mutant where the specs with none in place run out of time", async () => {
    const root = await frontend();

    const { code, err } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND])],
      () => "timed out",
    );

    expect({ code, err }).toEqual({
      code: 1,
      err: [
        "yarn vitest run --project pure src/rules runs out of time in games/made-up with no mutant in place, so the pass runs none. Run it there to see why.",
      ],
    });
  });

  it("says a mutant whose specs ran out of their 2 minutes timed out", async () => {
    const root = await frontend();

    const { out } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND])],
      (text) => (text === CAP ? "passed" : "timed out"),
    );

    expect(out[2]).toBe(row("timed out", "the cap's bound"));
  });

  it("runs no mutant once the pass's 20 minutes cut short the specs with none in place, and names each", async () => {
    const root = await frontend();
    let time = 0;
    // The first folder's specs take 19 minutes, so the second's have 1.
    const slow: FakeSpecs = (_, limitMs) => {
      time += limitMs < MUTANT_LIMIT_MS ? limitMs : 19 * 60_000;
      return limitMs < MUTANT_LIMIT_MS ? "timed out" : "passed";
    };

    const { code, err, out } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND, { ...ALWAYS, folder: "src/view" }])],
      slow,
      { now: () => time },
    );

    expect({ code, err, out }).toEqual({
      code: 1,
      err: [],
      out: [
        "Mutation pass over games/made-up: 2 mutants, 2 never ran.",
        "",
        row("never ran", "the cap's bound"),
        row("never ran", "the cap always"),
      ],
    });
  });

  it("runs nothing once the pass's 20 minutes are up, to the millisecond", async () => {
    const root = await frontend();
    let time = 0;
    const tenMinutes: FakeSpecs = (text, limitMs, stop) => {
      time += 10 * 60_000;
      return catchingBounds(text, limitMs, stop);
    };

    const { runs, out } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND, { ...BOUND, name: "too late" }])],
      tenMinutes,
      { now: () => time },
    );

    expect({ runs: runs.length, verdict: out[3] }).toEqual({
      runs: 2,
      verdict: row("never ran", "too late"),
    });
  });

  it("stops at the pass's 20 minutes, the last mutant cut short, and names what it never ran", async () => {
    const root = await frontend();
    let time = 0;
    // Each run takes 9.5 minutes, so the third has 1 left, and the fourth none.
    const slow: FakeSpecs = (text, limitMs) => {
      time += 9.5 * 60_000;
      if (limitMs < MUTANT_LIMIT_MS) return "timed out";
      return catchingBounds(text, limitMs, new AbortController().signal);
    };

    const { runs, out } = await pass(
      root,
      [
        WORKSPACE,
        await listOf([
          BOUND,
          { ...BOUND, name: "cut short" },
          { ...BOUND, name: "too late" },
        ]),
      ],
      slow,
      { now: () => time },
    );

    expect({ limits: runs.map(({ limitMs }) => limitMs), out }).toEqual({
      limits: [MUTANT_LIMIT_MS, MUTANT_LIMIT_MS, PASS_LIMIT_MS - 19 * 60_000],
      out: [
        "Mutation pass over games/made-up: 3 mutants, 1 killed, 2 never ran.",
        "",
        row("killed", "the cap's bound"),
        row("never ran", "cut short"),
        row("never ran", "too late"),
      ],
    });
  });

  it("on a signal, stops the run, puts the file back, names what it never ran and exits with 128 and its number", async () => {
    const root = await frontend();
    let signal: (sent: NodeJS.Signals) => void = () => {};
    let unlistened = false;
    const stopping: FakeSpecs = (text, _, stop) => {
      if (text === CAP) return "passed";
      signal("SIGTERM");
      return stop.aborted ? "stopped" : "failed";
    };

    const { code, out, after, left } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND, ALWAYS])],
      stopping,
      {
        onSignal: (stop) => {
          signal = stop;
          return () => {
            unlistened = true;
          };
        },
      },
    );

    expect({ code, out, after, left, unlistened }).toEqual({
      code: 143,
      out: [
        "Mutation pass over games/made-up: 2 mutants, 2 never ran.",
        "",
        row("never ran", "the cap's bound"),
        row("never ran", "the cap always"),
      ],
      after: CAP,
      left: true,
      unlistened: true,
    });
  });

  it("exits as the first signal it hears says, though another follows", async () => {
    const root = await frontend();
    let signal: (sent: NodeJS.Signals) => void = () => {};
    const stopping: FakeSpecs = () => {
      signal("SIGTERM");
      signal("SIGINT");
      return "stopped";
    };

    const { code } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND])],
      stopping,
      {
        onSignal: (stop) => {
          signal = stop;
          return () => {};
        },
      },
    );

    expect(code).toBe(143);
  });

  it("on a signal while the specs run with no mutant in place, runs no mutant", async () => {
    const root = await frontend();
    let signal: (sent: NodeJS.Signals) => void = () => {};
    const stopping: FakeSpecs = () => {
      signal("SIGINT");
      return "stopped";
    };

    const { code, runs } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND])],
      stopping,
      {
        onSignal: (stop) => {
          signal = stop;
          return () => {};
        },
      },
    );

    expect({ code, runs: runs.length }).toEqual({ code: 130, runs: 1 });
  });

  it("says how many runs it waits for, as that changes, and how long it waited", async () => {
    const root = await frontend();
    let time = 0;

    const { out } = await pass(
      root,
      [WORKSPACE, await listOf([BOUND])],
      catchingBounds,
      {
        now: () => time,
        queue: (_, onWait) => {
          onWait(2);
          onWait(1);
          time = 3_000;
          return Promise.resolve(() => {});
        },
      },
    );

    expect(out.slice(0, 3)).toEqual([
      "Waiting for 2 runs that started first (verify:changed or another script that takes the whole machine).",
      "Waiting for 1 run that started first (verify:changed or another script that takes the whole machine).",
      "Waited 3 s for its turn.",
    ]);
  });

  it("waits by default in the queue its repository's worktrees share, and leaves it once done", async () => {
    const root = await frontend();
    execFileSync("git", ["init", "--quiet"], { cwd: root });

    const code = await runMutants([WORKSPACE, await listOf([BOUND])], root, {
      ...recordingPrinter(),
      onSignal: () => () => {},
      run: async (_, folder) =>
        catchingBounds(
          await readFile(join(folder, FILE), "utf8"),
          MUTANT_LIMIT_MS,
          new AbortController().signal,
        ),
    });

    expect({
      code,
      places: await readdir(join(root, ".git", "fz-verify-queue")),
    }).toEqual({ code: 0, places: [] });
  });

  it("hears by default a signal the process is sent while it runs, and stops hearing once done", async () => {
    const root = await frontend();
    const before = process.listenerCount("SIGTERM");
    let during = 0;

    const code = await runMutants([WORKSPACE, await listOf([BOUND])], root, {
      ...recordingPrinter(),
      queue: () => Promise.resolve(() => {}),
      run: (_, __, ___, stop) => {
        during = process.listenerCount("SIGTERM");
        process.listeners("SIGTERM").at(-1)?.("SIGTERM");
        return Promise.resolve(stop.aborted ? "stopped" : "passed");
      },
    });

    expect({
      code,
      during,
      after: process.listenerCount("SIGTERM"),
    }).toEqual({ code: 143, during: before + 1, after: before });
  });

  it("waits in the queue of the frontend's folder, and leaves it once done", async () => {
    const root = await frontend();

    const { queued, left } = await pass(root, [
      WORKSPACE,
      await listOf([BOUND]),
    ]);

    expect({ queued, left }).toEqual({ queued: [root], left: true });
  });

  it("puts the file back and leaves the queue where its specs can't start", async () => {
    const root = await frontend();
    let left = false;
    const list = await listOf([BOUND]);
    let runs = 0;

    const passed = runMutants([WORKSPACE, list], root, {
      ...recordingPrinter(),
      queue: () =>
        Promise.resolve(() => {
          left = true;
        }),
      onSignal: () => () => {},
      run: () => {
        runs++;
        return runs === 1
          ? Promise.resolve<RunEnd>("passed")
          : Promise.reject(new Error("no shell"));
      },
    });

    await expect(passed).rejects.toThrow("no shell");
    expect({
      left,
      after: await readFile(join(root, WORKSPACE, FILE), "utf8"),
    }).toEqual({ left: true, after: CAP });
  });

  it("prints its usage for --help and exits with 0, running nothing", async () => {
    const root = await frontend();

    const { code, out, queued } = await pass(root, ["--help"]);

    expect({
      code,
      usage: out[0]?.startsWith("Usage: yarn mutants"),
      queued,
    }).toEqual({
      code: 0,
      usage: true,
      queued: [],
    });
  });

  it.each([
    ["no list", () => [WORKSPACE], "Name a workspace and a list of mutants."],
    [
      "more than a list",
      (list: string) => [WORKSPACE, list, "more"],
      "Name a workspace and a list of mutants.",
    ],
    [
      "no workspace there",
      (list: string) => ["games/none", list],
      "games/none is no workspace of the frontend's.",
    ],
    [
      "a folder that is no workspace",
      (list: string) => ["games", list],
      "games is no workspace of the frontend's.",
    ],
    [
      "a workspace's last folder alone",
      (list: string) => ["made-up", list],
      "made-up is no workspace of the frontend's.",
    ],
    [
      "the frontend's own folder",
      (list: string) => [".", list],
      ". is no workspace of the frontend's.",
    ],
    [
      "no list there",
      () => [WORKSPACE, "nowhere.json"],
      "There is no list of mutants at nowhere.json.",
    ],
  ])(
    "exits with 2 for a command line with %s, saying so, without waiting its turn",
    async (_, argsOf: (list: string) => string[], problem) => {
      const root = await frontend();

      const { code, err, queued } = await pass(
        root,
        argsOf(await listOf([BOUND])),
      );

      expect({ code, problem: err[0]?.split("\n")[0], queued }).toEqual({
        code: 2,
        problem,
        queued: [],
      });
    },
  );

  it("exits with 2 for a list it can't read, saying why", async () => {
    const root = await frontend();

    const { code, err } = await pass(root, [
      WORKSPACE,
      await listOf([{ name: "half" }]),
    ]);

    expect({ code, problem: err[0]?.split("\n")[0] }).toEqual({
      code: 2,
      problem:
        "Mutant 1 of the list needs a name, a file, a find, a replace and a folder, and may have a project, each a string.",
    });
  });

  it("exits with 2 for a mutant of a file the workspace hasn't got", async () => {
    const root = await frontend();

    const { code, err } = await pass(root, [
      WORKSPACE,
      await listOf([{ ...BOUND, file: "src/none.ts" }]),
    ]);

    expect({ code, problem: err[0]?.split("\n")[0] }).toEqual({
      code: 2,
      problem: `The mutant "the cap's bound" changes src/none.ts, which games/made-up has no file at.`,
    });
  });
});

describe("readMutants", () => {
  it("says a mutant names a word Windows' shell can't take as one, where it runs there", () => {
    const list = JSON.stringify([{ ...BOUND, folder: "src/100%" }]);

    expect(readMutants(list, "win32")).toBe(
      "Mutant 1 of the list names src/100%, which the shell can't take as one word.",
    );
  });

  it("reads each mutant, its project left out where it names none", () => {
    const rules = unprojected(BOUND, "src/rules");

    expect(readMutants(JSON.stringify([BOUND, rules]))).toEqual([BOUND, rules]);
  });

  it.each([
    ["[", "The list of mutants isn't JSON: "],
    ["{}", "The list of mutants is a JSON array of one mutant at least."],
    ["[]", "The list of mutants is a JSON array of one mutant at least."],
    ['["src/cap.ts"]', "Mutant 1 of the list isn't an object."],
  ])("says what is wrong with %s", (text, problem) => {
    const read = readMutants(text);

    expect(
      typeof read === "string" ? read.slice(0, problem.length) : read,
    ).toBe(problem);
  });

  it.each([
    [
      "a replace that isn't a string",
      { replace: 1 },
      "needs a name, a file, a find, a replace and a folder, and may have a project, each a string.",
    ],
    [
      "a project that isn't a string",
      { project: 2 },
      "needs a name, a file, a find, a replace and a folder, and may have a project, each a string.",
    ],
    ["no name", { name: "" }, "needs a name and a text to find."],
    ["nothing to find", { find: "" }, "needs a name and a text to find."],
    [
      "a file above its workspace",
      { file: "../other/src/cap.ts" },
      "names ../other/src/cap.ts, which isn't a path inside its workspace.",
    ],
    [
      "a folder that is the one above",
      { folder: ".." },
      "names .., which isn't a path inside its workspace.",
    ],
    [
      "an absolute file",
      { file: "/src/cap.ts" },
      "names /src/cap.ts, which isn't a path inside its workspace.",
    ],
    [
      "no folder",
      { folder: "" },
      "names , which isn't a path inside its workspace.",
    ],
    [
      "a folder Vitest takes for an option",
      { folder: "--update" },
      "names --update, which Vitest would take for an option.",
    ],
    [
      "a project Vitest takes for an option",
      { project: "-u" },
      "names -u, which Vitest would take for an option.",
    ],
  ])(
    "says what is wrong with a mutant with %s, naming which",
    (_, change, problem) => {
      const list = JSON.stringify([BOUND, { ...BOUND, ...change }]);

      expect(readMutants(list)).toBe(`Mutant 2 of the list ${problem}`);
    },
  );
});

describe("runUntil", () => {
  /** Returns a command line that runs a script, written to a folder of a spec's own, with Node. */
  async function nodeRunning(
    script: string,
    ...args: string[]
  ): Promise<{ command: string; folder: string }> {
    const folder = await freshFolder();
    await writeFile(join(folder, "script.mjs"), script);
    const node = shellQuoted(process.execPath) ?? process.execPath;
    return { command: [node, "script.mjs", ...args].join(" "), folder };
  }

  it.each([
    [0, "passed"],
    [3, "failed"],
  ])("says a command that exits with %i %s", async (exit, end) => {
    const { command, folder } = await nodeRunning(
      "process.exit(Number(process.argv[2]));",
      String(exit),
    );

    expect(
      await runUntil(command, folder, 10_000, new AbortController().signal),
    ).toBe(end);
  });

  it("runs the command in the folder given", async () => {
    const { command, folder } = await nodeRunning(
      'import { writeFileSync } from "node:fs";\nwriteFileSync("here.txt", "");\n',
    );

    await runUntil(command, folder, 10_000, new AbortController().signal);

    expect(existsSync(join(folder, "here.txt"))).toBe(true);
  });

  it("ends a command at its limit, and every process it started, and says it timed out", async () => {
    // The script starts a process that would write a file in a second, and
    // never ends itself.
    const { command, folder } = await nodeRunning(
      [
        'import { spawn } from "node:child_process";',
        "spawn(process.execPath, [\"-e\", \"setTimeout(() => require('node:fs').writeFileSync('late.txt', ''), 1000)\"], { stdio: \"ignore\" });",
        "setInterval(() => {}, 1000);",
      ].join("\n"),
    );

    const end = await runUntil(
      command,
      folder,
      300,
      new AbortController().signal,
    );
    await new Promise((done) => setTimeout(done, 1500));

    expect({ end, late: existsSync(join(folder, "late.txt")) }).toEqual({
      end: "timed out",
      late: false,
    });
  });

  it("ends a command when stopped, and says so", async () => {
    const { command, folder } = await nodeRunning(
      "setInterval(() => {}, 1000);",
    );
    const stopper = new AbortController();
    setTimeout(() => {
      stopper.abort();
    }, 100);

    expect(await runUntil(command, folder, 10_000, stopper.signal)).toBe(
      "stopped",
    );
  });

  it("rejects for a folder that isn't there", async () => {
    const { command, folder } = await nodeRunning("process.exit(0);");

    const ran = runUntil(
      command,
      join(folder, "none"),
      10_000,
      new AbortController().signal,
    );

    await expect(ran).rejects.toThrow("ENOENT");
  });

  it("ends a command at once when it is stopped already, though its limit comes before it ends", async () => {
    const { command, folder } = await nodeRunning(
      "setInterval(() => {}, 1000);",
    );

    expect(await runUntil(command, folder, 0, AbortSignal.abort())).toBe(
      "stopped",
    );
  });

  it("leaves no timer behind once its command ends", async () => {
    const { command, folder } = await nodeRunning("process.exit(0);");
    const timers = (): number =>
      process.getActiveResourcesInfo().filter((kind) => kind === "Timeout")
        .length;
    const before = timers();

    await runUntil(command, folder, 60_000, new AbortController().signal);

    expect(timers()).toBe(before);
  });
});
