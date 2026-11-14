import { SEED_STRIDE } from "@fz/dev/report";
import { recordingPrinter } from "@fz/dev/script";
import type { AutopilotReport, LevelEntry, Rules } from "./report-levels.mjs";
import { run } from "./report-levels.mjs";

/** What the report prints for `--help`. */
const USAGE = `Usage: yarn report:levels [options]

Prints how the autopilot plays every level at every preset speed.

  --seeds <n>     Play each level from n seeds of its own (default: from its
                  number alone)
  --height <n>    Play on a field n units tall (default: the shortest)
  --marks         Print each level's mark, the streak its third star asks
                  for: the middle of its best streaks from 12 seeds at
                  Normal, rounded down to a multiple of 5, and 5 at least
  -h, --help      Show this message

Signs: - for a play that didn't clear its level; ! for a time over the last
bricks longer than the field allows; ^ for a play that went past a minute
between two touches of the paddle; and, with --seeds on the least field,
+ for a level whose middle time at Relaxed is past 2:00.`;

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
    bestStreak: 12,
    longestAway: 8,
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
  play: (
    entry: LevelEntry,
    speed: string,
    seed: number,
  ) => AutopilotReport = () => cleared(75),
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
      return play(entry, speed, seed);
    },
  };
}

/**
 * Returns rules whose plays of each level, from its seeds in turn, clear
 * it in the seconds given: the wall's in `wall`, the keep's in `keep`.
 */
function timedRules(wall: readonly number[], keep: readonly number[]): Rules {
  return rulesOf((entry, _, seed) => {
    const times = entry.number === 1 ? wall : keep;
    const time = times[seed % SEED_STRIDE];
    if (time === undefined) {
      throw new Error(
        `No time for seed ${String(seed)} of level ${String(entry.number)}.`,
      );
    }
    return cleared(time);
  });
}

/** Returns rules with the speed `--marks` plays at, Normal, between their two. */
function withNormal(rules: Rules): Rules {
  return { ...rules, speeds: ["relaxed", "normal", "fast"] };
}

/**
 * Returns the code the report exits with for a command line, over some
 * rules, and the lines it printed, as its output and as what went wrong.
 */
async function ran(
  args: readonly string[],
  rules: Rules = rulesOf(),
): Promise<{ code: number; out: readonly string[]; err: readonly string[] }> {
  const printer = recordingPrinter();
  const code = await run(args, {
    load: () => Promise.resolve(rules),
    ...printer,
  });
  return { code, out: printer.out, err: printer.err };
}

