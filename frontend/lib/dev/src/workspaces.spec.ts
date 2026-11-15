import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { type Env, recordingPrinter } from "./script.ts";
import {
  type Ran,
  type Workspace,
  declaredWorkspaces,
  runCommand,
  runInLanes,
  runTestsScript,
  shellQuoted,
  workspacesWithScript,
} from "./workspaces.ts";

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
  const root = await mkdtemp(join(tmpdir(), "fz-dev-workspaces-"));
  made.push(root);
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}

/** Returns a `package.json` of a name and the scripts named. */
function packageOf(name: string, ...scripts: string[]): string {
  return JSON.stringify({
    name,
    scripts: Object.fromEntries(scripts.map((script) => [script, "vitest"])),
  });
}

/**
 * Writes a root of three workspaces with a `test` script, `big` with three
 * spec files, `mid` with two and `small` with one, and returns its folder.
 */
function rootOfThree(): Promise<string> {
  return folderOf({
    "package.json": JSON.stringify({ workspaces: ["lib/*"] }),
    "lib/big/package.json": packageOf("big", "test"),
    "lib/big/a.spec.ts": "",
    "lib/big/b.spec.ts": "",
    "lib/big/c.spec.ts": "",
    "lib/mid/package.json": packageOf("mid", "test"),
    "lib/mid/a.spec.ts": "",
    "lib/mid/b.spec.ts": "",
    "lib/small/package.json": packageOf("small", "test"),
    "lib/small/a.spec.ts": "",
  });
}

/** Returns a workspace of a name, its folder named after it. */
function workspace(name: string): Workspace {
  return { name, folder: `/${name}`, specs: 0 };
}

/**
 * Returns a run that waits a turn of the microtask queue for each
 * workspace and ends with the code it is given, recording the order they
 * started in and the most that ran at once.
 */
function recordedRun(codes: Readonly<Record<string, number>> = {}): {
  readonly run: (workspace: Workspace) => Promise<number>;
  readonly started: string[];
  readonly most: () => number;
} {
  const started: string[] = [];
  let running = 0;
  let most = 0;
  return {
    started,
    most: () => most,
    run: async ({ name }) => {
      started.push(name);
      running += 1;
      most = Math.max(most, running);
      await Promise.resolve();
      running -= 1;
      return codes[name] ?? 0;
    },
  };
}

/**
 * Returns a command runner that answers each folder ending in a name with
 * its code, 0 unless given, and its folder's name as its output, recording
 * each command line, the folder it ran in and the environment it ran in.
 */
function fakeCommands(codes: Readonly<Record<string, number>> = {}): {
  readonly run: (command: string, folder: string, env: Env) => Promise<Ran>;
  readonly ran: [string, string][];
  readonly envs: Env[];
} {
  const ran: [string, string][] = [];
  const envs: Env[] = [];
  return {
    ran,
    envs,
    run: (command, folder, env) => {
      const name = folder.split(/[\\/]/).at(-1) ?? "";
      ran.push([command, name]);
      envs.push(env);
      return Promise.resolve({ code: codes[name] ?? 0, output: `${name}\n` });
    },
  };
}

describe("declaredWorkspaces", () => {
  it("reads each workspace's scripts and the workspaces it depends on through workspace: ranges", async () => {
    const root = await folderOf({
      "package.json": JSON.stringify({ workspaces: ["lib/*"] }),
      "lib/a/package.json": JSON.stringify({
        name: "a",
        scripts: { lint: "eslint", test: "vitest" },
      }),
      "lib/b/package.json": JSON.stringify({
        name: "b",
        dependencies: { a: "workspace:*", semver: "^7.0.0" },
        devDependencies: { c: "workspace:^" },
      }),
      "lib/c/package.json": JSON.stringify({ name: "c" }),
    });

    const declared = declaredWorkspaces(root);

    expect(
      declared.map(({ name, scripts, dependsOn }) => ({
        name,
        scripts,
        dependsOn,
      })),
    ).toEqual([
      { name: "a", scripts: ["lint", "test"], dependsOn: [] },
      { name: "b", scripts: [], dependsOn: ["a", "c"] },
      { name: "c", scripts: [], dependsOn: [] },
    ]);
  });
});

