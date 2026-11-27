import { levelsOfSet, readSetOption } from "./set_option.mjs";

/** A script's usage, as a stop prints it. */
const USAGE = "Usage: yarn made:up [options]";

/** Made-up levels: two in a set and one in another. */
const LEVELS = [
  { number: 1, set: { id: "first" } },
  { number: 2, set: { id: "first" } },
  { number: 3, set: { id: "second" } },
] as const;

describe("readSetOption", () => {
  it("reads the set --set names, and none where it isn't given", () => {
    expect([
      readSetOption(["--set", "first"], USAGE),
      readSetOption([], USAGE),
    ]).toEqual([{ set: "first" }, { set: undefined }]);
  });

  it("stops with the usage for --help, and with what is wrong for any other option", () => {
    expect([
      readSetOption(["--help"], USAGE),
      readSetOption(["--level", "1"], USAGE),
    ]).toEqual([
      { code: 0, message: USAGE },
      {
        code: 2,
        message: expect.stringMatching(
          /^Unknown option '--level'.*\n\nUsage: yarn made:up/s,
        ) as unknown,
      },
    ]);
  });
});

describe("levelsOfSet", () => {
  it("gives the levels of the set named, or every level for none, in the order played", () => {
    expect([
      levelsOfSet(LEVELS, { set: "first" }, USAGE),
      levelsOfSet(LEVELS, { set: undefined }, USAGE),
    ]).toEqual([LEVELS.slice(0, 2), LEVELS]);
  });

  it("stops for a set no level is in, naming the sets there are", () => {
    expect(levelsOfSet(LEVELS, { set: "third" }, USAGE)).toEqual({
      code: 2,
      message: `--set takes "first" or "second", not "third".\n\n${USAGE}`,
    });
  });
});
