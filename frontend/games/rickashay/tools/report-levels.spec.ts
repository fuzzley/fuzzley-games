import { availableParallelism } from "node:os";
import { MessageChannel } from "node:worker_threads";
import { DEPTHS } from "@fz/brick-wall/rules/field";
import { solveOnThreads } from "@fz/dev/certify";
import { waitedWords, waitingWords } from "@fz/dev/queue";
import { SEED_STRIDE } from "@fz/dev/report";
import { recordingPrinter } from "@fz/dev/script";
import { REPORT_API } from "../src/testing/report_api";
import {
  type DepthFigures,
  type PlayedJob,
  type ReportApi,
  type ReportIo,
  type ReportJob,
  type ReportLevel,
  REPORT_SEEDS,
  SHOWN_DEPTHS,
  loadReportApi,
  poolOf,
  run,
  serveJobs,
  tableLines,
} from "./report-levels.mjs";

/** Made-up levels: two in a set held to a floor of 90, and one in a set held to 40. */
const MADE_UP: readonly ReportLevel[] = [
  {
    number: 1,
    set: { id: "first", name: "First" },
    data: { id: "bricks", name: "Bricks", around: "A row of bricks" },
  },
  {
    number: 2,
    set: { id: "first", name: "First" },
    data: { id: "steel", name: "Steel", around: "Steel to bank off" },
  },
  {
    number: 3,
    set: { id: "second", name: "Second" },
    data: { id: "arc", name: "Arc", around: "An arc of bricks" },
  },
];

/**
 * Returns how a made-up level plays on a depth, its figures stepping down
 * the shown depths and holding at a depth not shown: its line's rounds its
 * number and 2, and on; every game but one less for each step cleared, in
 * 8 rounds and one fewer each step; the middle of its games' best rallies
 * 5 past ten times its number, and on; 2 games more cleared blind each
 * step; and a sweet spot of 2°, half a degree narrower each step.
 */
function fine(level: number, depth: number, games: number): DepthFigures {
  const step = Math.max(0, SHOWN_DEPTHS.indexOf(depth));
  const cleared = games - step;
  return {
    rounds: level + 2 + step,
    cleared,
    clearedRounds: cleared * (8 - step),
    bests: [10 * level, 10 * level + 5 + step, 10 * level + 30],
    blind: 2 * step,
    sweetSpot: 2 - step / 2,
  };
}

/**
 * Returns the made-up levels' API, played on the shown depths unless given
 * others, each level's wall of rows 10 past its number, and bricks and hits
 * 20 and 30 times it, playing as `figuresOf` says, by default as
 * {@link fine} does.
 */
function apiOf({
  figuresOf = (level, depth, _, games) => fine(level, depth, games),
  depths = SHOWN_DEPTHS,
  floors = { first: 90, second: 40 },
}: Partial<
  Pick<ReportApi, "figuresOf" | "depths" | "floors">
> = {}): ReportApi {
  return {
    levels: MADE_UP,
    depths,
    floors,
    blindCeiling: 75,
    leastSweetSpot: 0.75,
    wallOf: (level) => ({
      rows: 10 + level,
      bricks: 20 * level,
      hits: 30 * level,
    }),
    figuresOf,
  };
}

/** Says what a spec's queue heard: how many runs joined it and left it, and how many jobs were played by the time a run left it. */
interface Queued {
  joined: number;
  left: number;
  playedOnLeaving: number;
}

/** Returns what a spec's queue has heard before any run joins it. */
function heardNothing(): Queued {
  return { joined: 0, left: 0, playedOnLeaving: 0 };
}

/**
 * Returns the code the script exits with for a command line, over an API,
 * playing in this thread unless handed another way and taking its turn in
 * the queue at once, after the runs ahead it is handed, with what it
 * printed, the jobs it played in this thread, and what the queue heard.
 */
async function ran(
  args: readonly string[],
  {
    api = apiOf(),
    ahead = [],
    play,
    queued = heardNothing(),
  }: {
    api?: ReportApi;
    ahead?: readonly number[];
    play?: NonNullable<ReportIo["play"]>;
    queued?: Queued;
  } = {},
): Promise<{
  code: number;
  out: readonly string[];
  err: readonly string[];
  jobs: readonly ReportJob[];
  queued: Queued;
}> {
  const jobs: ReportJob[] = [];
  const printer = recordingPrinter();
  const code = await run(args, {
    load: () => Promise.resolve(api),
    play:
      play ??
      ((given, done) => {
        jobs.push(...given);
        for (const job of given) {
          const { level, depth, firstSeed, games } = job;
          done({
            ...job,
            figures: api.figuresOf(level, depth, firstSeed, games),
          });
        }
        return Promise.resolve();
      }),
    queue: (_, onWait) => {
      queued.joined++;
      for (const runs of ahead) onWait(runs);
      return Promise.resolve(() => {
        queued.left++;
        queued.playedOnLeaving = jobs.length;
      });
    },
    now: () => 0,
    ...printer,
  });
  return { code, out: printer.out, err: printer.err, jobs, queued };
}

