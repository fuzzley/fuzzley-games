import { execFileSync } from "node:child_process";
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
import { MessageChannel } from "node:worker_threads";
import {
  type CertifyApi,
  type CertifyFiles,
  type CertifyGame,
  type CertifyIo,
  type CertifyLevel,
  type CertifySearch,
  type Certified,
  type SolvedLine,
  type Solver,
  certificatesText,
  certifyLevels,
  jobsOf,
  readCommandLine,
  readDepths,
  serveJobs,
  solveOnThreads,
} from "./certify.ts";
import { recordingPrinter } from "./script.ts";

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
  const folder = await mkdtemp(join(tmpdir(), "fz-certify-"));
  made.push(folder);
  return folder;
}

/** Where a made-up game keeps what the pool reads and writes. */
const GAME: CertifyGame = {
  root: "/made/up",
  api: "src/certify_api.ts",
  certificates: "src/certificates",
  par: "src/par.json",
};

/** Where the made-up sets' certificates are kept. */
const FIRST = `${GAME.certificates}/first.json`;
const SECOND = `${GAME.certificates}/second.json`;

/** The greedy search at every fourth aim, the solver's first. */
const GREEDY: CertifySearch = { aimStep: 4, beam: 1 };

/** Made-up levels: two in a set, the second with the longest name, and one in another. */
const MADE_UP: readonly CertifyLevel[] = [
  { number: 1, set: { id: "first" }, data: { id: "bricks", name: "Bricks" } },
  {
    number: 2,
    set: { id: "first" },
    data: { id: "all-steel", name: "All the steel" },
  },
  { number: 3, set: { id: "second" }, data: { id: "arc", name: "Arc" } },
];

/** What `--help` begins with. */
const USAGE = /^Usage: yarn certify:levels/;

/**
 * Returns a line found greedily of as many shots as a level's number and a
 * depth's rows past 11, each the aim of its place in the line, as a game
 * whose certificates keep aims alone writes them.
 */
function lineFor(level: number, depth: number): SolvedLine {
  return {
    line: Array.from({ length: level + depth - 11 }, (_, shot) => shot),
    search: GREEDY,
  };
}

/**
 * Returns a game's API over the made-up levels on fields 11 and 12 deep,
 * each solved as `solve` says, by default as {@link lineFor} does, par a
 * round past a line's.
 */
function apiOf(solve: CertifyApi["solve"] = lineFor): CertifyApi {
  return {
    levels: MADE_UP,
    depths: [11, 12],
    solve,
    parFrom: (rounds) => rounds + 1,
  };
}

/** Returns a solver that solves each job in this thread, in the order given. */
function inThread(api: CertifyApi): Solver {
  return (jobs, done) => {
    for (const job of jobs) {
      done({ ...job, solved: api.solve(job.level, job.depth) });
    }
    return Promise.resolve();
  };
}

/** Returns a solver that solves the jobs in this thread, the last first. */
function backwards(api: CertifyApi): Solver {
  return (jobs, done) => inThread(api)([...jobs].reverse(), done);
}

/**
 * Returns a game's API over the first made-up level on every depth from 11
 * to 22, its lines found by a beam of 4 at every fourth aim on 11 deep and
 * at every aim on 12 and 13, and greedily on the rest.
 */
function searchedApi(): CertifyApi {
  const searches: Record<number, CertifySearch> = {
    11: { aimStep: 4, beam: 4 },
    12: { aimStep: 1, beam: 4 },
    13: { aimStep: 1, beam: 4 },
  };
  return {
    ...apiOf((level, depth) => ({
      ...lineFor(level, depth),
      search: searches[depth] ?? GREEDY,
    })),
    levels: MADE_UP.slice(0, 1),
    depths: Array.from({ length: 12 }, (_, index) => 11 + index),
  };
}

/** The line the script prints of {@link searchedApi}'s level. */
const SEARCHED =
  " 1 Bricks   1 to 12 rounds    every 4th aim, greedy on 14 to 22; every 4th aim, a beam of 4 on 11; every aim, a beam of 4 on 12 and 13";

