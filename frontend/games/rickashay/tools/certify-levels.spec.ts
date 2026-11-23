import { type Aim, isAim } from "@fz/brick-wall/rules/aims";
import { DANGER_ROW } from "@fz/brick-wall/rules/wall";
import { replayLine } from "@fz/brick-wall/testing/solver";
import {
  type CertifyApi as PoolApi,
  type CertifyFiles,
  type CertifyIo,
  type CertifyLevel,
  type CertifySearch,
  type SolvedLine,
  type Solver,
  loadCertifyApi,
} from "@fz/dev/certify";
import { waitingWords } from "@fz/dev/queue";
import { recordingPrinter } from "@fz/dev/script";
import { isListOf, isRecord } from "@fz/core/json";
import { LEVELS } from "../src/rules/levels/levels";
import { CERTIFY_API } from "../src/testing/certify_api";
import { levelPlayOf } from "../src/testing/line_play";
import { ralliesOf, rallyLineHolds } from "../src/testing/rally_mark";
import {
  CERTIFY_GAME,
  certifyLevels,
  marksText,
  rallyOf,
} from "./certify-levels.mjs";

/** Where a made-up game keeps what the script reads and writes. */
const GAME = {
  root: "/made/up",
  api: "src/certify_api.ts",
  certificates: "certificates",
  marks: "marks",
  lines: "lines",
};

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

/** A line certified as the made-up game's API hands one back: its shots, its search, and its rally mark with the line that reaches it. */
type Marked = SolvedLine & {
  readonly rally: { readonly mark: number; readonly line: readonly number[] };
};

/**
 * Returns a line found greedily of as many shots as a level's number and a
 * depth's rows past 10, each the aim of its place in the line, and a rally
 * mark of ten times the level's number and the depth's rows past 10,
 * reached by the line's first shot.
 */
function lineFor(level: number, depth: number): Marked {
  return {
    line: Array.from({ length: level + depth - 10 }, (_, shot) => shot),
    search: GREEDY,
    rally: { mark: 10 * level + depth - 10, line: [0] },
  };
}

/**
 * Returns a game's API over the made-up levels on fields 11 and 12 deep,
 * each solved as `solve` says, by default as {@link lineFor} does, par a
 * round past a line's.
 */
function apiOf(solve: PoolApi["solve"] = lineFor): PoolApi {
  return { levels: MADE_UP, depths: [11, 12], solve, parFrom: (n) => n + 1 };
}

/** Returns a solver that solves each job in this thread, in the order given. */
function inThread(api: PoolApi): Solver {
  return (jobs, done) => {
    for (const job of jobs) {
      done({ ...job, solved: api.solve(job.level, job.depth) });
    }
    return Promise.resolve();
  };
}

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

/** Returns what a file held in memory keeps under some keys in turn, or undefined where it keeps nothing there. */
function heldAt(files: MemoryFiles, path: string, ...keys: string[]): unknown {
  let value = jsonOf(files, path);
  for (const key of keys) {
    value = isRecord(value) ? value[key] : undefined;
  }
  return value;
}

/** Returns a value read as a line of aims, or throws for one that isn't. */
function aimsOf(value: unknown): Aim[] {
  if (!isListOf(value, isAim)) {
    throw new Error(`Expected a line of aims, not ${JSON.stringify(value)}.`);
  }
  return value;
}

/** Says what a spec's queue heard: how many runs joined it and left it, and the files written by the time a run left it. */
interface Queued {
  joined: number;
  left: number;
  readonly written: string[];
}

/** Returns a queue whose turn comes at once, after the runs ahead it is handed, and what it heard. */
function queueOf(
  files: MemoryFiles,
  ...ahead: number[]
): { queue: NonNullable<CertifyIo["queue"]>; queued: Queued } {
  const queued: Queued = { joined: 0, left: 0, written: [] };
  const { written } = queued;
  return {
    queued,
    queue: (_, onWait) => {
      queued.joined++;
      for (const runs of ahead) onWait(runs);
      return Promise.resolve(() => {
        queued.left++;
        written.push(...files.held.keys());
      });
    },
  };
}

/**
 * Returns the code the script exits with for a command line, over an API,
 * solving in this thread and taking its turn in the queue at once unless
 * handed a queue, the lines it printed, and the files it wrote.
 */