describe("run", () => {
  it("lays the names out as wide as the longest, each speed's time, last bricks, bounces, lives lost, longest streak and longest between two touches of the paddle beside them, and exits with 0", async () => {
    expect(await ran([])).toEqual({
      code: 0,
      out: [
        "                     relaxed                                      fast",
        "                      time   last  bounces  lost  streak   away    time   last  bounces  lost  streak   away",
        " 1 Wall               1:15   0:30       40     0      12   0:08    1:15   0:30       40     0      12   0:08",
        "12 The castle keep    1:15   0:30       40     0      12   0:08    1:15   0:30       40     0      12   0:08",
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
    [
      ["--marks", "--seeds", "3"],
      "--marks plays 12 seeds at Normal on the least field, so it takes neither --seeds nor --height.",
    ],
    [
      ["--marks", "--height", "35"],
      "--marks plays 12 seeds at Normal on the least field, so it takes neither --seeds nor --height.",
    ],
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

  it("prints the higher middle of a level's longest streaks at each speed with --seeds", async () => {
    const streaks = [30, 5, 9, 7];
    const rules = rulesOf((_, __, seed) => ({
      ...cleared(75),
      bestStreak: streaks[seed % SEED_STRIDE] ?? 0,
    }));

    const { out } = await ran(["--seeds", "4"], rules);

    expect(out[2]).toBe(
      " 1 Wall                1:15  1:15   0:30     0       9   0:08     1:15  1:15   0:30     0       9   0:08",
    );
  });

  it("prints the longest any of a level's plays went between two touches of the paddle at each speed with --seeds", async () => {
    const aways = [10, 40, 25];
    const rules = rulesOf((_, __, seed) => {
      const away = aways[seed % SEED_STRIDE];
      if (away === undefined)
        throw new Error(`No time for seed ${String(seed)}.`);
      return { ...cleared(75), longestAway: away };
    });

    const { out } = await ran(["--seeds", "3"], rules);

    expect(out[2]).toBe(
      " 1 Wall                1:15  1:15   0:30     0      12   0:40     1:15  1:15   0:30     0      12   0:40",
    );
  });

  it("marks a play that went past a minute between two touches of the paddle, says how many, but passes", async () => {
    const rules = rulesOf((entry) => ({
      ...cleared(75),
      longestAway: entry.number === 1 ? 61 : 60,
    }));

    const { code, out } = await ran([], rules);

    expect({ code, out: out.slice(2) }).toEqual({
      code: 0,
      out: [
        " 1 Wall               1:15   0:30       40     0      12  1:01^    1:15   0:30       40     0      12  1:01^",
        "12 The castle keep    1:15   0:30       40     0      12   1:00    1:15   0:30       40     0      12   1:00",
        "",
        "2 plays went past a minute between two touches of the paddle (^).",
      ],
    });
  });

  it("marks the longest between two touches of the paddle past a minute with --seeds, by the seconds it prints, on any field", async () => {
    const rules = {
      ...rulesOf((entry, _, seed) => ({
        ...cleared(750, 60),
        longestAway: entry.number === 1 && seed % SEED_STRIDE === 1 ? 606 : 604,
      })),
      stepSeconds: 0.1,
    };

    const { out } = await ran(["--seeds", "2", "--height", "35"], rules);

    expect(out.slice(2)).toEqual([
      " 1 Wall                1:15  1:15   0:06     0      12  1:01^     1:15  1:15   0:06     0      12  1:01^",
      "12 The castle keep     1:15  1:15   0:06     0      12   1:00     1:15  1:15   0:06     0      12   1:00",
      "",
      "2 plays went past a minute between two touches of the paddle (^).",
    ]);
  });

  it("marks a play that didn't clear its level, says how many, and exits with 1", async () => {
    const rules = rulesOf((entry, speed) =>
      entry.number === 12 && speed === "fast" ? lost() : cleared(75),
    );

    const { code, out } = await ran([], rules);

    expect({ code, out: out.slice(3) }).toEqual({
      code: 1,
      out: [
        "12 The castle keep    1:15   0:30       40     0      12   0:08       -   0:30       40     3      12   0:08",
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
        " 1 Wall               1:15  1:01!       40     0      12   0:08    1:15  1:01!       40     0      12   0:08",
        "12 The castle keep    1:15   0:30       40     0      12   0:08    1:15   0:30       40     0      12   0:08",
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

  it("marks a level whose middle time at Relaxed is past 2:00 with --seeds, by its middle play, at no other speed, but passes", async () => {
    const rules = timedRules([100, 121, 200], [100, 120, 200]);

    const { code, out } = await ran(["--seeds", "3"], rules);

    expect({ code, out: out.slice(2) }).toEqual({
      code: 0,
      out: [
        " 1 Wall               2:01+  3:20   0:30     0      12   0:08     2:01  3:20   0:30     0      12   0:08",
        "12 The castle keep     2:00  3:20   0:30     0      12   0:08     2:00  3:20   0:30     0      12   0:08",
      ],
    });
  });

  it("marks a middle time by the seconds it prints", async () => {
    const rules = {
      ...rulesOf((entry) => cleared(entry.number === 1 ? 1206 : 1204)),
      stepSeconds: 0.1,
    };

    const { out } = await ran(["--seeds", "1"], rules);

    expect(out.slice(2).map((line) => line.slice(0, 27))).toEqual([
      " 1 Wall               2:01+",
      "12 The castle keep     2:00",
    ]);
  });

  it("marks no middle time on a taller field", async () => {
    const rules = timedRules([121], [121]);

    const { out } = await ran(["--seeds", "1", "--height", "35"], rules);

    expect(out[2]).toBe(
      " 1 Wall                2:01  2:01   0:30     0      12   0:08     2:01  2:01   0:30     0      12   0:08",
    );
  });

  it("leaves unmarked a middle time of a play that didn't clear its level, with --seeds", async () => {
    const rules = rulesOf(() => lost());

    const { out } = await ran(["--seeds", "1"], rules);

    expect(out[2]).toBe(
      " 1 Wall                   -     -   0:30     3      12   0:08        -     -   0:30     3      12   0:08",
    );
  });

  it("marks no time past 2:00 without --seeds", async () => {
    const rules = rulesOf(() => cleared(121));

    const { out } = await ran([], rules);

    expect(out[2]).toBe(
      " 1 Wall               2:01   0:30       40     0      12   0:08    2:01   0:30       40     0      12   0:08",
    );
  });

  it("holds the last bricks on a taller field to what it allows, marking those longer, but passes", async () => {
    const rules = rulesOf((entry) => cleared(75, entry.number === 1 ? 71 : 70));

    const { code, out } = await ran(["--height", "35"], rules);

    expect({ code, out: out.slice(2) }).toEqual({
      code: 0,
      out: [
        " 1 Wall               1:15  1:11!       40     0      12   0:08    1:15  1:11!       40     0      12   0:08",
        "12 The castle keep    1:15   1:10       40     0      12   0:08    1:15   1:10       40     0      12   0:08",
        "",
        "2 plays took longer than a field 35 tall allows over their level's last bricks (!).",
      ],
    });
  });

  it("plays each level from 12 seeds of its own at Normal alone, on the least field, with --marks", async () => {
    const played: Played[] = [];

    await ran(["--marks"], withNormal(rulesOf(undefined, played)));

    expect(played).toEqual([
      ...Array.from({ length: 12 }, (_, i) => [1, "normal", 1000 + i, 30]),
      ...Array.from({ length: 12 }, (_, i) => [12, "normal", 12_000 + i, 30]),
    ]);
  });

  it("prints the higher middle of each level's best streaks and its mark, rounded down to a multiple of 5 and 5 at least, with --marks", async () => {
    const streaks = {
      1: [9, 30, 12, 21, 16, 19, 3, 18, 25, 14, 19, 11],
      12: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2],
    };
    const rules = rulesOf((entry, _, seed) => ({
      ...cleared(75),
      bestStreak: streaks[entry.number === 1 ? 1 : 12][seed % SEED_STRIDE] ?? 0,
    }));

    expect(await ran(["--marks"], withNormal(rules))).toEqual({
      code: 0,
      out: [
        "                     normal",
        "                      streak  mark",
        " 1 Wall                   18    15",
        "12 The castle keep         1     5",
      ],
      err: [],
    });
  });

  it("fails on a play that didn't clear its level, with --marks", async () => {
    const rules = rulesOf((_, __, seed) =>
      seed === 1005 ? lost() : cleared(75),
    );

    const { code, out } = await ran(["--marks"], withNormal(rules));

    expect({ code, last: out.at(-1) }).toEqual({
      code: 1,
      last: "1 plays didn't clear their level.",
    });
  });

  it("throws where the rules have no Normal speed to set marks at", async () => {
    await expect(ran(["--marks"])).rejects.toThrow(
      `The rules have no speed "normal" to set marks at.`,
    );
  });
});
