import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import {
  type BuildStamp,
  buildStamp,
  commitHash,
  stampPage,
} from "./build_info.ts";

/** A commit as the Docker build passes it in, whole. */
const COMMIT_SHA = "549c93afb5d1592257262ceb42ed2e91dcb165d6";

/** A build stamped with its commit and the time it ran. */
const STAMP: BuildStamp = {
  commit: "549c93a",
  buildTime: "2031-06-15T23:30:00.000Z",
};

describe("commitHash", () => {
  it("takes the commit the Docker build passes in, shortened", () => {
    expect(commitHash({ COMMIT_SHA }, () => "0000000")).toBe("549c93a");
  });

  it("asks git when no commit is passed in", () => {
    expect(commitHash({}, () => "e76741b\n")).toBe("e76741b");
  });

  it("says dev when there is no git to ask", () => {
    const noGit = (): string => {
      throw new Error("not a git repository");
    };

    expect(commitHash({}, noGit)).toBe("dev");
  });
});

describe("buildStamp", () => {
  it("names the commit and the time of the build", () => {
    const stamp = buildStamp({ COMMIT_SHA }, new Date("2031-06-15T23:30:00Z"));

    expect(stamp).toEqual(STAMP);
  });
});

describe("stampPage", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "fz-stamp-"));
    await writeFile(
      join(root, "index.html"),
      "<!doctype html><html><head><title>Game</title></head><body></body></html>",
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes the commit and the time into the game's page", async () => {
    await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [stampPage(STAMP)],
    });

    const page = await readFile(join(root, "dist", "index.html"), "utf8");

    expect(page).toContain('<meta name="fz-build-commit" content="549c93a">');
    expect(page).toContain(
      '<meta name="fz-build-time" content="2031-06-15T23:30:00.000Z">',
    );
  });
});
