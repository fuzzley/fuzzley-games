import { SPEEDS } from "../src/rules/speed";
import { WAVES, waveEntryOf } from "../src/rules/waves/waves";
import { WIDEST, playWave } from "../src/testing/autopilot";
import type {
  ReportApi,
  ReportPlay,
  ScriptSpeed,
  WavePlayed,
} from "../src/testing/script_api";
import {
  loadReportApi,
  readCommandLine,
  report,
  run,
} from "./report-waves.mjs";

type Request = Parameters<typeof report>[1];

/** Asks for every written wave on the narrowest field, each from its number. */
const EVERY_WAVE: Request = {
  seeds: undefined,
  field: "narrow",
  endless: false,
};

/** Returns a play that cleared its wave in the steps given, bringing home one stray of two. */
function cleared(steps: number): WavePlayed {
  return { cleared: true, steps, shipsLost: 0, straysSent: 2, straysHome: 1 };
}

/** Returns a play that didn't clear its wave. */
function lost(): WavePlayed {
  return { ...cleared(300), cleared: false, shipsLost: 3 };
}

/**
 * Returns a report's API over a wave of a short name and one of a long, an
 * Endless wave, two speeds, a step a second and a limit of four minutes,
 * each play as `play` says, by default cleared in 75 seconds.
 */
function apiOf(
  play: (
    wave: number,
    speed: ScriptSpeed,
    how: ReportPlay,
  ) => WavePlayed = () => cleared(75),
): ReportApi {
  return {
    waves: [
      { number: 1, data: { name: "Drift" } },
      { number: 30, data: { name: "Eye of the storm" } },
    ],
    endless: [{ number: 31, data: { name: "Endless" } }],
    speeds: ["relaxed", "fast"],
    stepSeconds: 1,
    limit: 240,
    fields: {
      narrow: { width: 40, height: 40 },
      wide: { width: 88, height: 40 },
      tall: { width: 40, height: 88 },
    },
    playWave: play,
  };
}

/** Returns the lines a report prints, and the code it returns to exit with. */
function reported(
  api: ReportApi,
  request: Request,
): { lines: string[]; code: number } {
  const lines: string[] = [];
  const code = report(api, request, (line) => lines.push(line));
  return { lines, code };
}

/**
 * Returns the code the report exits with for a command line, over an API,
 * and the lines it printed, as its output and as what went wrong.
 */
async function ran(
  args: readonly string[],
  api: ReportApi = apiOf(),
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, {
    load: () => Promise.resolve(api),
    print: (line) => out.push(line),
    printError: (line) => err.push(line),
  });
  return { code, out, err };
}

describe("readCommandLine", () => {
  it("asks for every written wave on the narrowest field, each from its number, by default", () => {
    expect(readCommandLine([])).toEqual(EVERY_WAVE);
  });

  it("reads the seeds, the field and Endless", () => {
    expect(
      readCommandLine(["--seeds", "12", "--field", "tall", "--endless"]),
    ).toEqual({ seeds: 12, field: "tall", endless: true });
  });

  it.each([["--help"], ["-h"]])("prints the usage for %s", (flag) => {
    expect(readCommandLine([flag])).toEqual({
      code: 0,
      message: expect.stringMatching(/^Usage: yarn report:waves/) as unknown,
    });
  });

  it.each([
    [["--seeds", "x"], `--seeds takes a whole number from 1, not "x".`],
    [["--seeds", "0"], `--seeds takes a whole number from 1, not "0".`],
    [["--seeds", "1.5"], `--seeds takes a whole number from 1, not "1.5".`],
    [
      ["--field", "huge"],
      `--field takes "narrow", "wide" or "tall", not "huge".`,
    ],
    [["--wave", "3"], "Unknown option '--wave'"],
    [["--seeds"], "Option '--seeds <value>' argument missing"],
    [["3"], "Unexpected argument '3'"],
  ])("exits with 2 for %j, saying why", (args, problem) => {
    expect(readCommandLine(args)).toEqual({
      code: 2,
      message: expect.stringContaining(problem) as unknown,
    });
  });

  it("follows what is wrong with the usage", () => {
    expect(readCommandLine(["--field", "huge"])).toEqual({
      code: 2,
      message: expect.stringMatching(
        /^--field takes [^]*\n\nUsage: yarn report:waves/,
      ) as unknown,
    });
  });
});

