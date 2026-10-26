import type { Plugin } from "vite";
import { mergeConfig } from "vite";
import { gameConfig } from "./vite.ts";

/** Returns the names of the plugins a config adds. */
function pluginNames(plugins: unknown[] | undefined): string[] {
  return (plugins ?? [])
    .flat(Infinity)
    .map((plugin) => (plugin as Plugin).name);
}

describe("gameConfig", () => {
  it("builds into dist/ with addresses relative to the page", () => {
    const config = gameConfig({ port: 9001, name: "Minesweeper" });

    expect(config).toMatchObject({
      base: "./",
      build: { outDir: "dist", assetsDir: "assets" },
    });
  });

  it("serves the game on its own port and opens it", () => {
    const config = gameConfig({ port: 9001, name: "Minesweeper" });

    expect(config.server).toEqual({ port: 9001, open: true });
  });

  it("compiles Angular and writes @fz/style's palettes and icons and the game's manifest", () => {
    const config = gameConfig({ port: 9001, name: "Minesweeper" });

    expect(pluginNames(config.plugins)).toEqual(
      expect.arrayContaining([
        "@analogjs/vite-plugin-angular",
        "fz-theme-bootstrap",
        "fz-game-manifest",
      ]),
    );
  });

  it("keeps what a game adds when the game merges its own config into it", () => {
    const config = mergeConfig(
      gameConfig({ port: 9000, name: "Solitaire Collection" }),
      {
        build: { sourcemap: true },
      },
    );

    expect(config["build"]).toEqual({
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: true,
    });
  });
});
