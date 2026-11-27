import { waitedWords, waitingWords } from "@fz/dev/queue";
import { recordingPrinter } from "@fz/dev/script";
import { designText } from "../src/testing/design_files";
import { REPORT_API } from "../src/testing/report_api";
import {
  type CarefulFigures,
  type GameFigures,
  type LevelFigures,
  type ReportApi,
  type ReportDeal,
  type ReportIo,
  type ReportLevel,
  LEVEL_DEALS,
  REPORT_DEALS,
  UNCLEARED,
  figuresOf,
  loadReportApi,
  playOnThreads,
  playedLevel,
  rowOf,
  run,
} from "./report-levels.mjs";

/** The moves the casual player's 4 games on a made-up level's deal use, by the deal's seed: a quarter of the 120 games of 160 that use 5 moves or fewer at each place, so that 5 moves clear 75 in 100. */
function casualMovesOn(seed: number): readonly number[] {
  if (seed <= 10) return [5, 5, 5, 5];
  if (seed <= 20) return [5, 5, 5, 6];
  if (seed <= 30) return [5, 5, 6, 6];
  return [4, 5, 5, UNCLEARED];
}

/** The careful player's game on each made-up deal: cleared in 3 moves, of 3 waves, 1 wave and 2, with 2 specials made and, on the first deal alone, 2 shuffles. */
function carefulOn({ seed }: ReportDeal): CarefulFigures {
  return {
    cleared: true,
    used: 3,
    waves: [3, 1, 2],
    specials: 2,
    shuffles: seed === 1 ? 2 : 0,
  };
}

/** Returns a game that used so many moves, or didn't clear its level for {@link UNCLEARED}. */
function gameOf(used: number): GameFigures {
  return used === UNCLEARED
    ? { cleared: false, used: 99 }
    : { cleared: true, used };
}

/** The deals a made-up level's games set: those the casual player clears 3 times in 4 in 5 moves, from 11 on, but 12, which no proof clears. */
const SET_DEALS = [11, 13, 14, 15, 16, 17, 18, 19];

/** What a made-up level's file keeps, as its games set it. */
const AS_SET = { moves: 5, deals: SET_DEALS, stars: [0, 1, 2] };

/** Made-up levels: two in a set, and one in another, each kept as its games set it. */
const MADE_UP: readonly ReportLevel[] = [
  { number: 1, set: { id: "first" }, data: { name: "Opener", ...AS_SET } },
  { number: 2, set: { id: "first" }, data: { name: "Middle", ...AS_SET } },
  { number: 3, set: { id: "second" }, data: { name: "Closer", ...AS_SET } },
];

/**
 * Returns the made-up levels' API, each asking to be cleared 75 times in
 * 100, its games as {@link casualMovesOn} and {@link carefulOn} play, and
 * the proof's line on a deal as many moves as its seed is past 10, or none
 * on deal 12 or in other moves than 5, but as handed others.
 */
function apiOf(given: Partial<ReportApi> = {}): ReportApi {
  return {
    levels: MADE_UP,
    asked: () => 75,
    casualGames: ({ seed }) => casualMovesOn(seed).map(gameOf),
    careful: carefulOn,
    proof: ({ moves, seed }) =>
      seed === 12 || moves !== 5
        ? null
        : Array.from({ length: seed - 10 }, () => ({ from: 0, to: 1 })),
    ...given,
  };
}

/** A made-up level's row of the table, as its games play it. */
const PLAYED_ROW =
  "| 1 | Opener | 5 | 75% | 75% | 100% | 5 | 3 | 6 | 9 | 8 | 75% | 75% to 75% | 50% to 100% | 1, 2 | 2.00 | 3 | 2.0 | 0.05 |";

/** Says what a spec's queue heard: how many runs joined it and left it, and how many levels were played by the time a run left it. */
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
 * printed, the levels it played in this thread, and what the queue heard.
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
  levels: readonly number[];
  queued: Queued;
}> {
  const levels: number[] = [];
  const printer = recordingPrinter();
  const code = await run(args, {
    load: () => Promise.resolve(api),
    play:
      play ??
      ((given) => {
        levels.push(...given);
        return Promise.resolve(given.map((level) => playedLevel(api, level)));
      }),
    queue: (_, onWait) => {
      queued.joined++;
      for (const runs of ahead) onWait(runs);
      return Promise.resolve(() => {
        queued.left++;
        queued.playedOnLeaving = levels.length;
      });
    },
    now: () => 0,
    ...printer,
  });
  return { code, out: printer.out, err: printer.err, levels, queued };
}

/** Returns the made-up levels, the one numbered so keeping in its file what a change says. */
function keeping(
  number: number,
  kept: Partial<ReportLevel["data"]>,
): readonly ReportLevel[] {
  return MADE_UP.map((level) =>
    level.number === number
      ? { ...level, data: { ...level.data, ...kept } }
      : level,
  );
}

