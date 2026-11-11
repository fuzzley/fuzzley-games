import { recordingPrinter } from "@fz/dev/script";
import { LEVELS, parseLevel } from "../src/rules/levels/levels";
import { DEPTHS } from "../src/rules/wall/wall";
import { playCasually } from "../src/testing/casual";
import { FLOOR_DEPTHS, FLOOR_SEEDS } from "../src/testing/every_level";
import type {
  CasualPlay,
  ReportApi,
  ScriptLevel,
} from "../src/testing/script_api";
import {
  REPORT_DEPTHS,
  REPORT_SEEDS,
  loadReportApi,
  readCommandLine,
  run,
} from "./report-levels.mjs";

/** Made-up levels: two in a set held to 90 in 100, the second with the longest name, and one in a set held to 40. */
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
    data: { id: "zap", name: "Zap" },
  },
];

/** Returns a game that cleared its level in the rounds given, the wall jumping once. */
function cleared(rounds: number): CasualPlay {
  return { cleared: true, rounds, jumps: 1 };
}

/** Returns a game that lost its level in 10 rounds. */
function lost(): CasualPlay {
  return { cleared: false, rounds: 10, jumps: 0 };
}

/**
 * Returns a report's API over the made-up levels on every depth, each game
 * as `play` says, by default cleared in 6 rounds.
 */
function apiOf(play: ReportApi["playCasually"] = () => cleared(6)): ReportApi {
  return {
    levels: MADE_UP,
    depths: DEPTHS,
    floors: { first: 90, second: 40 },
    playCasually: play,
  };
}

/**
 * Returns the code the report exits with for a command line, over an API,
 * and the lines it printed, as its output and as what went wrong.
 */
async function ran(args: readonly string[], api: ReportApi = apiOf()) {
  const printer = recordingPrinter();
  const code = await run(args, {
    load: () => Promise.resolve(api),
    ...printer,
  });
  return { code, out: printer.out, err: printer.err };
}

describe("readCommandLine", () => {
  it("asks for forty games a level on the report's own depths by default", () => {
    expect(readCommandLine([])).toEqual({ seeds: 40, depths: undefined });
  });

  it("reads the seeds and each depth", () => {
    expect(
      readCommandLine(["--seeds", "12", "--depth", "16", "--depth", "11"]),
    ).toEqual({ seeds: 12, depths: ["16", "11"] });
  });

  it.each([["--help"], ["-h"]])("prints the usage for %s", (flag) => {
    expect(readCommandLine([flag])).toEqual({
      code: 0,
      message: expect.stringMatching(/^Usage: yarn report:levels/) as unknown,
    });
  });

  it.each([
    [["--seeds", "0"], `--seeds takes a whole number from 1, not "0".`],
    [["--level", "3"], "Unknown option '--level'"],
    [["--depth"], "Option '--depth <value>' argument missing"],
  ])("exits with 2 for %j, saying why", (args, problem) => {
    expect(readCommandLine(args)).toEqual({
      code: 2,
      message: expect.stringContaining(problem) as unknown,
    });
  });
});

describe("the report's defaults", () => {
  it("play the depths the specs hold the floors on", () => {
    expect(REPORT_DEPTHS).toEqual(FLOOR_DEPTHS);
  });

  it("play more games than the specs, the specs' first among them", () => {
    expect(REPORT_SEEDS).toBeGreaterThan(FLOOR_SEEDS);
  });
});

