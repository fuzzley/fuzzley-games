import { recordingPrinter } from "@fz/dev/script";
import { LEVELS, parseLevel } from "../src/rules/levels/levels";
import { DEPTHS } from "../src/rules/wall/wall";
import { certificateOf } from "../src/testing/every_level";
import {
  drawnShots,
  lineRounds,
  openingRounds,
  roundsHash,
} from "../src/testing/golden_flights";
import type { GoldenApi, ScriptLevel } from "../src/testing/script_api";
import {
  GOLDEN_FILE,
  goldenText,
  loadGoldenApi,
  readCommandLine,
  run,
} from "./golden-flights.mjs";

/** Made-up levels, the second's id sorting first. */
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
];

/** An API over the made-up levels on two depths, each hash naming its level, its depth and what it hashes. */
const API: GoldenApi = {
  levels: MADE_UP,
  depths: [11, 22],
  certificateHash: (level, depth) => `c${String(level)}-${String(depth)}`,
  shotsHash: (level, depth) => `s${String(level)}-${String(depth)}`,
};

/**
 * Returns the code the script exits with for a command line, over the
 * made-up API, the files it wrote by their paths, and the lines it printed.
 */
async function ran(args: readonly string[]) {
  const printer = recordingPrinter();
  const written = new Map<string, string>();
  const code = await run(args, {
    load: () => Promise.resolve(API),
    write: (path, text) => {
      written.set(path, text);
      return Promise.resolve();
    },
    ...printer,
  });
  return { code, written, out: printer.out, err: printer.err };
}

describe("readCommandLine", () => {
  it("asks for nothing but the flights", () => {
    expect(readCommandLine([])).toEqual({});
  });

  it("asks for the usage with --help", () => {
    expect(readCommandLine(["--help"])).toMatchObject({ code: 0 });
  });

  it("can't read an option it doesn't take", () => {
    expect(readCommandLine(["--level", "1"])).toMatchObject({ code: 2 });
  });
});

describe("run", () => {
  it("writes each level's hashes on each depth, the certificates' then the shots', the levels' ids sorted", async () => {
    const { code, written } = await ran([]);

    expect({ code, written: [...written] }).toEqual({
      code: 0,
      written: [
        [
          GOLDEN_FILE,
          goldenText({
            certificates: {
              "all-steel": { "11": "c2-11", "22": "c2-22" },
              bricks: { "11": "c1-11", "22": "c1-22" },
            },
            shots: {
              "all-steel": { "11": "s2-11", "22": "s2-22" },
              bricks: { "11": "s1-11", "22": "s1-22" },
            },
          }),
        ],
      ],
    });
  });

  it("writes the file as Prettier lays out JSON, with a newline at its end", async () => {
    const { written } = await ran([]);

    expect(written.get(GOLDEN_FILE)).toMatch(
      /^\{\n {2}"certificates": \{\n {4}"all-steel": \{\n {6}"11": "c2-11",\n[^]*\}\n$/,
    );
  });

  it("says what it wrote", async () => {
    const { out } = await ran([]);

    expect(out).toEqual([`Wrote ${GOLDEN_FILE}: 2 levels on 2 depths.`]);
  });

  it("prints the usage asked for and exits with 0, writing nothing", async () => {
    const { code, written, out } = await ran(["--help"]);

    expect({
      code,
      written: written.size,
      usage: out.join("\n").startsWith("Usage: yarn golden:flights"),
    }).toEqual({ code: 0, written: 0, usage: true });
  });

  it("prints what is wrong with a command line, a blank line and the usage as an error, and exits with 2, writing nothing", async () => {
    const { code, written, err } = await ran(["--depth", "11"]);

    expect({
      code,
      written: written.size,
      err: /^Unknown option '--depth'[^]*\n\nUsage:/.test(err.join("\n")),
    }).toEqual({ code: 2, written: 0, err: true });
  });
});

describe("loadGoldenApi", () => {
  it("loads what the script plays through Vite, a level's certificate and its drawn shots hashed as their rounds are", async () => {
    const api = await loadGoldenApi();
    const [entry] = LEVELS;
    const level = parseLevel(entry!.data);
    const line = certificateOf(entry!, 22)!;

    const hashes = [api.certificateHash(1, 22), api.shotsHash(1, 22)];

    expect({ levels: api.levels.length, depths: api.depths, hashes }).toEqual({
      levels: LEVELS.length,
      depths: DEPTHS,
      hashes: [
        roundsHash(lineRounds(level, 22, line)),
        roundsHash(openingRounds(level, 22, drawnShots(1, 22))),
      ],
    });
  });
});
