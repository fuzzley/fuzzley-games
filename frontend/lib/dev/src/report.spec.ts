import {
  type ReportEntry,
  type ReportTable,
  type Tally,
  middleAndMost,
  printReport,
  readSeeds,
  timeOf,
} from "./report.ts";

/** How a play of the specs went: the steps it took, or none where it didn't clear. */
interface Play {
  readonly entry: number;
  readonly speed: string;
  readonly seed: number;
  readonly steps: number | undefined;
}

/** A level of a short name and one of a long. */
const ENTRIES: readonly ReportEntry[] = [
  { number: 1, data: { name: "Gem" } },
  { number: 12, data: { name: "Chain reaction" } },
];

/** What `--help` prints. */
const USAGE = "Usage: yarn report:spec [options]";

/**
 * Returns a table of the two levels at two speeds, each from its number, a
 * play's one column its steps, as a time at a second a step, each play
 * taking as many steps as `steps` says, by default 75.
 */
function tableOf(
  changes: Partial<ReportTable<ReportEntry, string, Play>> = {},
  steps: (
    entry: number,
    speed: string,
    seed: number,
  ) => number | undefined = () => 75,
): ReportTable<ReportEntry, string, Play> {
  return {
    entries: ENTRIES,
    speeds: ["relaxed", "fast"],
    seeds: undefined,
    play: (entry, speed, seed) => ({
      entry: entry.number,
      speed,
      seed,
      steps: steps(entry.number, speed, seed),
    }),
    headings: ["time"],
    widths: [5],
    cellsOf: (plays) => [timeOf(plays[0]?.steps, 1)],
    ...changes,
  };
}

/** Counts the plays that didn't clear, which fail the report. */
function uncleared(plays: readonly Play[]): Tally[] {
  return [
    {
      count: plays.filter((play) => play.steps === undefined).length,
      says: "didn't clear their level (-)",
      fails: true,
    },
  ];
}

/** Returns the lines a report printed, and the code it returned. */
function printed(
  table: ReportTable<ReportEntry, string, Play>,
  talliesOf: (plays: readonly Play[]) => readonly Tally[] = uncleared,
): { lines: string[]; code: number } {
  const lines: string[] = [];
  const code = printReport(table, talliesOf, (line) => lines.push(line));
  return { lines, code };
}

describe("printReport", () => {
  it("lays the names out as wide as the longest, after their numbers, each speed's columns beside them", () => {
    expect(printed(tableOf())).toEqual({
      lines: [
        "                    relaxed   fast",
        "                     time    time",
        " 1 Gem               1:15    1:15",
        "12 Chain reaction    1:15    1:15",
      ],
      code: 0,
    });
  });

  it("plays each entry from its number at each speed, in order", () => {
    const plays: Play[] = [];

    printed(tableOf(), (all) => {
      plays.push(...all);
      return [];
    });

    expect(plays.map(({ entry, speed, seed }) => [entry, speed, seed])).toEqual(
      [
        [1, "relaxed", 1],
        [1, "fast", 1],
        [12, "relaxed", 12],
        [12, "fast", 12],
      ],
    );
  });

  it("plays each entry from seeds of its own a thousand apart, handing a speed's plays to its columns together", () => {
    const table = tableOf({
      seeds: 3,
      headings: ["seeds"],
      widths: [17],
      cellsOf: (plays) => [plays.map((play) => play.seed).join(",")],
    });

    expect(printed(table).lines.slice(2)).toEqual([
      " 1 Gem                 1000,1001,1002      1000,1001,1002",
      "12 Chain reaction   12000,12001,12002   12000,12001,12002",
    ]);
  });

  it("right-aligns each cell in its column, its heading too", () => {
    const table = tableOf({
      headings: ["time", "lost"],
      widths: [6, 5],
      cellsOf: (plays) => [timeOf(plays[0]?.steps, 1), "2"],
    });

    expect(printed(table).lines).toEqual([
      "                    relaxed        fast",
      "                      time  lost     time  lost",
      " 1 Gem                1:15     2     1:15     2",
      "12 Chain reaction     1:15     2     1:15     2",
    ]);
  });

  it("says under a blank line how many plays a tally marked, and fails where the tally fails the report", () => {
    const table = tableOf({}, (entry, speed) =>
      entry === 12 && speed === "fast" ? undefined : 75,
    );

    expect(printed(table)).toEqual({
      lines: [
        "                    relaxed   fast",
        "                     time    time",
        " 1 Gem               1:15    1:15",
        "12 Chain reaction    1:15       -",
        "",
        "1 plays didn't clear their level (-).",
      ],
      code: 1,
    });
  });

  it("says how many plays a tally that doesn't fail the report marked, and succeeds", () => {
    const slow = (plays: readonly Play[]): Tally[] => [
      { count: plays.length, says: "took long (!)", fails: false },
    ];

    expect(printed(tableOf(), slow)).toEqual({
      lines: [...printed(tableOf()).lines, "", "4 plays took long (!)."],
      code: 0,
    });
  });

  it("says each tally that marked a play, in order, under one blank line", () => {
    const tallies = (): Tally[] => [
      { count: 2, says: "didn't clear (-)", fails: true },
      { count: 0, says: "never shows", fails: true },
      { count: 1, says: "took long (!)", fails: false },
    ];

    expect(printed(tableOf(), tallies).lines.slice(4)).toEqual([
      "",
      "2 plays didn't clear (-).",
      "1 plays took long (!).",
    ]);
  });
});

describe("readSeeds", () => {
  it("asks for none where --seeds isn't given", () => {
    expect(readSeeds(undefined, USAGE)).toBeUndefined();
  });

  it("asks for as many as --seeds gives", () => {
    expect(readSeeds("12", USAGE)).toBe(12);
  });

  it.each([["x"], ["0"], ["1.5"], [""]])(
    "stops with what is wrong, the usage and 2 for %j",
    (given) => {
      expect(readSeeds(given, USAGE)).toEqual({
        code: 2,
        message: `--seeds takes a whole number from 1, not "${given}".\n\n${USAGE}`,
      });
    },
  );
});

describe("timeOf", () => {
  it("writes steps as the minutes and seconds they take", () => {
    expect(timeOf(1250, 0.1)).toBe("2:05");
  });

  it("rounds to the nearest second", () => {
    expect(timeOf(1255, 0.1)).toBe("2:06");
  });

  it.each([[undefined], [Number.POSITIVE_INFINITY]])(
    "writes %s as a dash",
    (steps) => {
      expect(timeOf(steps, 0.1)).toBe("-");
    },
  );
});

describe("middleAndMost", () => {
  it("returns the middle count and the most, in whatever order they come", () => {
    expect(middleAndMost([30, 10, 20])).toEqual([20, 30]);
  });

  it("takes the higher middle of an even number", () => {
    expect(middleAndMost([40, 10, 30, 20])).toEqual([30, 40]);
  });

  it("keeps an endless count, as of a play that didn't clear, last", () => {
    expect(middleAndMost([Number.POSITIVE_INFINITY, 10])).toEqual([
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ]);
  });

  it("returns none of either for no counts", () => {
    expect(middleAndMost([])).toEqual([undefined, undefined]);
  });
});
