import { recordingPrinter } from "@fz/dev/script";
import { LEVELS, parseLevel } from "../src/rules/levels/levels";
import { DANGER_ROW } from "../src/rules/wall/lower";
import { DEPTHS } from "../src/rules/wall/wall";
import { replayLine } from "../src/testing/solver";
import type {
  CertifyApi,
  ScriptLevel,
  ScriptSearch,
  ScriptShot,
  SolvedLine,
} from "../src/testing/script_api";
import {
  CERTIFICATES_FOLDER,
  PAR_FILE,
  certificatesText,
  jobsOf,
  loadCertifyApi,
  readCommandLine,
  run,
  solveOnThreads,
} from "./certify-levels.mjs";

type CertifyIo = NonNullable<Parameters<typeof run>[1]>;
type Solver = NonNullable<CertifyIo["solve"]>;
type Certified = Parameters<Parameters<Solver>[1]>[0];

/** Where the made-up sets' certificates are kept. */
const FIRST = `${CERTIFICATES_FOLDER}/first.json`;
const SECOND = `${CERTIFICATES_FOLDER}/second.json`;

/** The greedy search at every fourth aim, the solver's first. */
const GREEDY: ScriptSearch = { aimStep: 4, beam: 1 };

/** Made-up levels: two in a set, the second with the longest name, and one in another. */
const MADE_UP: readonly ScriptLevel[] = [
  {
    number: 1,
    set: { id: "first", name: "First" },
    data: { id: "bricks", name: "Bricks" },
  },
  {
    number: 2,
    set: { id: "first", name: "First" },
    data: { id: "all-steel", name: "All the steel" },
  },
  {
    number: 3,
    set: { id: "second", name: "Second" },
    data: { id: "arc", name: "Arc" },
  },
];

/**
 * Returns a line found greedily of as many shots as a level's number and a
 * depth's rows past 11, each aimed at its place in the line, uncharged.
 */
function lineFor(level: number, depth: number): SolvedLine {
  return {
    line: Array.from({ length: level + depth - 11 }, (_, shot): ScriptShot => [
      shot,
      0,
    ]),
    search: GREEDY,
  };
}

/**
 * Returns a script's API over the made-up levels on fields 11 and 12 deep,
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

/**
 * Returns a script's API over the first made-up level on every depth, its
 * lines found by a beam of 4 at every fourth aim on 11 deep and at every
 * aim on 12 and 13, and greedily on the rest.
 */
function searchedApi(): CertifyApi {
  const searches: Record<number, ScriptSearch> = {
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
    depths: DEPTHS,
  };
}

/** The line the script prints of {@link searchedApi}'s level. */
const SEARCHED =
  " 1 Bricks   1 to 12 rounds    every 4th aim, greedy on 14 to 22; every 4th aim, a beam of 4 on 11; every aim, a beam of 4 on 12 and 13";

/** Returns the workspace's files in memory, starting with those given. */
function memoryFiles(files: Record<string, string> = {}) {
  const held = new Map(Object.entries(files));
  return {
    held,
    read: (path: string) => Promise.resolve(held.get(path) ?? null),
    write: (path: string, text: string) => {
      held.set(path, text);
      return Promise.resolve();
    },
  };
}

/** Returns a file's JSON as it is held in memory. */
function jsonOf(files: ReturnType<typeof memoryFiles>, path: string): unknown {
  return JSON.parse(files.held.get(path) ?? "null");
}

/**
 * Returns the code the script exits with for a command line, over an API,
 * solving in this thread unless handed a solver, the lines it printed, and
 * the files it wrote.
 */
