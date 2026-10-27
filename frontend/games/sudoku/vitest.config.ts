import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    exclude: ["src/main.ts", "src/testing/**"],
    thresholds: {
      // The rules are held to a floor near 100%, since each is a spec's
      // picture of a grid.
      "src/rules/**": {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
    },
  }),
);
