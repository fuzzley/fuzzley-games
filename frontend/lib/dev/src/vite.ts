// The Vite config every game built here shares, which its vite.config.ts
// extends with what is its own:
//
//     export default defineConfig(
//       mergeConfig(gameConfig({ port: 9001, name: "Minesweeper" }), {}),
//     );

import angular from "@analogjs/vite-plugin-angular";
import { fuzzleyStyle } from "@fz/style/vite";
import type { UserConfig } from "vite";
import { gameManifest, type ManifestSource } from "./game_manifest.ts";

/** Says what sets one game's config apart from the others'. */
export interface Game extends ManifestSource {
  /**
   * The dev server's port, a different one for each game, which its
   * screenshot script captures from unless told otherwise.
   */
  readonly port: number;
}

/**
 * Returns the config every game's build and dev server share: Angular, the
 * palettes and icons of `@fz/style`, and a build in `dist/` that the site can
 * serve from any folder, with the game.json that says what it holds.
 */
export function gameConfig({ port, ...manifest }: Game): UserConfig {
  return {
    // The site serves a game's build from /play/<slug>/, so every address in
    // it is relative to its index.html.
    base: "./",
    plugins: [angular(), fuzzleyStyle(), gameManifest(manifest)],
    server: {
      port,
      open: true,
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
    },
  };
}