describe("figuresOf", () => {
  it("sets a level's moves to the fewest that let the casual player clear it as often as it asks, the game at the share's place taking them", () => {
    const { moves, casual, casualMiddle } = figuresOf(apiOf(), MADE_UP[0]!);

    expect({ moves, casual, casualMiddle }).toEqual({
      moves: 5,
      casual: 0.75,
      casualMiddle: 5,
    });
  });

  it("never sets fewer moves than the careful player needs 3 times in 4, and one to spare", () => {
    const api = apiOf({
      careful: (deal) => ({ ...carefulOn(deal), used: deal.seed }),
    });

    const { moves, careful, carefulMiddle } = figuresOf(api, MADE_UP[0]!);

    expect({ moves, careful, carefulMiddle }).toEqual({
      moves: 32,
      careful: 0.8,
      carefulMiddle: 21,
    });
  });

  it("plays every game on its own deal, dealt moves to spare, the casual player's on each and the careful player's", () => {
    const casual: ReportDeal[] = [];
    const careful: ReportDeal[] = [];
    const api = apiOf({
      casualGames: (deal) => {
        casual.push(deal);
        return casualMovesOn(deal.seed).map(gameOf);
      },
      careful: (deal) => {
        careful.push(deal);
        return carefulOn(deal);
      },
    });

    figuresOf(api, MADE_UP[1]!);

    const deals = Array.from({ length: REPORT_DEALS }, (_, at) => ({
      level: 2,
      moves: 99,
      seed: at + 1,
    }));
    expect({ casual, careful }).toEqual({ casual: deals, careful: deals });
  });

  it("sets the deals the casual player clears nearest as often as the level asks, each proven in its moves, the lower seed first of two as near", () => {
    const { deals, dealRates, proofs, rates } = figuresOf(apiOf(), MADE_UP[0]!);

    expect({ deals, dealRates, proofs, rates }).toEqual({
      deals: SET_DEALS,
      dealRates: SET_DEALS.map(() => 0.75),
      proofs: [1, 3, 4, 5, 6, 7, 8, 9],
      rates: [1, 0.75, 0.5, 0.75].flatMap((rate) =>
        Array.from({ length: 10 }, () => rate),
      ),
    });
  });

  it("sets the third star at the moves the careful player's middle game leaves to spare, and the second at half of them", () => {
    const api = apiOf({
      careful: (deal) => ({ ...carefulOn(deal), used: 1 }),
    });

    const { moves, stars } = figuresOf(api, MADE_UP[0]!);

    expect({ moves, stars }).toEqual({ moves: 5, stars: [0, 2, 4] });
  });

  it("asks a move to spare at least of each star after the first", () => {
    const api = apiOf({
      careful: (deal) => ({ ...carefulOn(deal), used: 9 }),
    });

    const { moves, stars } = figuresOf(api, MADE_UP[0]!);

    expect({ moves, stars }).toEqual({ moves: 10, stars: [0, 1, 1] });
  });

  it("counts the careful player's waves a move, the most of them, and its specials and shuffles a game", () => {
    const { wavesAMove, mostWaves, specialsAGame, shufflesAGame } = figuresOf(
      apiOf(),
      MADE_UP[0]!,
    );

    expect({ wavesAMove, mostWaves, specialsAGame, shufflesAGame }).toEqual({
      wavesAMove: 2,
      mostWaves: 3,
      specialsAGame: 2,
      shufflesAGame: 0.05,
    });
  });
});

describe("playedLevel", () => {
  it("throws, naming the level, where playing it fails", () => {
    expect(() => playedLevel(apiOf(), 4)).toThrow("Playing level 4 failed.");
  });
});

