import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import {
  gameManifest,
  isGameManifest,
  type ManifestSource,
} from "./game_manifest.ts";

/** A collection's catalog, which reaches one of its names through an alias. */
const CATALOG = `import { KLONDIKE } from "@/names";

export const GAMES = [
  { id: "klondike", name: KLONDIKE, rules: 3 },
  { id: "spider", name: "Spider", rules: 1 },
];

export const COUNT = 2;
`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fz-game-"));
  await mkdir(join(root, "src"));
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><title>Game</title>",
  );
  await writeFile(
    join(root, "src", "names.ts"),
    'export const KLONDIKE = "Klondike";\n',
  );
  await writeFile(join(root, "src", "catalog.ts"), CATALOG);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** Builds a game in the temporary folder with the plugin, and returns its game.json. */
async function buildManifest(source: ManifestSource): Promise<unknown> {
  await build({
    root,
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    plugins: [gameManifest(source)],
  });
  return JSON.parse(await readFile(join(root, "dist", "game.json"), "utf8"));
}

describe("gameManifest", () => {
  it("names a single game", async () => {
    const manifest = await buildManifest({ name: "Minesweeper" });

    expect(manifest).toEqual({ name: "Minesweeper" });
  });

  it("lists a collection's games by id and name, resolved as the build resolves them", async () => {
    const manifest = await buildManifest({
      name: "Solitaire Collection",
      catalog: { module: "src/catalog.ts", export: "GAMES" },
    });

    expect(manifest).toEqual({
      name: "Solitaire Collection",
      games: [
        { id: "klondike", name: "Klondike" },
        { id: "spider", name: "Spider" },
      ],
    });
  });

  it("fails the build when the export lists no games", async () => {
    const building = buildManifest({
      name: "Solitaire Collection",
      catalog: { module: "src/catalog.ts", export: "COUNT" },
    });

    await expect(building).rejects.toThrow(
      "src/catalog.ts has no export COUNT",
    );
  });
});

describe("isGameManifest", () => {
  it("takes a single game's manifest", () => {
    expect(isGameManifest({ name: "Minesweeper" })).toBe(true);
  });

  it("takes a collection's", () => {
    const manifest = {
      name: "Solitaire Collection",
      games: [{ id: "klondike", name: "Klondike" }],
    };

    expect(isGameManifest(manifest)).toBe(true);
  });

  it("refuses one without a name", () => {
    expect(isGameManifest({ games: [] })).toBe(false);
  });

  it("refuses a collection with a game that has no id", () => {
    const manifest = {
      name: "Solitaire Collection",
      games: [{ name: "Klondike" }],
    };

    expect(isGameManifest(manifest)).toBe(false);
  });

  it("refuses what isn't an object", () => {
    expect(isGameManifest("Minesweeper")).toBe(false);
  });
});
