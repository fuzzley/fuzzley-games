import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    exclude: ["src/main.ts", "src/testing/**"],
    thresholds: {
      // The rules and the view are held to a floor near 100%, since each is
      // a spec's picture of a field.
      "src/rules/**": {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
      "src/view/**": {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
    },
  }),
);