/** Holds a game's files in memory, for a spec to read back. */
interface MemoryFiles extends CertifyFiles {
  readonly held: Map<string, string>;
}

/** Returns a game's files in memory, starting with those given. */
function memoryFiles(files: Record<string, string> = {}): MemoryFiles {
  const held = new Map(Object.entries(files));
  return {
    held,
    read: (path) => Promise.resolve(held.get(path) ?? null),
    write: (path, text) => {
      held.set(path, text);
      return Promise.resolve();
    },
  };
}

/** Returns a file's JSON as it is held in memory. */
function jsonOf(files: MemoryFiles, path: string): unknown {
  return JSON.parse(files.held.get(path) ?? "null");
}

/** Says what a spec's queue heard: whether a run left it, and the files written by then. */
interface Queued {
  left: boolean;
  written: readonly string[];
}

/**
 * Returns a queue whose turn comes at once, after the runs ahead it is
 * handed, each told in turn, and what it heard, the files written by the
 * time a run first left it read from those given.
 */
function queueOf(
  files: MemoryFiles = memoryFiles(),
  ...ahead: number[]
): {
  queue: NonNullable<CertifyIo["queue"]>;
  queued: Queued;
} {
  const queued: Queued = { left: false, written: [] };
  return {
    queued,
    queue: (_, onWait) => {
      for (const runs of ahead) onWait(runs);
      return Promise.resolve(() => {
        if (queued.left) return;
        queued.left = true;
        queued.written = [...files.held.keys()];
      });
    },
  };
}

/** Returns a queue whose turn comes at once, and the folders a run has asked it for a turn from. */
function askingQueue(): {
  queue: NonNullable<CertifyIo["queue"]>;
  asked: readonly string[];
} {
  const asked: string[] = [];
  return {
    asked,
    queue: (root) => {
      asked.push(root);
      return Promise.resolve(() => undefined);
    },
  };
}

/**
 * Returns the code the pool exits with for a command line, over an API,
 * solving in this thread unless handed a solver, its turn in the queue at
 * once unless handed one, the lines it printed, and the files it wrote.
 */
async function ran(
  args: readonly string[],
  {
    api = apiOf(),
    solve = inThread(api),
    files = memoryFiles(),
    queue = queueOf().queue,
    now = () => 0,
  }: {
    api?: CertifyApi;
    solve?: Solver;
    files?: MemoryFiles;
    queue?: NonNullable<CertifyIo["queue"]>;
    now?: () => number;
  } = {},
): Promise<{
  code: number;
  out: readonly string[];
  err: readonly string[];
  files: MemoryFiles;
}> {
  const printer = recordingPrinter();
  const code = await certifyLevels(args, GAME, {
    load: () => Promise.resolve(api),
    solve,
    files,
    queue,
    now,
    ...printer,
  });
  return { code, out: printer.out, err: printer.err, files };
}

describe("readCommandLine", () => {
  it("asks for every level on every depth by default", () => {
    expect(readCommandLine([])).toEqual({
      set: undefined,
      level: undefined,
      depths: undefined,
    });
  });

  it("reads the set, the level and each depth as they are given", () => {
    expect(
      readCommandLine([
        ...["--set", "first", "--level", "2"],
        ...["--depth", "12", "--depth", "11"],
      ]),
    ).toEqual({ set: "first", level: "2", depths: ["12", "11"] });
  });

  it.each([["--help"], ["-h"]])("prints the usage for %s", (flag) => {
    expect(readCommandLine([flag])).toEqual({
      code: 0,
      message: expect.stringMatching(USAGE) as unknown,
    });
  });

  it.each([
    [["--seeds", "3"], "Unknown option '--seeds'"],
    [["--depth"], "Option '--depth <value>' argument missing"],
    [["3"], "Unexpected argument '3'"],
  ])("exits with 2 for %j, saying why", (args, problem) => {
    expect(readCommandLine(args)).toEqual({
      code: 2,
      message: expect.stringContaining(problem) as unknown,
    });
  });
});