describe("run", () => {
  it("lays the names out as wide as the longest, each depth's clears, rounds and jumps beside them", async () => {
    expect(await ran([])).toEqual({
      code: 0,
      out: [
        "                   11 deep              13 deep              22 deep",
        "                   clear rounds jumps   clear rounds jumps   clear rounds jumps",
        " 1 Bricks            100      6   1.0     100      6   1.0     100      6   1.0",
        " 2 All the steel     100      6   1.0     100      6   1.0     100      6   1.0",
        " 3 Zap               100      6   1.0     100      6   1.0     100      6   1.0",
      ],
      err: [],
    });
  });

  it("plays the depths --depth names, shallowest first, each once", async () => {
    const { out } = await ran([
      "--depth",
      "16",
      "--depth",
      "12",
      "--depth",
      "16",
    ]);

    expect(out[0]).toBe("                   12 deep              16 deep");
  });

  it("plays each level from seeds of its own a thousand apart, as the specs number them", async () => {
    const seeds: [number, number, number][] = [];
    const api = apiOf((level, depth, seed) => {
      seeds.push([level, depth, seed]);
      return cleared(6);
    });

    await ran(["--seeds", "2", "--depth", "11"], api);

    expect(seeds).toEqual([
      [1, 11, 1000],
      [1, 11, 1001],
      [2, 11, 2000],
      [2, 11, 2001],
      [3, 11, 3000],
      [3, 11, 3001],
    ]);
  });

  it("shows the rounds and jumps at the mean, and counts the games lost without failing over a level its floor holds", async () => {
    const api = apiOf((level, _depth, seed) =>
      level === 3 && seed % 2 === 0 ? lost() : cleared(4 + (seed % 4)),
    );

    expect(await ran(["--seeds", "4", "--depth", "22"], api)).toEqual({
      code: 0,
      out: [
        "                   22 deep",
        "                   clear rounds jumps",
        " 1 Bricks            100      6   1.0",
        " 2 All the steel     100      6   1.0",
        " 3 Zap                50      8   0.5",
        "",
        "2 plays didn't clear their level.",
      ],
      err: [],
    });
  });

  it("marks a level under its set's floor on a depth, says how many games were, and fails", async () => {
    const api = apiOf((level, depth, seed) =>
      level === 2 && depth === 13 && seed % 10 < 2 ? lost() : cleared(6),
    );

    expect(await ran(["--seeds", "10"], api)).toEqual({
      code: 1,
      out: [
        "                   11 deep              13 deep              22 deep",
        "                   clear rounds jumps   clear rounds jumps   clear rounds jumps",
        " 1 Bricks            100      6   1.0     100      6   1.0     100      6   1.0",
        " 2 All the steel     100      6   1.0     80!      7   0.8     100      6   1.0",
        " 3 Zap               100      6   1.0     100      6   1.0     100      6   1.0",
        "",
        "2 plays didn't clear their level.",
        "10 plays were of a level under its set's floor on their depth (!).",
      ],
      err: [],
    });
  });

  it("holds a level cleared as often as its set's floor asks to it, unmarked", async () => {
    const api = apiOf((level, _depth, seed) =>
      level === 1 && seed % 10 === 0 ? lost() : cleared(6),
    );

    const { code, out } = await ran(["--seeds", "10", "--depth", "11"], api);

    expect({ code, bricks: out[2] }).toEqual({
      code: 0,
      bricks: " 1 Bricks             90      6   0.9",
    });
  });

  it("throws for a level whose set has no floor, before it plays anything", async () => {
    const played: number[] = [];
    const api: ReportApi = {
      ...apiOf((level) => {
        played.push(level);
        return cleared(6);
      }),
      floors: { first: 90 },
    };

    await expect(ran([], api)).rejects.toThrow(
      'The set "second" has no floor.',
    );
    expect(played).toEqual([]);
  });

  it("prints the usage asked for and exits with 0", async () => {
    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [expect.stringMatching(/^Usage: yarn report:levels/) as unknown],
      err: [],
    });
  });

  it("prints what is wrong with a depth, a blank line and the usage as an error, and exits with 2, playing nothing", async () => {
    expect(await ran(["--depth", "23"])).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^--depth takes a whole number from 11 to 22, not "23"\.\n\nUsage: yarn report:levels/,
        ) as unknown,
      ],
    });
  });
});

describe("loadReportApi", () => {
  it("loads what the report plays through Vite, a game played as the careless player plays it", async () => {
    const api = await loadReportApi();
    const [entry] = LEVELS;

    const played = api.playCasually(1, 22, 1000);

    expect({ levels: api.levels.length, played }).toEqual({
      levels: LEVELS.length,
      played: playCasually(parseLevel(entry!.data), 22, 1000),
    });
  });
});