describe("run", () => {
  it("prints the sketch's table, a level a row, and exits with 0 where each level's file keeps what its games set", async () => {
    const { code, out } = await ran([]);

    expect({ code, rows: out.slice(2) }).toEqual({
      code: 0,
      rows: [
        PLAYED_ROW,
        PLAYED_ROW.replace("| 1 | Opener |", "| 2 | Middle |"),
        PLAYED_ROW.replace("| 1 | Opener |", "| 3 | Closer |"),
      ],
    });
  });

  it("heads the table as the sketch's report does", async () => {
    const sketch = designText("sketch/results-table.md").split("\n");

    const { out } = await ran([]);

    expect(out.slice(0, 2)).toEqual(sketch.slice(0, 2));
  });

  it("says under the table where a level's file keeps other moves, stars or deals than its games set, and exits with 1", async () => {
    const api = apiOf({
      levels: keeping(2, { moves: 6, stars: [0, 2, 3], deals: [11, 12] }),
    });

    const { code, out } = await ran([], { api });

    expect({ code, under: out.slice(5) }).toEqual({
      code: 1,
      under: [
        "",
        "Level 2, Middle: its games set 5 moves, where its file keeps 6.",
        "Level 2, Middle: its games set its stars at 0, 1 and 2 moves to spare, where its file keeps 0, 2 and 3.",
        "Level 2, Middle: its games set the deals 11, 13, 14, 15, 16, 17, 18 and 19, where its file keeps 11 and 12.",
      ],
    });
  });

  it("says where a level has fewer deals proven than it needs, and writes a dash for the proofs of one with none", async () => {
    const api = apiOf({ proof: () => null });

    const { code, out } = await ran(["--set", "second"], { api });

    expect({ code, row: out[2], under: out.slice(3) }).toEqual({
      code: 1,
      row: "| 3 | Closer | 5 | 75% | 75% | 100% | 5 | 3 | - | - | 0 | - | - | 50% to 100% | 1, 2 | 2.00 | 3 | 2.0 | 0.05 |",
      under: [
        "",
        `Level 3, Closer: 0 of its 40 deals are proven in 5 moves, short of ${String(LEVEL_DEALS)}.`,
      ],
    });
  });

  it("plays only a set's levels for --set", async () => {
    const { levels, out } = await ran(["--set", "first"]);

    expect({ levels, rows: out.length }).toEqual({ levels: [1, 2], rows: 4 });
  });

  it("says how many runs it waits for in the queue, and how long it waited, before it plays anything, and leaves once it has played every level", async () => {
    const { out, queued } = await ran(["--set", "second"], { ahead: [2, 1] });

    expect({ printed: out.slice(0, 3), queued }).toEqual({
      printed: [waitingWords(2), waitingWords(1), waitedWords(0)],
      queued: { joined: 1, left: 1, playedOnLeaving: 1 },
    });
  });

  it("leaves the queue where playing fails", async () => {
    const queued = heardNothing();
    const play = (): Promise<never> =>
      Promise.reject(new Error("A thread failed."));

    const outcome = ran([], { play, queued });

    await expect(outcome).rejects.toThrow("A thread failed.");
    expect(queued).toEqual({ joined: 1, left: 1, playedOnLeaving: 0 });
  });

  it("throws, naming the level, where one comes back unplayed", async () => {
    const api = apiOf();
    const play: NonNullable<ReportIo["play"]> = (levels) =>
      Promise.resolve(levels.slice(1).map((level) => playedLevel(api, level)));

    const outcome = ran([], { api, play });

    await expect(outcome).rejects.toThrow("Level 1 came back unplayed.");
  });

  it("prints the usage asked for and exits with 0, playing nothing", async () => {
    const { code, out, levels, queued } = await ran(["--help"]);

    expect({ code, out, levels, joined: queued.joined }).toEqual({
      code: 0,
      out: [expect.stringMatching(/^Usage: yarn report:levels/) as unknown],
      levels: [],
      joined: 0,
    });
  });

  it.each([
    [
      ["--set", "third"],
      /^--set takes "first" or "second", not "third"\.\n\nUsage:/,
    ],
    [["--seeds", "20"], /^Unknown option '--seeds'/],
  ])(
    "prints what is wrong with %j as an error, and exits with 2, playing nothing",
    async (args, says) => {
      const { code, err, levels, queued } = await ran(args);

      expect({ code, err, levels, joined: queued.joined }).toEqual({
        code: 2,
        err: [expect.stringMatching(says) as unknown],
        levels: [],
        joined: 0,
      });
    },
  );
});

describe("the threads", () => {
  it("loads the game's API, of the report's type, through Vite", async () => {
    const api: ReportApi = REPORT_API;

    const loaded = await loadReportApi();

    expect({
      levels: loaded.levels.length,
      asked: loaded.asked(1),
    }).toEqual({ levels: api.levels.length, asked: api.asked(1) });
  });

  it("plays each level on a thread of its own, which loads the game's API through Vite, its row the sketch's and its moves, stars and deals those its file keeps", async () => {
    const sketch = designText("sketch/results-table.md").split("\n");

    const played = await playOnThreads([2, 1], 2);

    expect(
      played.map((figures) => {
        const level = REPORT_API.levels[figures.number - 1]!;
        const { moves, stars, deals } = figures;
        return { row: rowOf(level, figures), data: { moves, stars, deals } };
      }),
    ).toEqual(
      [2, 1].map((number) => {
        const { moves, stars, deals } = REPORT_API.levels[number - 1]!.data;
        return { row: sketch[number + 1], data: { moves, stars, deals } };
      }),
    );
  }, 60_000);

  it("rejects, naming the level, where a thread fails to play it, stopping the threads still playing", async () => {
    const played: Promise<readonly LevelFigures[]> = playOnThreads([99, 1], 2);

    await expect(played).rejects.toThrow("Playing level 99 failed.");
  }, 30_000);
});
