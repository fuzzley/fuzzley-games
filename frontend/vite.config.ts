/// <reference types="vitest" />
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, type Connect, type Plugin } from "vite";
import angular from "@analogjs/vite-plugin-angular";
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

export default defineConfig({
  plugins: [angular(), versionJson(), servePlayPages()],
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
