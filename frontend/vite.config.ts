import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vitest/config";
import angular from "@analogjs/vite-plugin-angular";
import { GAMES, screenshotUrl } from "./src/app/provider/game_catalog.ts";
import { readManifest } from "./tools/games.mjs";

// COMMIT_SHA comes first: the Docker build passes it in, and the image has no
// .git to ask.
function commitHash(): string {
  if (process.env["COMMIT_SHA"]) {
    return process.env["COMMIT_SHA"].slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

// Writes dist/version.json, which nginx serves uncached, so the live site says
// which commit it was built from, and which build of each game it serves.
function versionJson(): Plugin {
  return {
    name: "version-json",
    apply: "build",
    generateBundle() {
      const pkg = JSON.parse(
        readFileSync(new URL("package.json", import.meta.url), "utf8"),
      );
      const buildInfo = {
        version: pkg.version,
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

// Serves each game's index.html at its folder, /play/<slug>/, as nginx does.
// Vite would otherwise answer with the site's own index.html.
function servePlayPages(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const match = /^\/play\/([\w-]+)(\/?)(?:\?|$)/.exec(req.url ?? "");
    if (!match) return next();
    if (!match[2]) {
      res.statusCode = 301;
      res.setHeader("Location", `/play/${match[1]}/`);
      res.end();
      return;
    }
    req.url = `/play/${match[1]}/index.html`;
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

// Fails the build when the catalogue links a game the fetched builds don't
// have, such as one renamed in its own repository, which would otherwise open
// whatever game was played last. A build ships screenshots of every game it
// has, and the tiles and game pages show them, so they are what is checked.
function checkPlayLinks(): Plugin {
  return {
    name: "check-play-links",
    apply: "build",
    buildStart() {
      const missing = GAMES.flatMap((game) =>
        game.play
          ? [
              screenshotUrl(game.play, "thumb"),
              screenshotUrl(game.play, "preview"),
            ]
          : [],
      ).filter((url) => !existsSync(new URL(`public${url}`, import.meta.url)));
      if (missing.length > 0) {
        this.error(
          "The catalogue links games the builds in public/play/ don't have " +
            `(see games.json). Missing:\n  ${missing.join("\n  ")}`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [angular(), versionJson(), servePlayPages(), checkPlayLinks()],
  server: {
    port: 4200,
    host: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.{test,spec}.ts"],
  },
});