describe("workspacesWithScript", () => {
  it("finds the workspaces with the script, the most spec files first, then by name", async () => {
    const root = await folderOf({
      "package.json": JSON.stringify({ workspaces: ["lib/*", "site"] }),
      "lib/a/package.json": packageOf("a", "test"),
      "lib/a/src/one.spec.ts": "",
      "lib/a/src/two.spec.ts": "",
      "lib/b/package.json": packageOf("b", "lint"),
      "lib/b/src/one.spec.ts": "",
      "lib/c/package.json": packageOf("c", "test"),
      "lib/c/src/one.spec.ts": "",
      "site/package.json": packageOf("site", "test"),
      "site/src/one.spec.ts": "",
      "site/tools/two.spec.ts": "",
    });

    const found = workspacesWithScript(root, "test");

    expect(found).toEqual([
      { name: "a", folder: join(root, "lib/a"), specs: 2 },
      { name: "site", folder: join(root, "site"), specs: 2 },
      { name: "c", folder: join(root, "lib/c"), specs: 1 },
    ]);
  });

  it("counts no spec in what is installed, built or measured, at any depth", async () => {
    const root = await folderOf({
      "package.json": JSON.stringify({ workspaces: ["site"] }),
      "site/package.json": packageOf("site", "test"),
      "site/src/one.spec.ts": "",
      "site/node_modules/pkg/two.spec.ts": "",
      "site/src/deep/node_modules/pkg/three.spec.ts": "",
      "site/dist/four.spec.ts": "",
      "site/coverage/five.spec.ts": "",
    });

    const [site] = workspacesWithScript(root, "test");

    expect(site?.specs).toBe(1);
  });

  it("takes no name an object inherits for a script", async () => {
    const root = await rootOfThree();

    expect(workspacesWithScript(root, "toString")).toEqual([]);
  });

  it("finds none in a root that declares no workspaces", async () => {
    const root = await folderOf({ "package.json": "{}" });

    expect(workspacesWithScript(root, "test")).toEqual([]);
  });
});

describe("runInLanes", () => {
  it("starts each in the order given, as many at once as it has lanes", async () => {
    const recorded = recordedRun();
    const workspaces = ["a", "b", "c", "d", "e"].map(workspace);

    await runInLanes(workspaces, 2, recorded.run);

    expect({ started: recorded.started, most: recorded.most() }).toEqual({
      started: ["a", "b", "c", "d", "e"],
      most: 2,
    });
  });

  it("runs every one, and reports each, whatever another's comes to", async () => {
    const recorded = recordedRun({ b: 1 });
    const workspaces = ["a", "b", "c", "d"].map(workspace);

    const outcomes = await runInLanes(workspaces, 2, recorded.run);

    expect(
      outcomes.map(({ workspace, code }) => [workspace.name, code]),
    ).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 0],
      ["d", 0],
    ]);
  });

  it("says when each started after the first, and how long it ran", async () => {
    let clock = 100;
    const run = (): Promise<number> => {
      clock += 7;
      return Promise.resolve(0);
    };

    const outcomes = await runInLanes(
      ["a", "b"].map(workspace),
      1,
      run,
      () => clock,
    );

    expect(
      outcomes.map(({ startedMs, tookMs }) => [startedMs, tookMs]),
    ).toEqual([
      [0, 7],
      [7, 7],
    ]);
  });

  it("runs on one lane when it is given none", async () => {
    const recorded = recordedRun();

    await runInLanes(["a", "b"].map(workspace), 0, recorded.run);

    expect(recorded.started).toEqual(["a", "b"]);
  });
});

