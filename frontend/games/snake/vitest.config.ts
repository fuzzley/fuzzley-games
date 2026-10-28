import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    exclude: ["src/main.ts", "src/testing/**"],
    thresholds: {
      // The rules and the view are held to a floor near 100%, since each is
      // a spec's picture of a board.
      "src/rules/**": {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
      // Short of 100% by the throw for a square a snake must have, which
      // reading by index, to allocate nothing per frame, can't do without.
      "src/view/**": {
        statements: 99,
        branches: 95,
        functions: 100,
        lines: 100,
      },
    },
  }),
);
