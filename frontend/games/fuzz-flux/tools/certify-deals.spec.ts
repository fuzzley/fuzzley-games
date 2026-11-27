import { waitedWords, waitingWords } from "@fz/dev/queue";
import { recordingPrinter } from "@fz/dev/script";
import { CERTIFY_API } from "../src/testing/certify_api";
import {
  type CertifyApi,
  type CertifyIo,
  type CertifyLevel,
  loadCertifyApi,
  run,
} from "./certify-deals.mjs";

/** Made-up levels: two in a set, one dealt its deals out of order, and one in another. */
const MADE_UP: readonly CertifyLevel[] = [
  {
    number: 1,
    set: { id: "first" },
    data: { id: "1", name: "Opener", deals: [3, 1] },
  },
  {
    number: 2,
    set: { id: "first" },
    data: { id: "2", name: "Middle", deals: [2] },
  },
  {
    number: 3,
    set: { id: "second" },
    data: { id: "3", name: "Closer", deals: [5, 6] },
  },
];

/** Returns the made-up levels' API, whose line on each deal is as many moves as its seed, each swapping a square with the next, but none on the deals given. */
function apiOf(unproven: readonly number[] = []): CertifyApi {
  return {
    levels: MADE_UP,
    lineOf: (_, seed) =>
      unproven.includes(seed)
        ? null
        : Array.from({ length: seed }, (__, from) => ({ from, to: from + 1 })),
  };
}

/** The first set's certificates as the script writes them. */
const FIRST = `{
  "1": {
    "1": [[0, 1]],
    "3": [
      [0, 1],
      [1, 2],
      [2, 3]
    ]
  },
  "2": {
    "2": [
      [0, 1],
      [1, 2]
    ]
  }
}
`;

/** The second set's certificates as the script writes them. */
const SECOND = `{
  "3": {
    "5": [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5]
    ],
    "6": [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6]
    ]
  }
}
`;

/** Says what a spec's queue heard: how many runs joined it and left it, and how many files were written by the time a run left it. */
interface Queued {
  joined: number;
  left: number;
  writtenOnLeaving: number;
}

/** Returns what a spec's queue has heard before any run joins it. */
function heardNothing(): Queued {
  return { joined: 0, left: 0, writtenOnLeaving: 0 };
}

/**
 * Returns the code the script exits with for a command line, over an API,
 * taking its turn in the queue at once, after the runs ahead it is handed,
 * with what it printed, the files it wrote, by their paths, and what the
 * queue heard.
 */
async function ran(
  args: readonly string[],
  {
    api = apiOf(),
    ahead = [],
    queued = heardNothing(),
  }: { api?: CertifyApi; ahead?: readonly number[]; queued?: Queued } = {},
): Promise<{
  code: number;
  out: readonly string[];
  err: readonly string[];
  written: Readonly<Record<string, string>>;
  queued: Queued;
}> {
  const written: Record<string, string> = {};
  const printer = recordingPrinter();
  const files: NonNullable<CertifyIo["files"]> = {
    write: (path, text) => {
      written[path] = text;
      return Promise.resolve();
    },
  };
  const code = await run(args, {
    load: () => Promise.resolve(api),
    files,
    queue: (_, onWait) => {
      queued.joined++;
      for (const runs of ahead) onWait(runs);
      return Promise.resolve(() => {
        queued.left++;
        queued.writtenOnLeaving = Object.keys(written).length;
      });
    },
    now: () => 0,
    ...printer,
  });
  return { code, out: printer.out, err: printer.err, written, queued };
}

