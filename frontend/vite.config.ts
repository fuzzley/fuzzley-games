import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vitest/config";
import angular from "@analogjs/vite-plugin-angular";
import { screenshotUrl, thumbnailUrl } from "./src/app/model/game.ts";
import { GAMES } from "./src/app/provider/games.ts";
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
      const { version } = JSON.parse(
        readFileSync(new URL("package.json", import.meta.url), "utf8"),
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

// Serves each game's index.html at its folder, /play/<slug>/, as nginx does.
// Vite would otherwise answer with the site's own index.html.
function servePlayPages(): Plugin {
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const match = /^\/play\/([\w-]+)(\/?)(?:\?|$)/.exec(req.url ?? "");
    if (!match) {
      next();
      return;
    }
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

// Fails the build when a game's picture is missing. For a hosted game that
// means the catalog links a game the fetched builds don't have, such as one
// renamed in its own repository, which would otherwise open whatever game was
// played last: a build ships screenshots of every game it has. A game still
// to come needs its drawing in public/thumbnails/.
function checkGameImages(): Plugin {
  return {
    name: "check-game-images",
    apply: "build",
    buildStart() {
      const missing = GAMES.flatMap((game) =>
        game.play
          ? [thumbnailUrl(game), screenshotUrl(game.play, "preview")]
          : [thumbnailUrl(game)],
      ).filter((url) => !existsSync(new URL(`public${url}`, import.meta.url)));
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

export default defineConfig({
  plugins: [angular(), versionJson(), servePlayPages(), checkGameImages()],
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
