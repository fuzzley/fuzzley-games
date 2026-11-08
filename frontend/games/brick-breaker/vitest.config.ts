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
    projects: {
      root: import.meta.dirname,
      // The rules, the view and the scripts touch no page. The specs'
      // helpers stay with `dom`, as some hand the game Angular's providers.
      pure: ["src/rules", "src/view", "tools"],
      // The specs that play every level, without the coverage that would
      // quadruple their time: the other rules specs alone hold the rules to
      // their floor.
      sim: ["src/rules/levels/every_level"],
    },
  }),
);
