// The site's own Vite plugins, which vite.config.ts lists.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  GAME_MANIFEST,
  type GameManifest,
  isGameManifest,
} from "@fz/dev/game-manifest";
import { type Connect, type Plugin, runnerImport } from "vite";
import type { BuildInfo } from "../src/app/model/build.ts";
import type * as GameModel from "../src/app/model/game.ts";
import type * as GameData from "../src/app/provider/games.ts";
import { type GameBuild, isPinned, readManifest } from "./games.mjs";
import { SITE_DIR } from "./script.mjs";

/** Lists the site's games and what pictures of each the site shows. */
export interface Catalog {
  readonly games: readonly GameModel.Game[];
  readonly imagesOf: (game: GameModel.Game) => string[];
}

/**
 * Returns the short commit a build comes from.
 *
 * COMMIT_SHA comes first: the Docker build passes it in, and the image has no
 * .git to ask.
 */
export function commitHash(
  env: NodeJS.ProcessEnv = process.env,
  askGit: () => string = () =>
    execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString(),
): string {
  const fromEnv = env["COMMIT_SHA"];
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return askGit().trim();
  } catch {
    return "dev";
  }
}

/** Returns the site's version, the commit it is built from, and the time. */
export function readBuildInfo(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): BuildInfo {
  const { version } = JSON.parse(
    readFileSync(path.join(SITE_DIR, "package.json"), "utf8"),
  ) as { version: string };
  return { version, commit: commitHash(env), buildTime: now.toISOString() };
}

/** Names the build of a game that version.json says the site serves. */
export type ServedBuild =
  | { readonly asset: string; readonly commit: string }
  | { readonly workspace: string; readonly commit: string };

/**
 * Returns which build of each game the site serves: a pinned game's archive
 * and the commit it was built from, or a game built here, from the site's own
 * commit.
 */
export function servedBuilds(
  manifest: Readonly<Record<string, GameBuild>>,
  commit: string,
): Record<string, ServedBuild> {
  return Object.fromEntries(
    Object.entries(manifest).map(([slug, game]) => [
      slug,
      isPinned(game)
        ? { asset: game.asset, commit: game.commit }
        : { workspace: game.workspace, commit },
    ]),
  );
}

/**
 * Writes dist/version.json, which nginx serves uncached, so the live site says
 * which commit it was built from, and which build of each game it serves.
 */
export function versionJson(build: BuildInfo): Plugin {
  return {
    name: "version-json",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(
          { ...build, games: servedBuilds(readManifest(), build.commit) },
          null,
          2,
        ),
      });
    },
  };
}

/**
 * Returns how to answer a request for a game's page, as nginx does, or null
 * for anything else, which Vite answers.
 *
 * A game's folder serves its index.html, and the folder without its slash
 * redirects to it.
 */
export function playPageRoute(
  url: string,
): { serve: string } | { redirect: string } | null {
  const match = /^\/play\/([\w-]+)(\/?)(?:\?|$)/.exec(url);
  if (!match) return null;
  const [, slug = "", slash] = match;
  return slash
    ? { serve: `/play/${slug}/index.html` }
    : { redirect: `/play/${slug}/` };
}

/**
 * Serves each game's index.html at its folder, /play/<slug>/, in the dev and
 * preview servers, where Vite would otherwise answer with the site's own
 * index.html.
 */
export function servePlayPages(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const route = playPageRoute(req.url ?? "");
    if (route && "redirect" in route) {
      res.statusCode = 301;
      res.setHeader("Location", route.redirect);
      res.end();
      return;
    }
    if (route) req.url = route.serve;
    next();
  };
  return {
    name: "serve-play-pages",
    configureServer: (server) => {
      server.middlewares.use(handle);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(handle);
    },
  };
}

/**
 * Loads one of the app's modules, by its path in the frontend, through Vite.
 *
 * The app's modules resolve as the app's bundler does (no file extensions),
 * so Node can't import them itself, and importing them into this config
 * would bind it to how the app is written. `runnerImport` is experimental;
 * the spec of `loadCatalog` runs it on every test.
 */
async function importApp<T>(file: string): Promise<T> {
  const { module } = await runnerImport<T>(path.join(SITE_DIR, file), {
    configFile: false,
    root: SITE_DIR,
    logLevel: "silent",
  });
  return module;
}