describe("jobsOf", () => {
  const NONE = { set: undefined, level: undefined, depths: undefined };

  it("certifies every level on every depth, in the order played and shallowest first", () => {
    expect(jobsOf(apiOf(), NONE)).toEqual([
      { level: 1, depth: 11 },
      { level: 1, depth: 12 },
      { level: 2, depth: 11 },
      { level: 2, depth: 12 },
      { level: 3, depth: 11 },
      { level: 3, depth: 12 },
    ]);
  });

  it.each([
    ["a set's levels", { ...NONE, set: "second" }, 3],
    ["a level by its id", { ...NONE, level: "all-steel" }, 2],
    ["a level by its number", { ...NONE, level: "1" }, 1],
    ["a level of the set given", { ...NONE, set: "first", level: "bricks" }, 1],
  ])("certifies only %s", (_, request, level) => {
    expect(jobsOf(apiOf(), request)).toEqual([
      { level, depth: 11 },
      { level, depth: 12 },
    ]);
  });

  it("certifies only on the depth given", () => {
    expect(jobsOf(apiOf(), { ...NONE, depths: ["12"] })).toEqual([
      { level: 1, depth: 12 },
      { level: 2, depth: 12 },
      { level: 3, depth: 12 },
    ]);
  });

  it.each([
    [
      { ...NONE, set: "third" },
      `--set takes "first" or "second", not "third".`,
    ],
    [
      { ...NONE, level: "4" },
      `--level takes a level's id or its number, from 1 to 3, not "4".`,
    ],
    [
      { ...NONE, set: "first", level: "arc" },
      `Level "arc" is in the set "second", not "first".`,
    ],
    [
      { ...NONE, depths: ["12", "13"] },
      `--depth takes a whole number from 11 to 12, not "13".`,
    ],
  ])("exits with 2 for %j, saying why", (request, problem) => {
    expect(jobsOf(apiOf(), request)).toEqual({
      code: 2,
      message: expect.stringContaining(
        `${problem}\n\nUsage: yarn certify:levels`,
      ) as unknown,
    });
  });
});

describe("readDepths", () => {
  it("reads the depths named, shallowest first and each once", () => {
    expect(readDepths(["13", "11", "13"], [11, 12, 13], "Usage")).toEqual([
      11, 13,
    ]);
  });

  it.each([["10"], ["11.5"], ["eleven"]])(
    "exits with 2 for %s, saying why under the usage handed in",
    (depth) => {
      expect(readDepths(["12", depth], [11, 12], "Usage")).toEqual({
        code: 2,
        message: `--depth takes a whole number from 11 to 12, not "${depth}".\n\nUsage`,
      });
    },
  );
});

