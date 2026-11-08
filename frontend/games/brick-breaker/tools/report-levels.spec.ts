import type { AutopilotReport, LevelEntry, Rules } from "./report-levels.mjs";
import { run } from "./report-levels.mjs";

/** What the report prints for `--help`. */
const USAGE = `Usage: yarn report:levels [options]

Prints how the autopilot plays every level at every preset speed.

  --seeds <n>     Play each level from n seeds of its own (default: from its
                  number alone)
  --height <n>    Play on a field n units tall (default: the shortest)
  -h, --help      Show this message`;

/** How a spec's level is played: at a speed, from a seed, on a field. */
type Played = [level: number, speed: string, seed: number, height: number];

/** Returns a play that cleared its level in the steps given, over its last bricks in `endgame`. */
function cleared(steps: number, endgame = 30): AutopilotReport {
  return {
    cleared: true,
    steps,
    endgameSteps: endgame,
    bounces: 40,
    livesLost: 0,
  };
}

/** Returns a play that didn't clear its level. */
function lost(): AutopilotReport {
  return { ...cleared(300), cleared: false, livesLost: 3 };
}

/**
 * Returns rules over a level of a short name and one of a long, two speeds,
 * a step a second, a field from 30 to 40 units tall whose last bricks may
 * take twice its height in steps, and each play as `play` says, by default
 * cleared in 75 seconds, its last bricks in 30.
 */
function rulesOf(
  play: (entry: LevelEntry, speed: string) => AutopilotReport = () =>
    cleared(75),
  played: Played[] = [],
): Rules {
  return {
    levels: [
      { number: 1, data: { id: "wall", name: "Wall" } },
      { number: 12, data: { id: "keep", name: "The castle keep" } },
    ],
    speeds: ["relaxed", "fast"],
    stepSeconds: 1,
    leastHeight: 30,
    tallest: 40,
    limitsOf: (height) => ({ level: 600, endgame: 2 * height }),
    playLevel: (entry, speed, { seed, height }) => {
      played.push([entry.number, speed, seed, height]);
      return play(entry, speed);
    },
  };
}

/**
 * Returns the code the report exits with for a command line, over some
 * rules, and the lines it printed, as its output and as what went wrong.
 */
async function ran(
  args: readonly string[],
  rules: Rules = rulesOf(),
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, {
    load: () => Promise.resolve(rules),
    print: (line) => out.push(line),
    printError: (line) => err.push(line),
  });
  return { code, out, err };
}

describe("run", () => {
  it("lays the names out as wide as the longest, each speed's time, last bricks, bounces and lives lost beside them, and exits with 0", async () => {
    expect(await ran([])).toEqual({
      code: 0,
      out: [
        "                     relaxed                       fast",
        "                      time   last  bounces  lost    time   last  bounces  lost",
        " 1 Wall               1:15   0:30       40     0    1:15   0:30       40     0",
        "12 The castle keep    1:15   0:30       40     0    1:15   0:30       40     0",
      ],
      err: [],
    });
  });

  it("plays each level at each speed from its number, on the least field", async () => {
    const played: Played[] = [];

    await ran([], rulesOf(undefined, played));

    expect(played).toEqual([
      [1, "relaxed", 1, 30],
      [1, "fast", 1, 30],
      [12, "relaxed", 12, 30],
      [12, "fast", 12, 30],
    ]);
  });

  it("plays each level from seeds of its own on the field asked, with --seeds and --height", async () => {
    const played: Played[] = [];

    await ran(["--seeds", "2", "--height", "35"], rulesOf(undefined, played));

    expect(played.slice(0, 2)).toEqual([
      [1, "relaxed", 1000, 35],
      [1, "relaxed", 1001, 35],
    ]);
  });

  it.each([["--help"], ["-h"]])(
    "prints the usage for %s and exits with 0, playing nothing",
    async (flag) => {
      const played: Played[] = [];

      const result = await ran([flag], rulesOf(undefined, played));

      expect({ ...result, played }).toEqual({
        code: 0,
        out: [expect.stringMatching(/^Usage: yarn report:levels/) as unknown],
        err: [],
        played: [],
      });
    },
  );

  it.each([
    [["--seeds", "0"], `--seeds takes a whole number from 1, not "0".`],
    [["--seeds", "x"], `--seeds takes a whole number from 1, not "x".`],
    [
      ["--height", "29"],
      `--height takes a whole number from 30 to 40, not "29".`,
    ],
    [
      ["--height", "41"],
      `--height takes a whole number from 30 to 40, not "41".`,
    ],
    [
      ["--height", "32.5"],
      `--height takes a whole number from 30 to 40, not "32.5".`,
    ],
    [["--level", "3"], "Unknown option '--level'"],
  ])(
    "prints what is wrong with %j, a blank line and the usage as an error, and exits with 2, playing nothing",
    async (args, problem) => {
      const played: Played[] = [];

      const result = await ran(args, rulesOf(undefined, played));

      expect({ ...result, played }).toEqual({
        code: 2,
        out: [],
        err: [`${problem}\n\n${USAGE}`],
        played: [],
      });
    },
  );

  it("marks a play that didn't clear its level, says how many, and exits with 1", async () => {
    const rules = rulesOf((entry, speed) =>
      entry.number === 12 && speed === "fast" ? lost() : cleared(75),
    );

    const { code, out } = await ran([], rules);

    expect({ code, out: out.slice(3) }).toEqual({
      code: 1,
      out: [
        "12 The castle keep    1:15   0:30       40     0       -   0:30       40     3",
        "",
        "1 plays didn't clear their level (-).",
      ],
    });
  });

  it("fails on a play from a level's number that took longer over its last bricks than the spec allows on the least field", async () => {
    const rules = rulesOf((entry) => cleared(75, entry.number === 1 ? 61 : 30));

    const { code, out } = await ran([], rules);

    expect({ code, out: out.slice(2) }).toEqual({
      code: 1,
      out: [
        " 1 Wall               1:15  1:01!       40     0    1:15  1:01!       40     0",
        "12 The castle keep    1:15   0:30       40     0    1:15   0:30       40     0",
        "",
        "2 plays took longer than the spec allows over their level's last bricks (!).",
      ],
    });
  });

  it("marks a play from seeds of its own that took longer over its last bricks, but passes", async () => {
    const rules = rulesOf((entry) => cleared(75, entry.number === 1 ? 61 : 30));

    const { code, out } = await ran(["--seeds", "2"], rules);

    expect({ code, last: out.at(-1) }).toEqual({
      code: 0,
      last: "4 plays took longer than the spec allows over their level's last bricks (!).",
    });
  });

  it("holds the last bricks on a taller field to what it allows, marking those longer, but passes", async () => {
    const rules = rulesOf((entry) => cleared(75, entry.number === 1 ? 71 : 70));

    const { code, out } = await ran(["--height", "35"], rules);

    expect({ code, out: out.slice(2) }).toEqual({
      code: 0,
      out: [
        " 1 Wall               1:15  1:11!       40     0    1:15  1:11!       40     0",
        "12 The castle keep    1:15   1:10       40     0    1:15   1:10       40     0",
        "",
        "2 plays took longer than a field 35 tall allows over their level's last bricks (!).",
      ],
    });
  });
});