/** Returns the rows of the table printed, each a record of its cells by their headings. */
function tableOf(out: readonly string[]): Record<string, string>[] {
  const [headings = [], , ...rows] = out
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  return rows.map((row) =>
    Object.fromEntries(
      headings.map((heading, column) => [heading, row[column] ?? ""]),
    ),
  );
}

/** Returns the lines printed under the table. */
function shortfallsOf(out: readonly string[]): readonly string[] {
  return out.filter((line) => line !== "" && !line.startsWith("|"));
}

/** Returns figures that play as {@link fine} does, but as a function says for a level on a depth. */
function fineBut(
  level: number,
  depth: number,
  change: (figures: DepthFigures) => Partial<DepthFigures>,
): ReportApi["figuresOf"] {
  return (played, at, _, games) => {
    const figures = fine(played, at, games);
    return played === level && at === depth
      ? { ...figures, ...change(figures) }
      : figures;
  };
}

describe("run", () => {
  it("prints the design's table, a level a row, its figures on fields 11, 16 and 22 side by side, and exits with 0 where no level falls short", async () => {
    const { code, out } = await ran([]);

    expect({ code, rows: tableOf(out).length, first: tableOf(out)[0] }).toEqual(
      {
        code: 0,
        rows: 3,
        first: {
          "#": "1",
          Level: "Bricks",
          "Built around": "A row of bricks",
          Rows: "11",
          Bricks: "20",
          Hits: "30",
          "Solver's rounds": "3-5",
          "Cleared, %": "100 / 98 / 95",
          "Its least": "95, on 22",
          "Its rounds": "8 / 7 / 6",
          "A game's best rally": "15 / 16 / 17",
          "Sweet spot, °": "2.0 / 1.5 / 1.0",
          Narrowest: "1.00, on 22",
          "Blind, most": "10, on 22",
        },
      },
    );
  });

  it("lays the table out as Prettier lays out Markdown, and prints nothing under it where no level falls short", async () => {
    const { out } = await ran(["--set", "second"]);

    expect(out).toEqual(
      tableLines(Object.keys(tableOf(out)[0] ?? {}), [
        Object.values(tableOf(out)[0] ?? {}),
      ]),
    );
  });

  it("plays every level on every depth the game has, 40 games of each player's from its own seeds unless --seeds says, in the order of the levels", async () => {
    const depths = [11, 13, 22];

    const [plain, seeded] = await Promise.all([
      ran([], { api: apiOf({ depths }) }),
      ran(["--seeds", "7"], { api: apiOf({ depths }) }),
    ]);

    expect([plain.jobs, seeded.jobs.map(({ games }) => games)]).toEqual([
      MADE_UP.flatMap(({ number }) =>
        depths.map((depth) => ({
          level: number,
          depth,
          firstSeed: number * SEED_STRIDE,
          games: REPORT_SEEDS,
        })),
      ),
      Array.from({ length: 9 }, () => 7),
    ]);
  });

  it("judges a level on every depth, though the table shows three", async () => {
    const api = apiOf({
      depths: [11, 13, 16, 22],
      figuresOf: fineBut(1, 13, ({ cleared }) => ({
        cleared: cleared - 2,
        blind: 6,
        sweetSpot: 0.9,
      })),
    });

    const { out } = await ran([], { api });

    expect(tableOf(out)[0]).toMatchObject({
      "Cleared, %": "100 / 98 / 95",
      "Its least": "95, on 13",
      Narrowest: "0.90, on 13",
      "Blind, most": "15, on 13",
    });
  });

  it.each([
    [
      "has no line",
      2,
      fineBut(2, 16, () => ({ rounds: null })),
      { "Solver's rounds": "none on 16" },
      "Level 2, Steel, has no line on a field 16 deep: the solver can't clear it with a row to spare.",
    ],
    [
      "has no line on several depths",
      2,
      (level: number, depth: number, _: number, games: number) => ({
        ...fine(level, depth, games),
        rounds: level === 2 && depth > 11 ? null : level,
      }),
      { "Solver's rounds": "none on 16, 22" },
      "Level 2, Steel, has no line on fields 16 and 22 deep: the solver can't clear it with a row to spare.",
    ],
    [
      "is cleared under its set's floor",
      1,
      fineBut(1, 16, () => ({ cleared: 35, clearedRounds: 35 * 7 })),
      { "Cleared, %": "100 / 88 / 95", "Its least": "88, on 16" },
      "Level 1, Bricks, is cleared 87.5 times in 100 on a field 16 deep, under First's floor of 90.",
    ],
    [
      "is cleared in no game",
      3,
      fineBut(3, 22, () => ({ cleared: 0, clearedRounds: 0 })),
      { "Its least": "0, on 22", "Its rounds": "8 / 7 / -" },
      "Level 3, Arc, is cleared 0 times in 100 on a field 22 deep, under Second's floor of 40.",
    ],
    [
      "is cleared blind over the ceiling",
      3,
      fineBut(3, 11, () => ({ blind: 31 })),
      { "Blind, most": "78, on 11" },
      "Level 3, Arc, is cleared blind 77.5 times in 100 on a field 11 deep, more than 75.",
    ],
    [
      "leaves too narrow a sweet spot",
      3,
      fineBut(3, 22, () => ({ sweetSpot: 0.5 })),
      { Narrowest: "0.50, on 22" },
      "Level 3, Arc, leaves a sweet spot of 0.50° on a field 22 deep, under 0.75°.",
    ],
  ])(
    "says, under the table, that a level %s, and exits with 1",
    async (_, level, figuresOf, cells, says) => {
      const { code, out } = await ran([], { api: apiOf({ figuresOf }) });

      expect({
        code,
        row: tableOf(out)[level - 1],
        shortfalls: shortfallsOf(out),
      }).toEqual({
        code: 1,
        row: expect.objectContaining(cells) as unknown,
        shortfalls: [says],
      });
    },
  );

  it("shows a dash for the middle of a depth's best rallies where it has none", async () => {
    const api = apiOf({ figuresOf: fineBut(1, 22, () => ({ bests: [] })) });

    const { out } = await ran([], { api });

    expect(tableOf(out)[0]?.["A game's best rally"]).toBe("15 / 16 / -");
  });

  it("writes 100 as the least of a level cleared in every game on every depth", async () => {
    const api = apiOf({
      figuresOf: (level, depth, _, games) => ({
        ...fine(level, depth, games),
        cleared: games,
      }),
    });

    const { out } = await ran([], { api });

    expect(tableOf(out)[0]?.["Its least"]).toBe("100");
  });

  it("writes 0 as the most blind of a level no aim drawn blind cleared on any depth", async () => {
    const api = apiOf({
      figuresOf: (level, depth, _, games) => ({
        ...fine(level, depth, games),
        blind: 0,
      }),
    });

    const { out } = await ran([], { api });

    expect(tableOf(out)[0]?.["Blind, most"]).toBe("0");
  });

  it("judges a level by its count in 100 as played, though the table rounds it", async () => {
    const api = apiOf({
      figuresOf: fineBut(1, 16, () => ({ cleared: 179, clearedRounds: 179 })),
    });

    const { code, out } = await ran(["--seeds", "200"], { api });

    expect({
      code,
      least: tableOf(out)[0]?.["Its least"],
      shortfalls: shortfallsOf(out),
    }).toEqual({
      code: 1,
      least: "90, on 16",
      shortfalls: [
        "Level 1, Bricks, is cleared 89.5 times in 100 on a field 16 deep, under First's floor of 90.",
      ],
    });
  });

  it("plays only a set's levels for --set", async () => {
    const { jobs, out } = await ran(["--set", "second"]);

    expect({
      levels: [...new Set(jobs.map(({ level }) => level))],
      rows: tableOf(out).map((row) => row["Level"]),
    }).toEqual({ levels: [3], rows: ["Arc"] });
  });

  it("says how many runs it waits for in the queue, and how long it waited, before it plays anything, and leaves once it has played every job", async () => {
    const { out, jobs, queued } = await ran(["--set", "second"], {
      ahead: [2, 1],
    });

    expect({ printed: out.slice(0, 3), queued }).toEqual({
      printed: [waitingWords(2), waitingWords(1), waitedWords(0)],
      queued: { joined: 1, left: 1, playedOnLeaving: jobs.length },
    });
  });

  it("throws, naming the level and the depth, where a job comes back unplayed", async () => {
    const api = apiOf();
    const play: NonNullable<ReportIo["play"]> = (jobs, done) => {
      for (const job of jobs.filter(
        ({ level, depth }) => level !== 2 || depth !== 16,
      )) {
        const { level, depth, firstSeed, games } = job;
        done({
          ...job,
          figures: api.figuresOf(level, depth, firstSeed, games),
        });
      }
      return Promise.resolve();
    };

    const outcome = ran([], { api, play });

    await expect(outcome).rejects.toThrow(
      "Level 2 came back unplayed on a field 16 deep.",
    );
  });

  it("leaves the queue where playing fails", async () => {
    const queued = heardNothing();
    const play = (): Promise<void> =>
      Promise.reject(new Error("A thread failed."));

    const outcome = ran([], { play, queued });

    await expect(outcome).rejects.toThrow("A thread failed.");
    expect(queued).toEqual({ joined: 1, left: 1, playedOnLeaving: 0 });
  });

  it("throws for a set the game holds to no floor, before it waits its turn or plays anything", async () => {
    const queued = heardNothing();
    const api = apiOf({ floors: { first: 90 } });

    const outcome = ran([], { api, queued });

    await expect(outcome).rejects.toThrow('The set "second" has no floor.');
    expect(queued.joined).toBe(0);
  });

  it("prints the usage asked for and exits with 0, playing nothing", async () => {
    const { code, out, jobs, queued } = await ran(["--help"]);

    expect({ code, out, jobs, joined: queued.joined }).toEqual({
      code: 0,
      out: [expect.stringMatching(/^Usage: yarn report:levels/) as unknown],
      jobs: [],
      joined: 0,
    });
  });

  it.each([
    [
      ["--set", "third"],
      /^--set takes "first" or "second", not "third"\.\n\nUsage:/,
    ],
    [
      ["--seeds", "0"],
      /^--seeds takes a whole number from 1, not "0"\.\n\nUsage:/,
    ],
    [["--depth", "11"], /^Unknown option '--depth'/],
  ])(
    "prints what is wrong with %j as an error, and exits with 2, playing nothing",
    async (args, says) => {
      const { code, err, jobs, queued } = await ran(args);

      expect({ code, err, jobs, joined: queued.joined }).toEqual({
        code: 2,
        err: [expect.stringMatching(says) as unknown],
        jobs: [],
        joined: 0,
      });
    },
  );
});