describe("certificatesText", () => {
  it("sorts the levels and the depths, and lays a line of pairs out as Prettier does, a shot on each line but in a line of one", () => {
    const text = certificatesText({
      zap: { "12": [[5, 1]], "11": [[4, 0]] },
      bricks: {
        "11": [
          [100, 3],
          [656, 0],
        ],
      },
    });

    expect(text).toBe(`{
  "bricks": {
    "11": [
      [100, 3],
      [656, 0]
    ]
  },
  "zap": {
    "11": [[4, 0]],
    "12": [[5, 1]]
  }
}
`);
  });

  it("lays a line of aims out as Prettier does, on one line where it fits in 80 columns with the comma after it, and as many to a line as fit where it doesn't", () => {
    const aims = Array.from({ length: 14 }, (_, shot) => 100 + 37 * shot);

    const text = certificatesText({ arc: { "11": aims, "12": aims } });

    expect(text).toBe(`{
  "arc": {
    "11": [
      100, 137, 174, 211, 248, 285, 322, 359, 396, 433, 470, 507, 544, 581
    ],
    "12": [100, 137, 174, 211, 248, 285, 322, 359, 396, 433, 470, 507, 544, 581]
  }
}
`);
  });

  it("fills a line of aims too long for one line of its own onto as many as it takes", () => {
    const aims = Array.from({ length: 30 }, (_, shot) => 600 + shot);

    const text = certificatesText({ arc: { "22": aims } });

    expect(text).toBe(`{
  "arc": {
    "22": [
      600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614,
      615, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625, 626, 627, 628, 629
    ]
  }
}
`);
  });

  it("keeps a list of lists on one line where any of them holds one item", () => {
    const text = certificatesText({
      arc: { "11": [[1], [2]], "12": [[1, 2], [3]] },
    });

    expect(text).toBe(`{
  "arc": {
    "11": [[1], [2]],
    "12": [[1, 2], [3]]
  }
}
`);
  });

  it("breaks a line whose shots are objects with keys, a shot and a key a line, as Prettier keeps an object written broken", () => {
    const text = certificatesText({ arc: { "11": [{ aim: 4, charge: 1 }] } });

    expect(text).toBe(`{
  "arc": {
    "11": [
      {
        "aim": 4,
        "charge": 1
      }
    ]
  }
}
`);
  });

  it("writes a set of no certificates as an empty object", () => {
    expect(certificatesText({})).toBe("{}\n");
  });
});

