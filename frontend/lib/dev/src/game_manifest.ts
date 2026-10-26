// What a game's build says it holds, in a game.json at the top of its dist/,
// which the site's build checks its catalog against.

import path from "node:path";
import { type Plugin, type ResolvedConfig, runnerImport } from "vite";

/** The file at the top of a game's build that says what the build holds. */
export const GAME_MANIFEST = "game.json";

/** Says what a game's build holds: one game, or a collection of games. */
export interface GameManifest {
  /** The game's name, or the collection's. */
  readonly name: string;
  /** The games a collection opens, each at `#/<id>`. */
  readonly games?: readonly GameEntry[];
}

/** Names one game of a collection. */
export interface GameEntry {
  /** The route the build opens the game at, `#/<id>`. */
  readonly id: string;
  readonly name: string;
}

/** Says which of a collection's modules lists its games. */
export interface Catalog {
  /** The module, as a path from the game's folder. */
  readonly module: string;
  /** The export that lists the games, each with an `id` and a `name`. */
  readonly export: string;
}

/** Says what a game's build writes in its manifest. */
export interface ManifestSource {
  /** The game's name, or the collection's. */
  readonly name: string;
  /** Where a collection lists its games. */
  readonly catalog?: Catalog;
}

/** Returns whether a value names a game with an id and a name. */
export function isGameEntry(value: unknown): value is GameEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

/** Returns whether a value is a game's manifest, as a build's game.json holds it. */
export function isGameManifest(value: unknown): value is GameManifest {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  return (
    !("games" in value) ||
    (Array.isArray(value.games) && value.games.every(isGameEntry))
  );
}

/**
 * Loads a collection's games from its catalog module through Vite, which
 * resolves the module's imports as the game's own build does.
 */
async function loadGames(
  config: ResolvedConfig,
  { module, export: name }: Catalog,
): Promise<GameEntry[]> {
  const { module: loaded } = await runnerImport<Record<string, unknown>>(
    path.resolve(config.root, module),
    {
      configFile: false,
      root: config.root,
      resolve: { alias: config.resolve.alias },
      logLevel: "silent",
    },
  );
  const games = loaded[name];
  if (!Array.isArray(games) || !games.every(isGameEntry)) {
    throw new Error(
      `${module} has no export ${name} that lists games by id and name.`,
    );
  }
  return games.map(({ id, name }) => ({ id, name }));
}

/**
 * Writes game.json into a game's build: its name and, for a collection, the
 * id and name of every game its catalog lists.
 */
export function gameManifest({ name, catalog }: ManifestSource): Plugin {
  return {
    name: "fz-game-manifest",
    apply: "build",
    async generateBundle() {
      const manifest: GameManifest = catalog
        ? { name, games: await loadGames(this.environment.config, catalog) }
        : { name };
      this.emitFile({
        type: "asset",
        fileName: GAME_MANIFEST,
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}