describe("runCommand", () => {
  it("returns the command's code and all it printed", async () => {
    const folder = await folderOf({});

    const ran = await runCommand(
      `node -e "process.stdout.write('out'); process.stderr.write('err'); process.exitCode = 3"`,
      folder,
    );

    // Its output and its errors come down two pipes, in either order.
    expect(ran.code).toBe(3);
    expect(["outerr", "errout"]).toContain(ran.output);
  });

  // The shell ends itself, as a signal ends a command.
  it.skipIf(process.platform === "win32")(
    "returns 1 for a command a signal ended",
    async () => {
      const folder = await folderOf({});

      const ran = await runCommand("kill -KILL $$", folder);

      expect(ran.code).toBe(1);
    },
  );

  it("runs in the folder it is given", async () => {
    const folder = await folderOf({ "here.txt": "found" });

    const ran = await runCommand(
      `node -e "process.stdout.write(require('fs').readFileSync('here.txt', 'utf8'))"`,
      folder,
    );

    expect(ran.output).toBe("found");
  });

  it("runs in the environment it is given", async () => {
    const folder = await folderOf({});

    const ran = await runCommand(
      `node -e "process.stdout.write(process.env.FZ_GIVEN)"`,
      folder,
      { ...process.env, FZ_GIVEN: "given" },
    );

    expect(ran.output).toBe("given");
  });

  it("rejects when the command can't start there", async () => {
    const folder = await folderOf({});

    await expect(
      runCommand("node -v", join(folder, "missing")),
    ).rejects.toThrow();
  });
});

describe("shellQuoted", () => {
  it("leaves an argument every shell reads as one word as it is", () => {
    expect(shellQuoted("--reporter=dot", "linux")).toBe("--reporter=dot");
  });

  it("quotes any other in single quotes outside Windows", () => {
    expect(shellQuoted("it's here", "linux")).toBe(`'it'\\''s here'`);
  });

  it("quotes any other in double quotes on Windows", () => {
    expect(shellQuoted("a|b c", "win32")).toBe('"a|b c"');
  });

  it.each(["50%", 'say "hi"'])("can't quote %j for Windows' shell", (arg) => {
    expect(shellQuoted(arg, "win32")).toBeUndefined();
  });

  // The shell reads each back as it was written, one argument each.
  it.skipIf(process.platform === "win32")(
    "quotes arguments the shell reads back unchanged",
    async () => {
      const folder = await folderOf({});
      const args = ["a b", "a|b", "it's", "$HOME", "*", "--name=x y"];

      const ran = await runCommand(
        [
          `node -e "process.stdout.write(JSON.stringify(process.argv.slice(1)))"`,
          ...args.map((arg) => shellQuoted(arg)),
        ].join(" "),
        folder,
      );

      expect(JSON.parse(ran.output)).toEqual(args);
    },
  );
});