describe("certifyLevels", () => {
  it("writes each set's lines and every level's par, and prints each level's rounds and search", async () => {
    const { code, out, err, files } = await ran([]);

    expect({
      code,
      out,
      err,
      first: jsonOf(files, FIRST),
      second: jsonOf(files, SECOND),
      par: jsonOf(files, GAME.par),
    }).toEqual({
      code: 0,
      out: [
        " 1 Bricks          1 to 2 rounds     every 4th aim, greedy",
        " 2 All the steel   2 to 3 rounds     every 4th aim, greedy",
        " 3 Arc             3 to 4 rounds     every 4th aim, greedy",
        "",
        `Wrote ${FIRST}, ${SECOND} and ${GAME.par}.`,
      ],
      err: [],
      first: {
        bricks: { "11": [0], "12": [0, 1] },
        "all-steel": { "11": [0, 1], "12": [0, 1, 2] },
      },
      second: { arc: { "11": [0, 1, 2], "12": [0, 1, 2, 3] } },
      par: {
        "all-steel": { "11": 3, "12": 4 },
        bricks: { "11": 2, "12": 3 },
        arc: { "11": 4, "12": 5 },
      },
    });
  });

  it("writes each file's keys sorted, laid out as Prettier lays it out", async () => {
    const { files } = await ran([]);

    expect({
      first: files.held.get(FIRST),
      par: files.held.get(GAME.par),
    }).toEqual({
      first: `{
  "all-steel": {
    "11": [0, 1],
    "12": [0, 1, 2]
  },
  "bricks": {
    "11": [0],
    "12": [0, 1]
  }
}
`,
      par: `{
  "all-steel": {
    "11": 3,
    "12": 4
  },
  "arc": {
    "11": 4,
    "12": 5
  },
  "bricks": {
    "11": 2,
    "12": 3
  }
}
`,
    });
  });

  it("writes the same bytes as the last run unless a line changed", async () => {
    const { files } = await ran([]);
    const before = new Map(files.held);

    await ran([], { files });

    expect(files.held).toEqual(before);
  });

  it("prints each level once it and every level before it are certified, whatever order the jobs finish in", async () => {
    const api = apiOf();

    const { out } = await ran([], { api, solve: backwards(api) });

    expect(out.slice(0, 3)).toEqual([
      " 1 Bricks          1 to 2 rounds     every 4th aim, greedy",
      " 2 All the steel   2 to 3 rounds     every 4th aim, greedy",
      " 3 Arc             3 to 4 rounds     every 4th aim, greedy",
    ]);
  });

  it("keeps the other lines as they are written when it certifies a depth, and the sets it doesn't touch", async () => {
    const files = memoryFiles({
      [FIRST]: certificatesText({ bricks: { "11": [9], "12": [9] } }),
      [SECOND]: certificatesText({ arc: { "12": [8] } }),
    });

    const { out } = await ran(["--set", "first", "--depth", "11"], { files });

    expect({
      wrote: out.at(-1),
      first: jsonOf(files, FIRST),
      second: jsonOf(files, SECOND),
      par: jsonOf(files, GAME.par),
    }).toEqual({
      wrote: `Wrote ${FIRST} and ${GAME.par}.`,
      first: {
        bricks: { "11": [0], "12": [9] },
        "all-steel": { "11": [0, 1] },
      },
      second: { arc: { "12": [8] } },
      par: {
        "all-steel": { "11": 3 },
        bricks: { "11": 2, "12": 2 },
        arc: { "12": 2 },
      },
    });
  });

  it("drops the lines of a level its set no longer has", async () => {
    const files = memoryFiles({
      [FIRST]: certificatesText({ gone: { "11": [9] } }),
    });

    await ran(["--level", "bricks"], { files });

    expect(jsonOf(files, FIRST)).toEqual({
      bricks: { "11": [0], "12": [0, 1] },
    });
  });

  it("says how widely the solver searched on each depth, the narrowest first, three depths or more in a row as a span", async () => {
    const { out } = await ran([], { api: searchedApi() });

    expect(out[0]).toBe(SEARCHED);
  });

  it("says the depths of each search in order, whatever order the jobs finish in", async () => {
    const api = searchedApi();

    const { out } = await ran([], { api, solve: backwards(api) });

    expect(out[0]).toBe(SEARCHED);
  });

  it("leaves a level no line on a depth the solver finds none on, says so and exits with 1", async () => {
    const files = memoryFiles({
      [FIRST]: certificatesText({ bricks: { "11": [9] } }),
    });
    const api = apiOf((level, depth) =>
      level === 1 && depth === 11 ? null : lineFor(level, depth),
    );

    const { code, out } = await ran([], { api, files });

    expect({
      code,
      bricks: out[0],
      last: out.at(-1),
      first: jsonOf(files, FIRST),
    }).toEqual({
      code: 1,
      bricks:
        " 1 Bricks          2 rounds          every 4th aim, greedy on 12; no line on 11",
      last: 'The solver found 5 of 6 lines: redraw the levels it found "no line" for.',
      first: {
        bricks: { "12": [0, 1] },
        "all-steel": { "11": [0, 1], "12": [0, 1, 2] },
      },
    });
  });

  it("says a level's rounds alone where its lines all take as many, a round in the singular", async () => {
    const { out } = await ran(["--level", "1", "--depth", "11"]);

    expect(out[0]).toBe(" 1 Bricks   1 round           every 4th aim, greedy");
  });

  it("says a level the solver finds no line for on any depth has none on each", async () => {
    const api = apiOf((level, depth) =>
      level === 1 ? null : lineFor(level, depth),
    );

    const { out } = await ran([], { api });

    expect(out[0]).toBe(
      " 1 Bricks          -                 no line on 11 and 12",
    );
  });

  it("says how many runs it waits for in the queue, and how long it waited, before it certifies anything", async () => {
    const { queue } = queueOf(memoryFiles(), 2, 1);
    let clock = 1_000;
    const now = (): number => (clock += 30_000);

    const { out } = await ran(["--level", "1"], { queue, now });

    expect(out.slice(0, 4)).toEqual([
      "Waiting for 2 runs that started first (verify:changed or another script that takes the whole machine).",
      "Waiting for 1 run that started first (verify:changed or another script that takes the whole machine).",
      "Waited 30 s for its turn.",
      " 1 Bricks   1 to 2 rounds     every 4th aim, greedy",
    ]);
  });

  it("holds its place in the queue till it has written the certificates and the pars", async () => {
    const files = memoryFiles();
    const { queue, queued } = queueOf(files);

    await ran([], { files, queue });

    expect(queued).toEqual({
      left: true,
      written: [FIRST, SECOND, GAME.par],
    });
  });

  it("holds its place in the queue while it solves, and leaves it where solving fails", async () => {
    const { queue, queued } = queueOf();
    const heldWhileSolving: boolean[] = [];
    const failing: Solver = () => {
      heldWhileSolving.push(!queued.left);
      return Promise.reject(new Error("A thread failed."));
    };

    await expect(ran([], { queue, solve: failing })).rejects.toThrow(
      "A thread failed.",
    );
    expect({ heldWhileSolving, left: queued.left }).toEqual({
      heldWhileSolving: [true],
      left: true,
    });
  });

  it("waits by default in the queue its repository's worktrees share, and leaves it once done", async () => {
    const root = await freshFolder();
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    const api = apiOf();

    const code = await certifyLevels(
      [],
      { ...GAME, root },
      {
        load: () => Promise.resolve(api),
        solve: inThread(api),
        files: memoryFiles(),
        now: () => 0,
        ...recordingPrinter(),
      },
    );

    expect({
      code,
      places: await readdir(join(root, ".git", "fz-verify-queue")),
    }).toEqual({ code: 0, places: [] });
  });

  it("throws where it can't read a set's certificates for another reason than their being missing, before it waits its turn", async () => {
    const root = await freshFolder();
    await mkdir(join(root, FIRST), { recursive: true });
    const api = apiOf();
    const { queue, asked } = askingQueue();

    const certifying = certifyLevels(
      [],
      { ...GAME, root },
      {
        load: () => Promise.resolve(api),
        solve: inThread(api),
        queue,
        ...recordingPrinter(),
      },
    );

    await expect(certifying).rejects.toThrow("EISDIR");
    expect(asked).toEqual([]);
  });

  it("throws, naming a set's certificates that aren't JSON, before it waits its turn or solves anything", async () => {
    const files = memoryFiles({ [SECOND]: "{\n<<<<<<< HEAD" });
    const { queue, asked } = askingQueue();

    await expect(ran([], { files, queue })).rejects.toThrow(
      `${SECOND} isn't JSON.`,
    );
    expect(asked).toEqual([]);
  });

  it("prints the usage asked for and exits with 0, certifying nothing", async () => {
    const { code, out, files } = await ran(["--help"]);

    expect({ code, out, files: files.held.size }).toEqual({
      code: 0,
      out: [expect.stringMatching(USAGE) as unknown],
      files: 0,
    });
  });

  it("prints what is wrong with a command line as an error, and exits with 2, certifying nothing", async () => {
    const { code, out, err, files } = await ran(["--set", "third"]);

    expect({ code, out, err, files: files.held.size }).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^--set takes "first" or "second", not "third"\.\n\nUsage: yarn certify:levels/,
        ) as unknown,
      ],
      files: 0,
    });
  });
});