describe("tableLines", () => {
  it("lays out each column as wide as its widest cell, three at the least, with a rule under the headings", () => {
    const lines = tableLines(
      ["#", "Level"],
      [
        ["1", "Bricks"],
        ["10", "Arc"],
      ],
    );

    expect(lines).toEqual([
      "| #   | Level  |",
      "| --- | ------ |",
      "| 1   | Bricks |",
      "| 10  | Arc    |",
    ]);
  });
});

describe("SHOWN_DEPTHS", () => {
  it("shows depths a field has", () => {
    expect(SHOWN_DEPTHS.every((depth) => DEPTHS.includes(depth))).toBe(true);
  });
});

describe("serveJobs", () => {
  it("posts back each job posted to it with its figures", async () => {
    const { port1, port2 } = new MessageChannel();
    serveJobs(port1, apiOf());
    const played = new Promise((resolve) => {
      port2.once("message", resolve);
    });
    const job: ReportJob = { level: 2, depth: 16, firstSeed: 2000, games: 5 };

    port2.postMessage(job);

    await expect(played).resolves.toEqual({ ...job, figures: fine(2, 16, 5) });
    port1.close();
  });
});

describe("the pool", () => {
  it("has a thread for each core run this script, marked as the report's", () => {
    expect(poolOf()).toEqual({
      script: new URL("./report-levels.mjs", import.meta.url),
      threads: availableParallelism(),
      workerData: { pool: "rickashay-report" },
    });
  });

  it("loads the game's API, of the report's type, through Vite", async () => {
    const api: ReportApi = REPORT_API;

    const loaded = await loadReportApi();

    expect({
      levels: loaded.levels.length,
      depths: loaded.depths,
      floors: loaded.floors,
    }).toEqual({
      levels: api.levels.length,
      depths: api.depths,
      floors: api.floors,
    });
  });

  it("plays each job dealt to its threads, which load the game's API through Vite, and hands it back with its figures", async () => {
    const jobs: readonly ReportJob[] = [
      { level: 1, depth: 22, firstSeed: 1000, games: 2 },
      { level: 2, depth: 11, firstSeed: 2000, games: 1 },
      { level: 1, depth: 11, firstSeed: 1000, games: 1 },
    ];
    const played: PlayedJob[] = [];

    await solveOnThreads(jobs, (each: PlayedJob) => played.push(each), {
      ...poolOf(),
      threads: 2,
    });

    expect(played).toEqual(
      expect.arrayContaining(
        jobs.map((job) => ({
          ...job,
          figures: REPORT_API.figuresOf(
            job.level,
            job.depth,
            job.firstSeed,
            job.games,
          ),
        })),
      ),
    );
    expect(played).toHaveLength(jobs.length);
  }, 30_000);

  it("rejects, naming the level and the depth, where a thread fails to play a job", async () => {
    const jobs: readonly ReportJob[] = [
      { level: 99, depth: 11, firstSeed: 99_000, games: 1 },
    ];

    const played = solveOnThreads(jobs, () => undefined, {
      ...poolOf(),
      threads: 1,
    });

    await expect(played).rejects.toThrow(
      "Playing level 99 on a field 11 deep failed.",
    );
  }, 30_000);
});