async function ran(
  args: readonly string[],
  {
    api = apiOf(),
    files = memoryFiles(),
    queue = queueOf(files).queue,
  }: {
    api?: PoolApi;
    files?: MemoryFiles;
    queue?: NonNullable<CertifyIo["queue"]>;
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
    solve: inThread(api),
    files,
    queue,
    now: () => 0,
    ...printer,
  });
  return { code, out: printer.out, err: printer.err, files };
}

describe("CERTIFY_GAME", () => {
  it("keeps a set's certificates, marks and rally lines where the specs and the game read them, and has the pool load the game's API", () => {
    expect(CERTIFY_GAME).toEqual({
      root: expect.stringMatching(/\/rickashay$/) as unknown,
      api: "src/testing/certify_api.ts",
      certificates: "src/rules/levels/certificates",
      marks: "src/rules/levels/marks",
      lines: "src/rules/levels/lines",
    });
  });

  it("hands the pool the game's API, of the pool's type, as each of its threads loads it through Vite", async () => {
    const api: PoolApi = CERTIFY_API;

    const loaded = await loadCertifyApi(CERTIFY_GAME);

    expect({ levels: loaded.levels.length, depths: loaded.depths }).toEqual({
      levels: api.levels.length,
      depths: api.depths,
    });
  });

  it("certifies a level on a thread loading the game's API through Vite, its line clearing it with a row to spare and its rally line reaching its mark", async () => {
    const files = memoryFiles();
    const [entry] = LEVELS;
    const play = levelPlayOf(entry!, 22);

    await certifyLevels(["--level", "1", "--depth", "22"], CERTIFY_GAME, {
      files,
      queue: queueOf(files).queue,
      ...recordingPrinter(),
    });

    const id = entry!.data.id;
    const { certificates, marks, lines } = CERTIFY_GAME;
    const line = aimsOf(
      heldAt(files, `${certificates}/warm-up.json`, id, "22"),
    );
    const rallyLine = aimsOf(heldAt(files, `${lines}/warm-up.json`, id, "22"));
    const mark = heldAt(files, `${marks}/warm-up.json`, "rally", id, "22");
    const played = replayLine(play, line);
    expect({
      cleared: played.cleared,
      margin: played.leastRow > DANGER_ROW,
      reached: rallyLineHolds(
        rallyLine,
        ralliesOf(play, rallyLine),
        Number(mark),
      ),
    }).toEqual({ cleared: true, margin: true, reached: true });
  }, 30_000);
});