describe("solveOnThreads", () => {
  /**
   * A thread that certifies a job with no line, naming the thread, but
   * throws for level 13 and stops for level 14, as a thread of the pool
   * takes jobs.
   */
  const THREAD = new URL(
    `data:text/javascript,${encodeURIComponent(`
      import { parentPort, threadId } from "node:worker_threads";
      parentPort.on("message", (job) => {
        if (job.level === 13) throw new Error("Level 13 is cursed.");
        if (job.level === 14) process.exit(3);
        parentPort.postMessage({ ...job, solved: null, thread: threadId });
      });
    `)}`,
  );

  /** Returns jobs on a field 11 deep of the levels given. */
  function jobsAt(...levels: number[]): { level: number; depth: number }[] {
    return levels.map((level) => ({ level, depth: 11 }));
  }

  it("shares the jobs among its threads, handing on each once", async () => {
    const certified: Certified[] = [];

    await solveOnThreads(
      jobsAt(1, 2, 3, 4, 5),
      (each) => certified.push(each),
      { script: THREAD, threads: 2, workerData: null },
    );

    expect(certified.map(({ level }) => level).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("starts as many threads as the pool has, each taking jobs", async () => {
    const threads = new Set<unknown>();

    await solveOnThreads(
      jobsAt(1, 2, 3, 4, 5),
      (each) => threads.add((each as Certified & { thread: unknown }).thread),
      { script: THREAD, threads: 2, workerData: null },
    );

    expect(threads.size).toBe(2);
  });

  it.each([
    [13, "Level 13 is cursed."],
    [14, "A thread of the pool stopped with 3."],
  ])(
    "rejects with what failed once a thread fails on level %i",
    async (level, failed) => {
      const solving = solveOnThreads(jobsAt(1, level, 2), () => undefined, {
        script: THREAD,
        threads: 2,
        workerData: null,
      });

      await expect(solving).rejects.toThrow(failed);
    },
  );
});

describe("serveJobs", () => {
  it("posts back each job posted to it, with the line the solver finds", async () => {
    const { port1, port2 } = new MessageChannel();
    serveJobs(port1, apiOf());
    const answered = new Promise((resolve) => {
      port2.once("message", resolve);
    });

    port2.postMessage({ level: 2, depth: 12 });

    await expect(answered).resolves.toEqual({
      level: 2,
      depth: 12,
      solved: lineFor(2, 12),
    });
    port1.close();
  });
});

describe("a game certified on the pool's threads", () => {
  /**
   * Returns a made-up game in a folder of its own: its API, which the
   * script and each thread load through Vite, solving each level as
   * {@link lineFor} does, but throwing for a level numbered `cursed`.
   */
  async function gameOnDisk(cursed: number): Promise<CertifyGame> {
    const root = await freshFolder();
    await mkdir(join(root, "certificates"));
    await writeFile(
      join(root, "certify_api.ts"),
      `export const CERTIFY_API = {
        levels: ${JSON.stringify(MADE_UP.slice(0, 2))},
        depths: [11, 12],
        solve: (level: number, depth: number) => {
          if (level === ${String(cursed)}) throw new Error("Cursed.");
          return {
            line: Array.from({ length: level + depth - 11 }, (_, shot) => shot),
            search: ${JSON.stringify(GREEDY)},
          };
        },
        parFrom: (rounds: number) => rounds + 1,
      };`,
    );
    return {
      root,
      api: "certify_api.ts",
      certificates: "certificates",
      par: "par.json",
    };
  }

  it("writes the lines its threads find to the game's files", async () => {
    const game = await gameOnDisk(0);
    const { queue } = queueOf();

    const code = await certifyLevels(["--depth", "12"], game, {
      queue,
      ...recordingPrinter(),
    });

    expect({
      code,
      first: await readFile(join(game.root, "certificates/first.json"), "utf8"),
    }).toEqual({
      code: 0,
      first: certificatesText({
        "all-steel": { "12": [0, 1, 2] },
        bricks: { "12": [0, 1] },
      }),
    });
  }, 30_000);

  it("names the module that exports no CERTIFY_API", async () => {
    const game = await gameOnDisk(0);
    await writeFile(join(game.root, game.api), "export const OTHER_API = {};");
    const { queue } = queueOf();

    const certifying = certifyLevels([], game, {
      queue,
      ...recordingPrinter(),
    });

    await expect(certifying).rejects.toThrow(
      "certify_api.ts exports no CERTIFY_API.",
    );
  }, 30_000);

  it("names the level and the depth a thread failed on", async () => {
    const game = await gameOnDisk(2);
    const { queue } = queueOf();

    const certifying = certifyLevels(["--level", "2", "--depth", "12"], game, {
      queue,
      ...recordingPrinter(),
    });

    await expect(certifying).rejects.toThrow(
      "Solving level 2 on a field 12 deep failed.",
    );
  }, 30_000);
});
