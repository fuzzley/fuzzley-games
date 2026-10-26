import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { copyBuild, removeUnlisted } from "./copy-games.mjs";

/** Writes a file, making its folders first. */
function writeFile(file: string, contents = ""): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

/** Returns every file under a folder, by its path in the folder, with `/`s. */
function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path
        .relative(dir, path.join(entry.parentPath, entry.name))
        .replaceAll("\\", "/"),
    )
    .sort();
}

describe("copyBuild", () => {
  let dir: string;
  let build: string;
  let gameDir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "copy-"));
    build = path.join(dir, "games", "minesweeper", "dist");
    gameDir = path.join(dir, "play", "minesweeper");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("replaces the game's folder with its workspace's build", () => {
    writeFile(path.join(build, "index.html"));
    writeFile(path.join(build, "assets", "index-new.js"));
    writeFile(path.join(gameDir, "assets", "index-old.js"));

    copyBuild(build, gameDir);

    expect(filesIn(gameDir)).toEqual(["assets/index-new.js", "index.html"]);
  });

  it("refuses a workspace that hasn't been built", () => {
    expect(() => {
      copyBuild(build, gameDir);
    }).toThrow("Run `yarn build:games` in frontend/ to build it.");
  });

  it("leaves the game's folder alone when there is nothing to copy", () => {
    writeFile(path.join(gameDir, "index.html"));

    expect(() => {
      copyBuild(build, gameDir);
    }).toThrow();
    expect(filesIn(gameDir)).toEqual(["index.html"]);
  });
});

describe("removeUnlisted", () => {
  let playDir: string;

  beforeEach(() => {
    playDir = mkdtempSync(path.join(tmpdir(), "play-"));
    mkdirSync(path.join(playDir, "minesweeper"));
    mkdirSync(path.join(playDir, "hearts"));
  });

  afterEach(() => {
    rmSync(playDir, { recursive: true, force: true });
  });

  it("deletes the folders of games games.json no longer lists", () => {
    removeUnlisted(playDir, {
      minesweeper: { workspace: "games/minesweeper" },
    });

    expect(readdirSync(playDir)).toEqual(["minesweeper"]);
  });

  it("does nothing before any game has been copied", () => {
    const missing = path.join(playDir, "play");

    removeUnlisted(missing, {});

    expect(existsSync(missing)).toBe(false);
  });
});
