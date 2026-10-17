// The site's own Vite plugins, which vite.config.ts lists.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { type Connect, type Plugin, runnerImport } from "vite";
import type * as GameModel from "../src/app/model/game.ts";
import type * as GameData from "../src/app/provider/games.ts";
import { readManifest } from "./games.mjs";
import { FRONTEND_DIR } from "./script.mjs";

/** The games, and what pictures of each the site shows. */
export interface Catalog {
  readonly games: readonly GameModel.Game[];
  readonly imagesOf: (game: GameModel.Game) => string[];
}

/**
 * Returns the short commit a build comes from. COMMIT_SHA comes first: the
 * Docker build passes it in, and the image has no .git to ask.
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

/**
 * Writes dist/version.json, which nginx serves uncached, so the live site says
 * which commit it was built from, and which build of each game it serves.
 */
export function versionJson(): Plugin {
  return {
    name: "version-json",
    apply: "build",
    generateBundle() {
      const { version } = JSON.parse(
        readFileSync(path.join(FRONTEND_DIR, "package.json"), "utf8"),
      ) as { version: string };
      const buildInfo = {
        version,
        commit: commitHash(),
        buildTime: new Date().toISOString(),
        games: Object.fromEntries(
          Object.entries(readManifest()).map(([slug, game]) => [
            slug,
            { asset: game.asset, commit: game.commit },
          ]),
        ),
      };
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(buildInfo, null, 2),
      });
    },
  };
}

/**
 * Returns how to answer a request for a game's page, as nginx does: a game's
 * folder serves its index.html, and the folder without its slash redirects
 * to it. Returns null for anything else, which Vite answers.
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
 * preview servers. Vite would otherwise answer with the site's own index.html.
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
 * Loads the site's catalog through Vite. The app's modules resolve as the
 * app's bundler does (no file extensions), so Node can't import them itself,
 * and importing them into this config would bind it to how the app is
 * written. `runnerImport` is experimental; its spec runs it on every test.
 */
export async function loadCatalog(): Promise<Catalog> {
  const options = {
    configFile: false,
    root: FRONTEND_DIR,
    logLevel: "silent",
  } as const;
  const [data, model] = await Promise.all([
    runnerImport<typeof GameData>(
      path.join(FRONTEND_DIR, "src/app/provider/games.ts"),
      options,
    ),
    runnerImport<typeof GameModel>(
      path.join(FRONTEND_DIR, "src/app/model/game.ts"),
      options,
    ),
  ]);
  return { games: data.module.GAMES, imagesOf: model.module.imagesOf };
}

/** Returns the games' pictures that aren't in a folder of public files. */
export function missingImages(catalog: Catalog, publicDir: string): string[] {
  return catalog.games
    .flatMap((game) => catalog.imagesOf(game))
    .filter((url) => !existsSync(path.join(publicDir, url)));
}

/**
 * Fails the build when a game's picture is missing. For a hosted game that
 * means the catalog links a game the fetched builds don't have, such as one
 * renamed in its own repository, which would otherwise open whatever game was
 * played last: a build ships screenshots of every game it has. A game still
 * to come needs its drawing in public/thumbnails/.
 */
export function checkGameImages(): Plugin {
  return {
    name: "check-game-images",
    apply: "build",
    async buildStart() {
      const missing = missingImages(
        await loadCatalog(),
        path.join(FRONTEND_DIR, "public"),
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
