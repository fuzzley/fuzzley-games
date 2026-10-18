// The site's own Vite plugins, which vite.config.ts lists.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { type Connect, type Plugin, runnerImport } from "vite";
import type * as GameModel from "../src/app/model/game.ts";
import type * as GameData from "../src/app/provider/games.ts";
import type * as Themes from "../src/app/provider/themes.ts";
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
export function versionJson(): Plugin {
  return {
    name: "version-json",
    apply: "build",
    generateBundle() {
      const { version } = JSON.parse(
        readFileSync(path.join(SITE_DIR, "package.json"), "utf8"),
      ) as { version: string };
      const commit = commitHash();
      const buildInfo = {
        version,
        commit,
        buildTime: new Date().toISOString(),
        games: servedBuilds(readManifest(), commit),
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
 * the specs of `loadCatalog` and `loadThemeChoice` run it on every test.
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

/** Holds what the page needs to pick a palette before it paints. */
export interface ThemeChoice {
  readonly ids: readonly string[];
  readonly storageKey: string;
  readonly defaults: Readonly<Record<Themes.ColorMode, string>>;
}

/** Loads the palettes' ids, where a choice is kept, and the defaults. */
export async function loadThemeChoice(): Promise<ThemeChoice> {
  const themes = await importApp<typeof Themes>("src/app/provider/themes.ts");
  return {
    ids: themes.THEMES.map((theme) => theme.id),
    storageKey: themes.THEME_STORAGE_KEY,
    defaults: themes.DEFAULT_THEMES,
  };
}

/**
 * Returns /theme.js, which picks the palette before anything paints: the
 * player's saved choice, else the default for the system's color scheme.
 *
 * It is plain ES5, since it runs before anything else on the page.
 */
export function themeBootstrapScript({
  ids,
  storageKey,
  defaults,
}: ThemeChoice): string {
  const json = (value: unknown): string => JSON.stringify(value);
  return `// Picks the palette before anything paints; ThemeService takes over once
// Angular starts. Generated from src/app/provider/themes.ts by
// tools/vite-plugins.ts.
(function () {
  var themes = ${json(ids)};
  var saved;
  try {
    saved = localStorage.getItem(${json(storageKey)});
  } catch (e) {}
  var dark =
    window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme =
    themes.indexOf(saved) >= 0 ? saved : dark ? ${json(defaults.dark)} : ${json(defaults.light)};
})();
`;
}

/**
 * Serves /theme.js from the dev server and writes it into the build, made
 * from the app's own list of palettes, so index.html can't drift from it.
 *
 * The dev server reads the list once, when it starts.
 */
export function themeBootstrap(): Plugin {
  let script: Promise<string> | undefined;
  const load = (): Promise<string> =>
    (script ??= loadThemeChoice().then(themeBootstrapScript));
  return {
    name: "theme-bootstrap",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/theme.js") {
          next();
          return;
        }
        load().then((code) => {
          res.setHeader("Content-Type", "text/javascript");
          res.end(code);
        }, next);
      });
    },
    async generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "theme.js",
        source: await load(),
      });
    },
  };
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
