import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInNewContext } from "node:vm";
import {
  type Catalog,
  commitHash,
  loadCatalog,
  loadThemeChoice,
  missingImages,
  playPageRoute,
  servedBuilds,
  themeBootstrapScript,
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

describe("servedBuilds", () => {
  it("names a pinned game's archive and the commit it was built from", () => {
    const solitaire = {
      repo: "fuzzley/fSolitaire",
      commit: "549c93afb5d1592257262ceb42ed2e91dcb165d6",
      asset: "solitaire-549c93a.tar.gz",
      sha256: "a".repeat(64),
    };

    expect(servedBuilds({ solitaire }, "e72f5a7")).toEqual({
      solitaire: {
        asset: "solitaire-549c93a.tar.gz",
        commit: "549c93afb5d1592257262ceb42ed2e91dcb165d6",
      },
    });
  });

  it("names a game built here by its workspace and the site's commit", () => {
    const minesweeper = { workspace: "apps/minesweeper" };

    expect(servedBuilds({ minesweeper }, "e72f5a7")).toEqual({
      minesweeper: { workspace: "apps/minesweeper", commit: "e72f5a7" },
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

describe("themeBootstrapScript", () => {
  const script = themeBootstrapScript({
    ids: ["classic", "casino"],
    storageKey: "fuzzley-theme",
    defaults: { light: "classic", dark: "casino" },
  });

  /** Runs the script in a page with the given storage and color scheme. */
  function pick({
    saved = null,
    dark = false,
    storage = true,
  }: {
    saved?: string | null;
    dark?: boolean;
    storage?: boolean;
  }): string | undefined {
    const dataset: Record<string, string> = {};
    const page: Record<string, unknown> = {
      localStorage: {
        getItem: (key: string) => {
          if (!storage) throw new Error("storage is off");
          return key === "fuzzley-theme" ? saved : null;
        },
      },
      matchMedia: () => ({ matches: dark }),
      document: { documentElement: { dataset } },
    };
    page["window"] = page;
    runInNewContext(script, page);
    return dataset["theme"];
  }

  it("keeps the palette the player chose", () => {
    expect(pick({ saved: "casino" })).toBe("casino");
  });

  it("picks the light default on a light system", () => {
    expect(pick({})).toBe("classic");
  });

  it("picks the dark default on a dark system", () => {
    expect(pick({ dark: true })).toBe("casino");
  });

  it("ignores a saved value that isn't a palette", () => {
    expect(pick({ saved: "neon" })).toBe("classic");
  });

  it("still picks a palette when storage is unavailable", () => {
    expect(pick({ storage: false, dark: true })).toBe("casino");
  });
});

describe("loadThemeChoice", () => {
  it("loads the app's palettes, defaults among them, through Vite", async () => {
    const { ids, defaults } = await loadThemeChoice();

    expect(ids).toEqual(
      expect.arrayContaining([defaults.light, defaults.dark]),
    );
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