describe("run", () => {
  it("writes each set's lines to its certificates, by the level's id and then the deal's seed, each move a pair of squares, laid out as Prettier lays them out, and exits with 0", async () => {
    const { code, written } = await ran([]);

    expect({ code, written }).toEqual({
      code: 0,
      written: {
        "src/rules/levels/certificates/first.json": FIRST,
        "src/rules/levels/certificates/second.json": SECOND,
      },
    });
  });

  it("prints the moves each level's lines take as it is done, then the files it wrote", async () => {
    const { out } = await ran([]);

    expect(out).toEqual([
      " 1 Opener   1 to 3 moves",
      " 2 Middle   2 moves",
      " 3 Closer   5 to 6 moves",
      "",
      "Wrote src/rules/levels/certificates/first.json and src/rules/levels/certificates/second.json.",
    ]);
  });

  it("certifies only a set's levels for --set, and writes only its file", async () => {
    const { out, written } = await ran(["--set", "first"]);

    expect({ out, files: Object.keys(written) }).toEqual({
      out: [
        " 1 Opener   1 to 3 moves",
        " 2 Middle   2 moves",
        "",
        "Wrote src/rules/levels/certificates/first.json.",
      ],
      files: ["src/rules/levels/certificates/first.json"],
    });
  });

  it("says which deals have no line, writes their sets' files without them, and exits with 1", async () => {
    const { code, out, written } = await ran(["--set", "second"], {
      api: apiOf([5]),
    });

    expect({ code, out, written }).toEqual({
      code: 1,
      out: [
        " 3 Closer   6 moves; no line on deal 5",
        "",
        "Wrote src/rules/levels/certificates/second.json.",
        "The proof found 1 of 2 lines. The design proved every deal, so find out why one has none before its level is redrawn.",
      ],
      written: {
        "src/rules/levels/certificates/second.json":
          expect.not.stringContaining('"5"') as unknown,
      },
    });
  });

  it("says where a level has no line on any deal", async () => {
    const { out } = await ran(["--set", "second"], { api: apiOf([5, 6]) });

    expect(out[0]).toBe(" 3 Closer   no line on deals 5 and 6");
  });

  it("says how many runs it waits for in the queue, and how long it waited, before it proves anything, and leaves once it has written every file", async () => {
    const { out, queued } = await ran(["--set", "second"], { ahead: [2, 1] });

    expect({ printed: out.slice(0, 3), queued }).toEqual({
      printed: [waitingWords(2), waitingWords(1), waitedWords(0)],
      queued: { joined: 1, left: 1, writtenOnLeaving: 1 },
    });
  });

  it("throws, naming the deal and the level, and leaves the queue, having written nothing, where a proof fails", async () => {
    const queued = heardNothing();
    const api: CertifyApi = {
      ...apiOf(),
      lineOf: () => {
        throw new Error("A proof failed.");
      },
    };

    const outcome = ran([], { api, queued });

    await expect(outcome).rejects.toMatchObject({
      message: "Proving deal 3 of level 1 failed.",
      cause: new Error("A proof failed."),
    });
    expect(queued).toEqual({ joined: 1, left: 1, writtenOnLeaving: 0 });
  });

  it("prints the usage asked for and exits with 0, proving nothing", async () => {
    const { code, out, written, queued } = await ran(["--help"]);

    expect({ code, out, written, joined: queued.joined }).toEqual({
      code: 0,
      out: [expect.stringMatching(/^Usage: yarn certify:deals/) as unknown],
      written: {},
      joined: 0,
    });
  });

  it.each([
    [
      ["--set", "third"],
      /^--set takes "first" or "second", not "third"\.\n\nUsage:/,
    ],
    [["--level", "1"], /^Unknown option '--level'/],
  ])(
    "prints what is wrong with %j as an error, and exits with 2, proving nothing",
    async (args, says) => {
      const { code, err, written, queued } = await ran(args);

      expect({ code, err, written, joined: queued.joined }).toEqual({
        code: 2,
        err: [expect.stringMatching(says) as unknown],
        written: {},
        joined: 0,
      });
    },
  );
});

describe("loadCertifyApi", () => {
  it("loads the game's API, of the script's type, through Vite", async () => {
    const api: CertifyApi = CERTIFY_API;

    const loaded = await loadCertifyApi();

    expect({
      levels: loaded.levels.length,
      line: loaded.lineOf(1, 1),
    }).toEqual({ levels: api.levels.length, line: api.lineOf(1, 1) });
  }, 30_000);
});