describe("certifyLevels", () => {
  it("writes each set's certificates, marks and rally lines, and prints each level's rounds and search", async () => {
    const { code, out, files } = await ran([]);

    expect({
      code,
      out,
      certificates: jsonOf(files, "certificates/first.json"),
      marks: jsonOf(files, "marks/first.json"),
      lines: jsonOf(files, "lines/second.json"),
    }).toEqual({
      code: 0,
      out: [
        " 1 Bricks          2 to 3 rounds     every 4th aim, greedy",
        " 2 All the steel   3 to 4 rounds     every 4th aim, greedy",
        " 3 Arc             4 to 5 rounds     every 4th aim, greedy",
        "",
        "Wrote certificates/first.json, marks/first.json, lines/first.json, certificates/second.json, marks/second.json and lines/second.json.",
      ],
      certificates: {
        "all-steel": { "11": [0, 1, 2], "12": [0, 1, 2, 3] },
        bricks: { "11": [0, 1], "12": [0, 1, 2] },
      },
      marks: {
        par: {
          "all-steel": { "11": 4, "12": 5 },
          bricks: { "11": 3, "12": 4 },
        },
        rally: {
          "all-steel": { "11": 21, "12": 22 },
          bricks: { "11": 11, "12": 12 },
        },
      },
      lines: { arc: { "11": [0], "12": [0] } },
    });
  });

  it("lays each file out sorted, as Prettier lays out JSON", async () => {
    const { files } = await ran(["--set", "second"]);

    expect([
      files.held.get("certificates/second.json"),
      files.held.get("marks/second.json"),
    ]).toEqual([
      [
        "{",
        '  "arc": {',
        '    "11": [0, 1, 2, 3],',
        '    "12": [0, 1, 2, 3, 4]',
        "  }",
        "}",
        "",
      ].join("\n"),
      [
        "{",
        '  "par": {',
        '    "arc": {',
        '      "11": 5,',
        '      "12": 6',
        "    }",
        "  },",
        '  "rally": {',
        '    "arc": {',
        '      "11": 31,',
        '      "12": 32',
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
    ]);
  });

  it("writes the same bytes as the last run unless a line changed", async () => {
    const { files } = await ran([]);
    const before = new Map(files.held);

    await ran([], { files });

    expect(files.held).toEqual(before);
  });

  it("keeps a set's other lines and marks as written when it certifies a level on a depth, each par from its line, and writes no file of a set it doesn't touch", async () => {
    const { files } = await ran([]);
    const second = files.held.get("marks/second.json");
    const changed = apiOf((level, depth) => ({
      ...lineFor(level, depth),
      line: [7],
      rally: { mark: 99, line: [7] },
    }));

    await ran(["--level", "2", "--depth", "12"], { api: changed, files });

    expect({
      certificates: jsonOf(files, "certificates/first.json"),
      marks: jsonOf(files, "marks/first.json"),
      lines: jsonOf(files, "lines/first.json"),
      second: files.held.get("marks/second.json"),
    }).toEqual({
      certificates: {
        "all-steel": { "11": [0, 1, 2], "12": [7] },
        bricks: { "11": [0, 1], "12": [0, 1, 2] },
      },
      marks: {
        par: {
          "all-steel": { "11": 4, "12": 2 },
          bricks: { "11": 3, "12": 4 },
        },
        rally: {
          "all-steel": { "11": 21, "12": 99 },
          bricks: { "11": 11, "12": 12 },
        },
      },
      lines: {
        "all-steel": { "11": [0], "12": [7] },
        bricks: { "11": [0], "12": [0] },
      },
      second,
    });
  });

  it("drops the lines and marks of a level its set no longer has", async () => {
    const { files } = await ran([]);
    const fewer: PoolApi = { ...apiOf(), levels: MADE_UP.slice(1) };

    await ran(["--level", "2"], { api: fewer, files });

    expect([
      jsonOf(files, "marks/first.json"),
      jsonOf(files, "lines/first.json"),
    ]).toEqual([
      {
        par: { "all-steel": { "11": 4, "12": 5 } },
        rally: { "all-steel": { "11": 21, "12": 22 } },
      },
      { "all-steel": { "11": [0], "12": [0] } },
    ]);
  });

  it("leaves a level no line and no marks on a depth the solver finds none on, says so and exits with 1", async () => {
    const api = apiOf((level, depth) =>
      level === 2 && depth === 12 ? null : lineFor(level, depth),
    );

    const { code, out, files } = await ran(["--set", "first"], { api });

    expect({
      code,
      steel: out[1],
      last: out.at(-1),
      certificates: jsonOf(files, "certificates/first.json"),
      marks: jsonOf(files, "marks/first.json"),
      lines: jsonOf(files, "lines/first.json"),
    }).toEqual({
      code: 1,
      steel:
        " 2 All the steel   3 rounds          every 4th aim, greedy on 11; no line on 12",
      last: 'The solver found 3 of 4 lines: redraw the levels it found "no line" for.',
      certificates: {
        "all-steel": { "11": [0, 1, 2] },
        bricks: { "11": [0, 1], "12": [0, 1, 2] },
      },
      marks: {
        par: { "all-steel": { "11": 4 }, bricks: { "11": 3, "12": 4 } },
        rally: { "all-steel": { "11": 21 }, bricks: { "11": 11, "12": 12 } },
      },
      lines: {
        "all-steel": { "11": [0] },
        bricks: { "11": [0], "12": [0] },
      },
    });
  });

  it("says how many runs it waits for in the queue, and how long it waited, before it certifies anything", async () => {
    const files = memoryFiles();

    const { out } = await ran(["--level", "3", "--depth", "11"], {
      files,
      queue: queueOf(files, 2, 1).queue,
    });

    expect(out.slice(0, 4)).toEqual([
      waitingWords(2),
      waitingWords(1),
      expect.stringMatching(/^Waited /) as unknown,
      expect.stringMatching(/^ 3 Arc/) as unknown,
    ]);
  });

  it("holds its place in the queue till it has written every file", async () => {
    const files = memoryFiles();
    const { queue, queued } = queueOf(files);

    await ran(["--set", "second"], { files, queue });

    expect(queued.written).toEqual([
      "certificates/second.json",
      "marks/second.json",
      "lines/second.json",
    ]);
  });

  it("throws, naming a set's file that isn't JSON, before it waits its turn or solves anything", async () => {
    const files = memoryFiles({ "lines/second.json": "{" });
    const { queue, queued } = queueOf(files);
    let solved = 0;
    const api = apiOf((level, depth) => {
      solved++;
      return lineFor(level, depth);
    });

    await expect(ran([], { api, files, queue })).rejects.toThrow(
      "lines/second.json isn't JSON.",
    );
    expect({ solved, joined: queued.joined }).toEqual({ solved: 0, joined: 0 });
  });

  it.each([
    ["marks/first.json", { par: {} }, "marks"],
    ["marks/first.json", { par: {}, rally: [] }, "marks"],
    ["marks/first.json", { par: {}, rally: { arc: { "11": "12" } } }, "marks"],
    ["marks/first.json", [], "marks"],
    ["lines/first.json", { arc: { "11": 3 } }, "rally lines"],
    ["lines/first.json", { arc: { "11": [3.5] } }, "rally lines"],
    ["certificates/first.json", { arc: { "11": 3 } }, "certificates"],
    ["certificates/first.json", { arc: [] }, "certificates"],
  ])(
    "throws, naming %s, which holds %j, not a set's %s, before it waits its turn",
    async (path, kept, says) => {
      const files = memoryFiles({ [path]: JSON.stringify(kept) });
      const { queue, queued } = queueOf(files);

      await expect(ran([], { files, queue })).rejects.toThrow(
        `${path} isn't a set's ${says}.`,
      );
      expect(queued.joined).toBe(0);
    },
  );

  it("throws for a line that comes without its rally mark, once it has left the queue", async () => {
    const files = memoryFiles();
    const { queue, queued } = queueOf(files);
    const api = apiOf((level, depth) => ({
      line: lineFor(level, depth).line,
      search: GREEDY,
    }));

    await expect(ran([], { api, files, queue })).rejects.toThrow(
      "A line came without its rally mark",
    );
    expect(queued).toEqual({ joined: 1, left: 1, written: [] });
  });

  it("writes no file where a level of a later set comes without its rally mark", async () => {
    const files = memoryFiles();
    const api = apiOf((level, depth) =>
      level === 3
        ? { line: lineFor(level, depth).line, search: GREEDY }
        : lineFor(level, depth),
    );

    await expect(ran([], { api, files })).rejects.toThrow(
      "A line came without its rally mark",
    );
    expect(files.held.size).toBe(0);
  });

  it("prints the usage asked for and exits with 0, certifying nothing", async () => {
    const { code, out, files } = await ran(["--help"]);

    expect({ code, out, written: files.held.size }).toEqual({
      code: 0,
      out: [expect.stringMatching(/^Usage: yarn certify:levels/) as unknown],
      written: 0,
    });
  });

  it("prints what is wrong with a command line as an error, and exits with 2, certifying nothing", async () => {
    const { code, err, files } = await ran(["--set", "third"]);

    expect({ code, err, written: files.held.size }).toEqual({
      code: 2,
      err: [
        expect.stringMatching(
          /^--set takes "first" or "second", not "third"\.\n\nUsage:/,
        ) as unknown,
      ],
      written: 0,
    });
  });
});

describe("rallyOf", () => {
  it("reads the rally mark a line was certified with", () => {
    const rally = { mark: 12, line: [3, 4] };

    expect(rallyOf({ line: [1], search: GREEDY, rally } as SolvedLine)).toBe(
      rally,
    );
  });

  it.each([
    [{ mark: "12", line: [3] }],
    [{ mark: 12 }],
    [{ line: [3] }],
    [{ mark: 12, line: ["3"] }],
    [null],
  ])("throws for a rally mark of %j", (rally) => {
    expect(() =>
      rallyOf({ line: [1], search: GREEDY, rally } as SolvedLine),
    ).toThrow("A line came without its rally mark");
  });
});

describe("marksText", () => {
  it("writes the par before the rally marks, each table's levels by their ids sorted", () => {
    const text = marksText({
      rally: { b: { "11": 8 }, a: { "11": 7 } },
      par: { b: { "11": 3 }, a: { "11": 4 } },
    });

    const { par, rally } = JSON.parse(text) as Record<string, object>;
    expect([
      Object.keys(JSON.parse(text) as object),
      Object.keys(par!),
      Object.keys(rally!),
    ]).toEqual([
      ["par", "rally"],
      ["a", "b"],
      ["a", "b"],
    ]);
  });
});
