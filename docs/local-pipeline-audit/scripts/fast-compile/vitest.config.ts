// Sudoku's Vitest config with Analog's fastCompile when FAST is 1, or its
// compilation API when API is 1, which fast-compile.sh copies into the
// game's folder for its run, then deletes.
import angular from "@analogjs/vite-plugin-angular";
import { angularTests, phaserFromCommonJs } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

const base = angularTests({ thresholds: {} });
export default defineConfig({
  ...base,
  plugins: [
    angular({
      fastCompile: process.env["FAST"] === "1",
      experimental: { useAngularCompilationAPI: process.env["API"] === "1" },
    }),
    phaserFromCommonJs(),
  ],
});