describe("report", () => {
  it("lays the names out as wide as the longest, each speed's time, ships lost and strays home beside them", () => {
    expect(reported(apiOf(), EVERY_WAVE).lines).toEqual([
      "                      relaxed             fast",
      "                       time  lost  home    time  lost  home",
      " 1 Drift               1:15     0   1/2    1:15     0   1/2",
      "30 Eye of the storm    1:15     0   1/2    1:15     0   1/2",
    ]);
  });

  it("plays Endless's waves, laid out as wide as their own names, with --endless", () => {
    expect(reported(apiOf(), { ...EVERY_WAVE, endless: true }).lines).toEqual([
      "             relaxed             fast",
      "              time  lost  home    time  lost  home",
      "31 Endless    1:15     0   1/2    1:15     0   1/2",
    ]);
  });

  it("plays each wave from its number on the field asked, untouchable, then as the spec plays it", () => {
    const plays: [number, ScriptSpeed, ReportPlay][] = [];
    const api = apiOf((wave, speed, how) => {
      plays.push([wave, speed, how]);
      return cleared(75);
    });

    reported(api, { ...EVERY_WAVE, field: "wide" });

    expect(plays.slice(0, 2)).toEqual([
      [1, "relaxed", { seed: 1, torus: api.fields.wide, invulnerable: true }],
      [1, "relaxed", { seed: 1, torus: api.fields.wide, invulnerable: false }],
    ]);
  });

  it("plays each wave from seeds of its own a thousand apart with --seeds, showing the middle time and the longest", () => {
    const api = apiOf((_wave, _speed, how) =>
      cleared(60 * ((how.seed % 1000) + 1)),
    );

    expect(reported(api, { ...EVERY_WAVE, seeds: 3 }).lines).toEqual([
      "                      relaxed                      fast",
      "                      middle  most  lost    home   middle  most  lost    home",
      " 1 Drift                2:00  3:00     0     3/6     2:00  3:00     0     3/6",
      "30 Eye of the storm     2:00  3:00     0     3/6     2:00  3:00     0     3/6",
    ]);
  });

  it("marks a play that didn't clear its wave, or not before the limit, says how many, and fails", () => {
    const api = apiOf((wave, speed, how) => {
      if (wave === 1 && speed === "fast") return cleared(240);
      if (wave === 30 && speed === "fast" && !how.invulnerable) return lost();
      return cleared(75);
    });

    expect(reported(api, EVERY_WAVE)).toEqual({
      lines: [
        "                      relaxed             fast",
        "                       time  lost  home    time  lost  home",
        " 1 Drift               1:15     0   1/2       -     -   1/2",
        "30 Eye of the storm    1:15     0   1/2    1:15     -   1/2",
        "",
        "3 plays didn't clear their wave in time (-).",
      ],
      code: 1,
    });
  });

  it("counts only the untouchable plays of Endless's waves against it", () => {
    const api = apiOf((_wave, _speed, how) =>
      how.invulnerable ? cleared(75) : lost(),
    );

    expect(reported(api, { ...EVERY_WAVE, endless: true })).toEqual({
      lines: [
        "             relaxed             fast",
        "              time  lost  home    time  lost  home",
        "31 Endless    1:15     -   1/2    1:15     -   1/2",
      ],
      code: 0,
    });
  });
});

describe("run", () => {
  it("prints the report and exits with 0 when every play cleared its wave in time", async () => {
    expect(await ran([])).toEqual({
      code: 0,
      out: reported(apiOf(), EVERY_WAVE).lines,
      err: [],
    });
  });

  it("prints the usage asked for and exits with 0", async () => {
    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [expect.stringMatching(/^Usage: yarn report:waves/) as unknown],
      err: [],
    });
  });

  it("prints what is wrong with a command line, a blank line and the usage as an error, and exits with 2, playing nothing", async () => {
    expect(await ran(["--field", "huge"])).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^--field takes [^]*\n\nUsage: yarn report:waves/,
        ) as unknown,
      ],
    });
  });

  it("exits with 1 when a play didn't clear its wave in time, saying how many", async () => {
    const { code, out, err } = await ran([], apiOf(lost));

    expect({ code, last: out.at(-1), err }).toEqual({
      code: 1,
      last: "8 plays didn't clear their wave in time (-).",
      err: [],
    });
  });
});

describe("loadReportApi", () => {
  it("loads what the report plays through Vite, as the script does, a wave played as the autopilot plays it", async () => {
    const api = await loadReportApi();
    const how = { seed: 1, torus: WIDEST, invulnerable: true };

    const played = api.playWave(1, "relaxed", how);

    expect({ speeds: api.speeds, waves: api.waves.length, played }).toEqual({
      speeds: SPEEDS,
      waves: WAVES.length,
      played: playWave(waveEntryOf(WAVES, 1), "relaxed", how),
    });
  });
});
