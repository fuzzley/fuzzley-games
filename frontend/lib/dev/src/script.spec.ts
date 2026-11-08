import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type Args,
  CONSOLE,
  type Stop,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
  wrapped,
} from "./script.ts";

/** What a script of the specs prints for `--help`. */
const USAGE = "Usage: yarn spec [options]";

/** The options of a script of the specs: a number, with no default, and a speed, with one. */
const OPTIONS = {
  count: { type: "string" },
  speed: { type: "string", default: "normal" },
} as const;

/** Returns what a command line gives the script of the specs. */
function read(
  args: readonly string[],
  allowPositionals = false,
): Args<typeof OPTIONS> | Stop {
  return readArgs(args, { options: OPTIONS, allowPositionals, usage: USAGE });
}

/** Returns the lines a stop printed, as output and as what went wrong, and the code it returned. */
function stopped(stop: Stop): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = stopWith(stop, {
    print: (line) => out.push(line),
    printError: (line) => err.push(line),
  });
  return { code, out, err };
}

describe("readArgs", () => {
  it("gives each option its value, or its default", () => {
    expect(read(["--count", "3"])).toEqual({
      values: { count: "3", speed: "normal" },
      positionals: [],
    });
  });

  it.each([["--help"], ["-h"]])("stops with the usage and 0 for %s", (flag) => {
    expect(read([flag])).toEqual({ code: 0, message: USAGE });
  });

  it.each([
    [["--size", "3"], "Unknown option '--size'"],
    [["--count"], "Option '--count <value>' argument missing"],
    [["3"], "Unexpected argument '3'"],
  ])(
    "stops with what is wrong, a blank line, the usage and 2 for %j",
    (args, problem) => {
      expect(read(args)).toEqual({
        code: 2,
        message: expect.stringMatching(
          new RegExp(`^${problem}[^]*\\n\\nUsage: yarn spec`),
        ) as unknown,
      });
    },
  );

  it("gives the words after the options to a script that takes them", () => {
    expect(read(["--speed", "fast", "klondike", "spider"], true)).toEqual({
      values: { speed: "fast" },
      positionals: ["klondike", "spider"],
    });
  });

  it("throws what parseArgs throws for options a script got wrong, rather than blaming the command line", () => {
    const reading = (): unknown =>
      readArgs([], {
        options: { count: { type: "string", short: "cc" } },
        usage: USAGE,
      });

    expect(reading).toThrow(TypeError);
  });
});

describe("misread", () => {
  it("stops with what is wrong, a blank line, the usage and 2", () => {
    expect(misread("--count takes a number.", USAGE)).toEqual({
      code: 2,
      message: `--count takes a number.\n\n${USAGE}`,
    });
  });
});

describe("isStop", () => {
  it.each([
    ["the usage asked for", read(["--help"])],
    ["a command line misread", read(["--size", "3"])],
    ["a value a script refuses", misread("--count takes a number.", USAGE)],
  ])("finds a stop in %s", (_, stop) => {
    expect(isStop(stop)).toBe(true);
  });

  it.each([
    ["what a command line gives", read(["--count", "3"])],
    ["a number", 3],
    ["nothing", undefined],
  ])("finds none in %s", (_, value) => {
    expect(isStop(value)).toBe(false);
  });
});

describe("stopWith", () => {
  it("prints the usage asked for as output, and returns 0", () => {
    expect(stopped({ code: 0, message: USAGE })).toEqual({
      code: 0,
      out: [USAGE],
      err: [],
    });
  });

  it("prints a command line misread as what went wrong, and returns 2", () => {
    expect(stopped(misread("Nothing to do.", USAGE))).toEqual({
      code: 2,
      out: [],
      err: [`Nothing to do.\n\n${USAGE}`],
    });
  });
});

describe("wrapped", () => {
  /** Returns a word of a letter, as wide as asked. */
  const word = (letter: string, width: number): string => letter.repeat(width);

  it("keeps words that fit in 78 columns on one line", () => {
    const words = `${word("a", 38)} ${word("b", 39)}`;

    expect(wrapped(words)).toBe(words);
  });

  it("breaks before a word that would run a line past 78 columns", () => {
    expect(wrapped(`${word("a", 38)} ${word("b", 40)} c`)).toBe(
      `${word("a", 38)}\n${word("b", 40)} c`,
    );
  });

  it("keeps a word wider than a line whole, on a line of its own", () => {
    expect(wrapped(`a ${word("x", 80)} b`)).toBe(`a\n${word("x", 80)}\nb`);
  });
});

describe("CONSOLE", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints output to stdout and what went wrong to stderr", () => {
    const logged: unknown[] = [];
    const errors: unknown[] = [];
    vi.spyOn(console, "log").mockImplementation((line) => logged.push(line));
    vi.spyOn(console, "error").mockImplementation((line) => errors.push(line));

    CONSOLE.print("out");
    CONSOLE.printError("wrong");

    expect({ logged, errors }).toEqual({ logged: ["out"], errors: ["wrong"] });
  });
});

describe("importThroughVite", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "fz-script-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("loads TypeScript that names its modules without extensions and imports JSON, as a game's does", async () => {
    await writeFile(join(root, "speeds.json"), '["slow", "fast"]');
    await writeFile(
      join(root, "names.ts"),
      'export const SHOUTED: string = "FAST";',
    );
    await writeFile(
      join(root, "rules.ts"),
      [
        'import speeds from "./speeds.json";',
        'import { SHOUTED } from "./names";',
        "export const RULES: { speeds: string[]; shouted: string } = { speeds, shouted: SHOUTED };",
      ].join("\n"),
    );

    const loaded = await importThroughVite(join(root, "rules.ts"), root);

    expect(loaded["RULES"]).toEqual({
      speeds: ["slow", "fast"],
      shouted: "FAST",
    });
  });
});
