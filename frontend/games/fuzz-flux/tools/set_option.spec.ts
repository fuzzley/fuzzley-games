import { readSetOption } from "./set_option.mjs";

/** A script's usage, as a stop prints it. */
const USAGE = "Usage: yarn made:up [options]";

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
