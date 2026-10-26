import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { GameManifest } from "@fz/dev/game-manifest";
import type { Game } from "../src/app/model/game.ts";
import {
  type Catalog,
  commitHash,
  loadCatalog,
  manifestProblems,
  missingImages,
  playPageRoute,
  readBuildInfo,
  readGameManifest,
  servedBuilds,
} from "./vite-plugins.ts";

describe("commitHash", () => {
  it("takes the commit the Docker build passes in, shortened", () => {
    const env = { COMMIT_SHA: "549c93afb5d1592257262ceb42ed2e91dcb165d6" };

    expect(commitHash(env, () => "0000000")).toBe("549c93a");
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

describe("readBuildInfo", () => {
  it("names the commit and the time of the build", () => {
    const env = { COMMIT_SHA: "549c93afb5d1592257262ceb42ed2e91dcb165d6" };

    const build = readBuildInfo(env, new Date("2031-06-15T23:30:00Z"));

    expect(build).toMatchObject({
      commit: "549c93a",
      buildTime: "2031-06-15T23:30:00.000Z",
    });
  });
});

describe("servedBuilds", () => {
  it("names a game built here by its workspace and the site's commit", () => {
    const minesweeper = { workspace: "games/minesweeper" };

    expect(servedBuilds({ minesweeper }, "e72f5a7")).toEqual({
      minesweeper: { workspace: "games/minesweeper", commit: "e72f5a7" },
    });
  });
});

describe("playPageRoute", () => {
  it("serves a game's folder from its index.html", () => {
    expect(playPageRoute("/play/solitaire/")).toEqual({
      serve: "/play/solitaire/index.html",
    });
  });

  it("serves the folder with a query too", () => {
    expect(playPageRoute("/play/solitaire/?seed=4")).toEqual({
      serve: "/play/solitaire/index.html",
    });
  });

  it("adds the slash to a game's folder", () => {
    expect(playPageRoute("/play/minesweeper")).toEqual({
      redirect: "/play/minesweeper/",
    });
  });

  it("leaves a game's own files to Vite", () => {
    expect(playPageRoute("/play/solitaire/assets/index.js")).toBeNull();
  });

  it("leaves the site's pages to Vite", () => {
    expect(playPageRoute("/games/klondike")).toBeNull();
  });
});

describe("missingImages", () => {
  let publicDir: string;

  beforeEach(() => {
    publicDir = mkdtempSync(path.join(tmpdir(), "public-"));
    mkdirSync(path.join(publicDir, "thumbnails"));
    writeFileSync(path.join(publicDir, "thumbnails", "sudoku.svg"), "<svg/>");
  });

  afterEach(() => {
    rmSync(publicDir, { recursive: true, force: true });
  });

  function catalogOf(...slugs: string[]): Catalog {
    return {
      games: slugs.map((slug) => ({
        slug,
        name: slug,
        category: "classics",
        blurb: "",
        players: { min: 1, max: 1 },
        minutes: 5,
        added: "2026-10-17",
      })),
      imagesOf: (game) => [`/thumbnails/${game.slug}.svg`],
    };
  }

  it("finds every picture in place", () => {
    expect(missingImages(catalogOf("sudoku"), publicDir)).toEqual([]);
  });

  it("names each picture that isn't there", () => {
    expect(missingImages(catalogOf("sudoku", "reversi"), publicDir)).toEqual([
      "/thumbnails/reversi.svg",
    ]);
  });
});

describe("loadCatalog", () => {
  it("loads the site's games, and the pictures each shows, through Vite", async () => {
    const { games, imagesOf } = await loadCatalog();

    const klondike = games.find((game) => game.slug === "klondike");
    expect(klondike && imagesOf(klondike)).toEqual([
      "/play/solitaire/docs/screenshots/klondike/thumb.webp",
      "/play/solitaire/docs/screenshots/klondike/preview.webp",
    ]);
  });
});

describe("manifestProblems", () => {
  /** Returns a hosted game the site lists. */
  function hosted(name: string, play: Game["play"]): Game {
    return {
      slug: name.toLowerCase(),
      name,
      category: "solitaire",
      blurb: "",
      players: { min: 1, max: 1 },
      minutes: 5,
      added: "2026-10-17",
      play,
    };
  }

  /** The manifests of a collection and of a single game. */
  const MANIFESTS: Readonly<Record<string, GameManifest>> = {
    solitaire: {
      name: "Solitaire Collection",
      games: [
        { id: "klondike", name: "Klondike" },
        { id: "bakers", name: "Baker's Game" },
      ],
    },
    minesweeper: { name: "Minesweeper" },
  };

  /** Returns the problems with a catalog of games against MANIFESTS. */
  function problemsOf(...games: Game[]): string[] {
    return manifestProblems(games, (build) => MANIFESTS[build]);
  }

  it("finds the catalog and the builds agreeing", () => {
    const problems = problemsOf(
      hosted("Klondike", { build: "solitaire", id: "klondike" }),
      hosted("Minesweeper", { build: "minesweeper" }),
    );

    expect(problems).toEqual([]);
  });

  it("takes a typographic apostrophe for a straight one", () => {
    const problems = problemsOf(
      hosted("Baker\u2019s Game", { build: "solitaire", id: "bakers" }),
    );

    expect(problems).toEqual([]);
  });

  it("leaves a game still to come alone", () => {
    const problems = problemsOf(hosted("Sudoku", undefined));

    expect(problems).toEqual([]);
  });

  it("names an id the build doesn't open", () => {
    const problems = problemsOf(
      hosted("Spider", { build: "solitaire", id: "spider" }),
    );

    expect(problems).toEqual(["Spider: /play/solitaire/ opens no game spider"]);
  });

  it("names a game the build calls something else", () => {
    const problems = problemsOf(
      hosted("Klondike Solitaire", { build: "solitaire", id: "klondike" }),
    );

    expect(problems).toEqual([
      "Klondike Solitaire: /play/solitaire/#/klondike calls it Klondike",
    ]);
  });

  it("names a single game the build calls something else", () => {
    const problems = problemsOf(hosted("Mines", { build: "minesweeper" }));

    expect(problems).toEqual([
      "Mines: /play/minesweeper/ calls itself Minesweeper",
    ]);
  });

  it("names a build with no manifest", () => {
    const game = hosted("Minesweeper", { build: "minesweeper" });

    const problems = manifestProblems([game], () => undefined);

    expect(problems).toEqual([
      "Minesweeper: /play/minesweeper/ has no readable game.json",
    ]);
  });
});

describe("readGameManifest", () => {
  let publicDir: string;

  beforeEach(() => {
    publicDir = mkdtempSync(path.join(tmpdir(), "public-"));
  });

  afterEach(() => {
    rmSync(publicDir, { recursive: true, force: true });
  });

  /** Writes a build's game.json into the public folder. */
  function writeManifest(build: string, text: string): void {
    mkdirSync(path.join(publicDir, "play", build), { recursive: true });
    writeFileSync(path.join(publicDir, "play", build, "game.json"), text);
  }

  it("reads a build's manifest", () => {
    writeManifest("minesweeper", '{ "name": "Minesweeper" }');

    expect(readGameManifest(publicDir, "minesweeper")).toEqual({
      name: "Minesweeper",
    });
  });

  it("finds none in a build without one", () => {
    expect(readGameManifest(publicDir, "minesweeper")).toBeUndefined();
  });

  it("finds none in one it can't read as a manifest", () => {
    writeManifest("minesweeper", '{ "title": "Minesweeper" }');

    expect(readGameManifest(publicDir, "minesweeper")).toBeUndefined();
  });
});