async function ran(
  args: readonly string[],
  {
    api = apiOf(),
    solve = inThread(api),
    files = memoryFiles(),
  }: {
    api?: CertifyApi;
    solve?: Solver;
    files?: ReturnType<typeof memoryFiles>;
  } = {},
) {
  const printer = recordingPrinter();
  const code = await run(args, {
    load: () => Promise.resolve(api),
    solve,
    files,
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
      message: expect.stringMatching(/^Usage: yarn certify:levels/) as unknown,
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

  it("certifies only on the depths given, shallowest first and each once", () => {
    expect(
      jobsOf(
        { ...apiOf(), depths: [11, 12, 13] },
        { ...NONE, depths: ["13", "11", "13"] },
      ),
    ).toEqual([
      { level: 1, depth: 11 },
      { level: 1, depth: 13 },
      { level: 2, depth: 11 },
      { level: 2, depth: 13 },
      { level: 3, depth: 11 },
      { level: 3, depth: 13 },
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
    [
      { ...NONE, depths: ["11.5"] },
      `--depth takes a whole number from 11 to 12, not "11.5".`,
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

describe("certificatesText", () => {
  it("sorts the levels and the depths, and lays a line out as Prettier does, a shot on each line but a line of one", () => {
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
});

describe("run", () => {
  it("writes each set's lines and every level's par, and prints each level's rounds and search", async () => {
    const { code, out, err, files } = await ran([]);

    expect({
      code,
      out,
      err,
      first: jsonOf(files, FIRST),
      second: jsonOf(files, SECOND),
      par: jsonOf(files, PAR_FILE),
    }).toEqual({
      code: 0,
      out: [
        " 1 Bricks          1 to 2 rounds     every 4th aim, greedy",
        " 2 All the steel   2 to 3 rounds     every 4th aim, greedy",
        " 3 Arc             3 to 4 rounds     every 4th aim, greedy",
        "",
        `Wrote ${FIRST}, ${SECOND} and ${PAR_FILE}.`,
      ],
      err: [],
      first: {
        bricks: {
          "11": [[0, 0]],
          "12": [
            [0, 0],
            [1, 0],
          ],
        },
        "all-steel": {
          "11": [
            [0, 0],
            [1, 0],
          ],
          "12": [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
        },
      },
      second: {
        arc: {
          "11": [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
          "12": [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 0],
          ],
        },
      },
      par: {
        "all-steel": { "11": 3, "12": 4 },
        bricks: { "11": 2, "12": 3 },
        arc: { "11": 4, "12": 5 },
      },
    });
  });

  it("writes each file's keys sorted", async () => {
    const { files } = await ran([]);

    expect({
      first: Object.keys(jsonOf(files, FIRST) as object),
      par: Object.keys(jsonOf(files, PAR_FILE) as object),
    }).toEqual({
      first: ["all-steel", "bricks"],
      par: ["all-steel", "arc", "bricks"],
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
    const backwards: Solver = (jobs, done) =>
      inThread(api)([...jobs].reverse(), done);

    const { out } = await ran([], { api, solve: backwards });

    expect(out.slice(0, 3)).toEqual([
      " 1 Bricks          1 to 2 rounds     every 4th aim, greedy",
      " 2 All the steel   2 to 3 rounds     every 4th aim, greedy",
      " 3 Arc             3 to 4 rounds     every 4th aim, greedy",
    ]);
  });

  it("keeps the other lines as they are written when it certifies a depth, and the sets it doesn't touch", async () => {
    const files = memoryFiles({
      [FIRST]: certificatesText({ bricks: { "11": [[9, 9]], "12": [[9, 9]] } }),
      [SECOND]: certificatesText({ arc: { "12": [[8, 8]] } }),
    });

    const { out } = await ran(["--set", "first", "--depth", "11"], { files });

    expect({
      wrote: out.at(-1),
      first: jsonOf(files, FIRST),
      second: jsonOf(files, SECOND),
      par: jsonOf(files, PAR_FILE),
    }).toEqual({
      wrote: `Wrote ${FIRST} and ${PAR_FILE}.`,
      first: {
        bricks: { "11": [[0, 0]], "12": [[9, 9]] },
        "all-steel": {
          "11": [
            [0, 0],
            [1, 0],
          ],
        },
      },
      second: { arc: { "12": [[8, 8]] } },
      par: {
        "all-steel": { "11": 3 },
        bricks: { "11": 2, "12": 2 },
        arc: { "12": 2 },
      },
    });
  });

  it("drops the lines of a level its set no longer has", async () => {
    const files = memoryFiles({
      [FIRST]: certificatesText({ gone: { "11": [[9, 9]] } }),
    });

    await ran(["--level", "bricks"], { files });

    expect(jsonOf(files, FIRST)).toEqual({
      bricks: {
        "11": [[0, 0]],
        "12": [
          [0, 0],
          [1, 0],
        ],
      },
    });
  });

  it("says how widely the solver searched on each depth, the narrowest first, three depths or more in a row as a span", async () => {
    const { out } = await ran([], { api: searchedApi() });

    expect(out[0]).toBe(SEARCHED);
  });

  it("says the depths of each search in order, whatever order the jobs finish in", async () => {
    const api = searchedApi();
    const backwards: Solver = (jobs, done) =>
      inThread(api)([...jobs].reverse(), done);

    const { out } = await ran([], { api, solve: backwards });

    expect(out[0]).toBe(SEARCHED);
  });

  it("leaves a level no line on a depth the solver finds none on, says so and exits with 1", async () => {
    const files = memoryFiles({
      [FIRST]: certificatesText({ bricks: { "11": [[9, 9]] } }),
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
        bricks: {
          "12": [
            [0, 0],
            [1, 0],
          ],
        },
        "all-steel": {
          "11": [
            [0, 0],
            [1, 0],
          ],
          "12": [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
        },
      },
    });
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

  it("throws, naming a set's certificates that aren't JSON, before it solves anything", async () => {
    const files = memoryFiles({ [SECOND]: "{\n<<<<<<< HEAD" });
    const solved: Certified[] = [];
    const solve: Solver = (jobs, done) =>
      inThread(apiOf())(jobs, (each) => {
        solved.push(each);
        done(each);
      });

    await expect(ran([], { files, solve })).rejects.toThrow(
      `${SECOND} isn't JSON.`,
    );
    expect(solved).toEqual([]);
  });

  it("prints the usage asked for and exits with 0, certifying nothing", async () => {
    const { code, out, files } = await ran(["--help"]);

    expect({ code, out, files: files.held.size }).toEqual({
      code: 0,
      out: [expect.stringMatching(/^Usage: yarn certify:levels/) as unknown],
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
   * A thread that certifies a job with no line, but throws for level 13
   * and stops for level 14, as a thread of the pool takes jobs.
   */
  const THREAD = new URL(
    `data:text/javascript,${encodeURIComponent(`
      import { parentPort } from "node:worker_threads";
      parentPort.on("message", (job) => {
        if (job.level === 13) throw new Error("Level 13 is cursed.");
        if (job.level === 14) process.exit(3);
        parentPort.postMessage({ ...job, solved: null });
      });
    `)}`,
  );

  /** Returns jobs on a field 11 deep of the levels given. */
  function jobsAt(...levels: number[]) {
    return levels.map((level) => ({ level, depth: 11 }));
  }

  it("shares the jobs among its threads, handing on each once", async () => {
    const certified: Certified[] = [];

    await solveOnThreads(
      jobsAt(1, 2, 3, 4, 5),
      (each) => certified.push(each),
      { script: THREAD, threads: 2 },
    );

    expect(certified.map(({ level }) => level).sort()).toEqual([1, 2, 3, 4, 5]);
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
      });

      await expect(solving).rejects.toThrow(failed);
    },
  );

  it("solves a job on a thread loading the solver through Vite, its line clearing the level with a row to spare", async () => {
    const certified: Certified[] = [];

    await solveOnThreads([{ level: 1, depth: 22 }], (each) =>
      certified.push(each),
    );

    const line = certified[0]?.solved?.line ?? [];
    const played = replayLine(parseLevel(LEVELS[0]!.data), 22, line);
    expect({
      cleared: played.cleared,
      margin: played.leastRow > DANGER_ROW,
    }).toEqual({
      cleared: true,
      margin: true,
    });
  }, 30_000);

  it("names the level and the depth a job failed on", async () => {
    const solving = solveOnThreads([{ level: 99, depth: 22 }], () => undefined);

    await expect(solving).rejects.toThrow(
      "Solving level 99 on a field 22 deep failed.",
    );
  }, 30_000);
});

describe("loadCertifyApi", () => {
  it("loads what the script plays through Vite, as each of its threads does", async () => {
    const api = await loadCertifyApi();

    expect({ levels: api.levels.length, depths: api.depths }).toEqual({
      levels: LEVELS.length,
      depths: DEPTHS,
    });
  });
});