describe("runTestsScript", () => {
  it("runs the script in each workspace, the most spec files first, on its share of the cores", async () => {
    const root = await rootOfThree();
    const commands = fakeCommands();

    await runTestsScript(["test", "-j", "1"], root, {
      ...recordingPrinter(),
      cores: 6,
      run: commands.run,
    });

    expect(commands.ran).toEqual([
      ["yarn run test --maxWorkers=6", "big"],
      ["yarn run test --maxWorkers=6", "mid"],
      ["yarn run test --maxWorkers=6", "small"],
    ]);
  });

  it.each([
    [6, 2],
    [1, 1],
  ])(
    "shares %i cores out by the workspaces run at once, as %i each, rounded as Vitest rounds a share",
    async (cores, workers) => {
      const root = await rootOfThree();
      const commands = fakeCommands();

      await runTestsScript(["test", "--jobs", "3"], root, {
        ...recordingPrinter(),
        cores,
        run: commands.run,
      });

      expect(commands.ran[0]?.[0]).toBe(
        `yarn run test --maxWorkers=${workers}`,
      );
    },
  );

  it("gives a workspace run alone every core, whatever --jobs says", async () => {
    const root = await rootOfThree();
    const commands = fakeCommands();

    await runTestsScript(["test", "--only", "big"], root, {
      ...recordingPrinter(),
      cores: 4,
      run: commands.run,
    });

    expect(commands.ran).toEqual([["yarn run test --maxWorkers=4", "big"]]);
  });

  it("keeps Node's compile cache in the root's node_modules/.cache/, off CI", async () => {
    const root = await rootOfThree();
    const commands = fakeCommands();

    await runTestsScript(["test", "--only", "big"], root, {
      ...recordingPrinter(),
      env: { CI: "false", PATH: "/bin" },
      run: commands.run,
    });

    expect(commands.envs).toEqual([
      {
        CI: "false",
        PATH: "/bin",
        NODE_COMPILE_CACHE: join(
          root,
          "node_modules/.cache/node-compile-cache",
        ),
      },
    ]);
  });

  it.each<[string, Env]>([
    ["on CI", { CI: "true" }],
    ["where it names a cache already", { NODE_COMPILE_CACHE: "/elsewhere" }],
  ])("leaves the environment as it is %s", async (_, env) => {
    const root = await rootOfThree();
    const commands = fakeCommands();

    await runTestsScript(["test", "--only", "big"], root, {
      ...recordingPrinter(),
      env,
      run: commands.run,
    });

    expect(commands.envs).toEqual([env]);
  });

  it("leaves the environment as it is for test:coverage, as coverage can be less precise in code read from the cache", async () => {
    const root = await folderOf({
      "package.json": JSON.stringify({ workspaces: ["lib/*"] }),
      "lib/big/package.json": packageOf("big", "test:coverage"),
    });
    const commands = fakeCommands();
    const env = { CI: "false" };

    await runTestsScript(["test:coverage"], root, {
      ...recordingPrinter(),
      env,
      run: commands.run,
    });

    expect(commands.envs).toEqual([env]);
  });

  it("hands Vitest what follows --, each quoted for the shell", async () => {
    const root = await rootOfThree();
    const commands = fakeCommands();

    await runTestsScript(
      ["test", "--only", "big", "--", "--reporter=dot", "-t", "deals a card"],
      root,
      { ...recordingPrinter(), cores: 4, platform: "linux", run: commands.run },
    );

    expect(commands.ran[0]?.[0]).toBe(
      "yarn run test --maxWorkers=4 --reporter=dot -t 'deals a card'",
    );
  });

  it("prints each workspace's output as it ends, then when each started and how long it ran", async () => {
    const root = await rootOfThree();
    const printer = recordingPrinter();
    let clock = 0;
    const run = (command: string, folder: string, env: Env): Promise<Ran> => {
      clock += 1500;
      return fakeCommands().run(command, folder, env);
    };

    const code = await runTestsScript(["test", "--jobs", "1"], root, {
      ...printer,
      cores: 1,
      run,
      now: () => clock,
    });

    expect({ code, out: printer.out }).toEqual({
      code: 0,
      out: [
        "➤ big: test exited with 0",
        "big",
        "➤ mid: test exited with 0",
        "mid",
        "➤ small: test exited with 0",
        "small",
        "\n  Started     Took  Workspace",
        "    0.0 s    1.5 s  big",
        "    1.5 s    1.5 s  mid",
        "    3.0 s    1.5 s  small",
      ],
    });
  });

  it("prints the outputs in the order the workspaces end, the table in the order they started, marking each that failed", async () => {
    const root = await rootOfThree();
    const printer = recordingPrinter();
    let tick = 0;
    // `big` runs longest, so `mid` and `small` end first, side by side.
    const run = async (
      command: string,
      folder: string,
      env: Env,
    ): Promise<Ran> => {
      if (folder.endsWith("big")) {
        for (let turn = 0; turn < 10; turn++) await Promise.resolve();
        return { code: 3, output: "big\n" };
      }
      return fakeCommands().run(command, folder, env);
    };

    await runTestsScript(["test", "--jobs", "2"], root, {
      ...printer,
      cores: 2,
      run,
      now: () => (tick += 1000),
    });

    expect(printer.out.filter((line) => /^➤| s {2}/.test(line))).toEqual([
      "➤ mid: test exited with 0",
      "➤ small: test exited with 0",
      "➤ big: test exited with 3",
      "    1.0 s    5.0 s  big  exited with 3",
      "    2.0 s    1.0 s  mid",
      "    4.0 s    1.0 s  small",
    ]);
  });

  it("runs every workspace when one fails, and names each that did", async () => {
    const root = await rootOfThree();
    const printer = recordingPrinter();
    const commands = fakeCommands({ big: 1, small: 2 });

    const code = await runTestsScript(["test"], root, {
      ...printer,
      cores: 4,
      run: commands.run,
    });

    expect({ code, ran: commands.ran.length, err: printer.err }).toEqual({
      code: 1,
      ran: 3,
      err: ["\ntest failed in big, small."],
    });
  });

  it("counts a command that can't start as a failure, and runs the rest", async () => {
    const root = await rootOfThree();
    const printer = recordingPrinter();
    const commands = fakeCommands();
    const run = (command: string, folder: string, env: Env): Promise<Ran> =>
      folder.endsWith("mid")
        ? Promise.reject(new Error("spawn ENOENT"))
        : commands.run(command, folder, env);

    const code = await runTestsScript(["test", "--jobs", "1"], root, {
      ...printer,
      run,
    });

    expect({
      code,
      ran: commands.ran.map(([, name]) => name),
      mid: printer.out.slice(2, 4),
    }).toEqual({
      code: 1,
      ran: ["big", "small"],
      mid: ["➤ mid: test exited with 1", "Error: spawn ENOENT"],
    });
  });

  it.each([
    [["--only", "small,big"]],
    [["--only", "small, big,"]],
    [["--only", "small", "--only", "big"]],
  ])("runs only the workspaces %j names", async (options) => {
    const root = await rootOfThree();
    const commands = fakeCommands();

    await runTestsScript(["test", ...options], root, {
      ...recordingPrinter(),
      run: commands.run,
    });

    expect(commands.ran.map(([, name]) => name)).toEqual(["big", "small"]);
  });

  it("runs every workspace but those --except names", async () => {
    const root = await rootOfThree();
    const commands = fakeCommands();

    await runTestsScript(["test", "--except", "big"], root, {
      ...recordingPrinter(),
      run: commands.run,
    });

    expect(commands.ran.map(([, name]) => name)).toEqual(["mid", "small"]);
  });

  it.each([
    [
      ["test", "--only", "large"],
      "No workspace named large has a test script.",
    ],
    [
      ["test", "--except", "big,huge"],
      "No workspace named huge has a test script.",
    ],
    [["tests"], "No workspace to run tests in."],
    [["test", "--only", ","], "No workspace to run test in."],
    [["test", "--except", "big,mid,small"], "No workspace to run test in."],
    [[], "Name one script to run."],
    [["test", "lint"], "Name one script to run."],
    [["test", "--jobs", "0"], '--jobs takes a whole number from 1, not "0".'],
    [
      ["test", "--jobs", "two"],
      '--jobs takes a whole number from 1, not "two".',
    ],
    [["test", "--", "-t", "50%"], "Windows' shell can't be handed 50%."],
  ])(
    "refuses %j on Windows, saying why, and runs nothing",
    async (args, problem) => {
      const root = await rootOfThree();
      const printer = recordingPrinter();
      const commands = fakeCommands();

      const code = await runTestsScript(args, root, {
        ...printer,
        platform: "win32",
        run: commands.run,
      });

      expect({
        code,
        problem: printer.err[0]?.split("\n")[0],
        ran: commands.ran,
      }).toEqual({ code: 2, problem, ran: [] });
    },
  );

  it("prints its usage for --help", async () => {
    const root = await rootOfThree();
    const printer = recordingPrinter();

    const code = await runTestsScript(["--help"], root, printer);

    expect({ code, usage: printer.out[0]?.split("\n")[0] }).toEqual({
      code: 0,
      usage: "Usage: yarn test [options] [-- <vitest options>]",
    });
  });
});
