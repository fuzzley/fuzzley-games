// Brick Breaker's Vite config with Analog's fastCompile when FAST is 1, which
// fast-compile.sh copies into the game's folder for its run, then deletes.
import angular from "@analogjs/vite-plugin-angular";
import {
  componentStylesheets,
  componentUpdates,
  gameConfig,
  watchLibraries,
} from "@fz/dev/vite";
import { defineConfig } from "vite";

const base = gameConfig({ port: 9004, name: "Brick Breaker" });
const [, ...rest] = base.plugins as unknown[];
export default defineConfig({
  ...base,
  plugins: [
    [
      componentUpdates(),
      componentStylesheets(),
      watchLibraries(),
      angular({ liveReload: true, fastCompile: process.env["FAST"] === "1" }),
    ],
    ...rest,
  ] as never,
});