/** Loads the site's catalog from the app. */
export async function loadCatalog(): Promise<Catalog> {
  const [data, model] = await Promise.all([
    importApp<typeof GameData>("src/app/provider/games.ts"),
    importApp<typeof GameModel>("src/app/model/game.ts"),
  ]);
  return { games: data.GAMES, imagesOf: model.imagesOf };
}

/** Returns the games' pictures that aren't in a folder of public files. */
export function missingImages(catalog: Catalog, publicDir: string): string[] {
  return catalog.games
    .flatMap((game) => catalog.imagesOf(game))
    .filter((url) => !existsSync(path.join(publicDir, url)));
}

/**
 * Fails the build when a game's picture is missing.
 *
 * For a hosted game that means the catalog links a game the fetched builds
 * don't have, such as one renamed in its own repository, which would
 * otherwise open whatever game was played last: a build ships screenshots of
 * every game it has. A game still to come needs its drawing in
 * public/thumbnails/.
 */
export function checkGameImages(): Plugin {
  return {
    name: "check-game-images",
    apply: "build",
    async buildStart() {
      const missing = missingImages(
        await loadCatalog(),
        path.join(SITE_DIR, "public"),
      );
      if (missing.length > 0) {
        this.error(
          "These games' pictures are missing: a hosted game's come from its " +
            "build in public/play/ (see games.json), and a game still to " +
            `come needs one in public/thumbnails/.\n  ${missing.join("\n  ")}`,
        );
      }
    },
  };
}

/**
 * Returns whether two names are the same, apostrophes aside, so the site can
 * set its own in type.
 */
function sameName(a: string, b: string): boolean {
  const straight = (name: string): string => name.replaceAll("\u2019", "'");
  return straight(a) === straight(b);
}

/**
 * Returns where the catalog's hosted games and what their builds say they
 * hold disagree, one line each: a build with no manifest, an id a build
 * doesn't open, or a name the build doesn't give the game.
 */
export function manifestProblems(
  games: readonly GameModel.Game[],
  manifestOf: (build: string) => GameManifest | undefined,
): string[] {
  return games.flatMap((game) => {
    if (!game.play) return [];
    const { build, id } = game.play;
    const where = `${game.name}: /play/${build}/`;
    const manifest = manifestOf(build);
    if (!manifest) return [`${where} has no readable ${GAME_MANIFEST}`];
    if (id === undefined) {
      return sameName(manifest.name, game.name)
        ? []
        : [`${where} calls itself ${manifest.name}`];
    }
    const entry = manifest.games?.find((candidate) => candidate.id === id);
    if (!entry) return [`${where} opens no game ${id}`];
    return sameName(entry.name, game.name)
      ? []
      : [`${where}#/${id} calls it ${entry.name}`];
  });
}

/**
 * Returns a build's manifest from a folder of public files, or nothing when
 * it has none it can read.
 */
export function readGameManifest(
  publicDir: string,
  build: string,
): GameManifest | undefined {
  const file = path.join(publicDir, "play", build, GAME_MANIFEST);
  if (!existsSync(file)) return undefined;
  const manifest: unknown = JSON.parse(readFileSync(file, "utf8"));
  return isGameManifest(manifest) ? manifest : undefined;
}

/**
 * Fails the build when the catalog names a game, or calls it a name, that its
 * build doesn't, as the build's game.json says.
 *
 * A pinned archive predates game.json, so it is left to the pictures' check.
 */
export function checkGameManifests(): Plugin {
  return {
    name: "check-game-manifests",
    apply: "build",
    async buildStart() {
      const builds = readManifest();
      const publicDir = path.join(SITE_DIR, "public");
      const hosted = (await loadCatalog()).games.filter(({ play }) => {
        const build = play && builds[play.build];
        return build !== undefined && !isPinned(build);
      });
      const problems = manifestProblems(hosted, (build) =>
        readGameManifest(publicDir, build),
      );
      if (problems.length > 0) {
        this.error(
          "The catalog and the games' builds disagree; each build's " +
            `${GAME_MANIFEST} says what it holds.\n  ${problems.join("\n  ")}`,
        );
      }
    },
  };
}
