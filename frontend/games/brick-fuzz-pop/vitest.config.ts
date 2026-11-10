import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
  angularTests({
    // The specs' helpers and the scripts are measured with no floor, so what
    // of them goes untested shows.
    include: ["src/**/*.ts", "tools/**/*.mjs"],
    exclude: ["src/main.ts"],
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
      // The scene and the shell at Asteroid Breaker's floors, so a part
      // without specs fails the run.
      "src/scene/**": {
        statements: 98,
        branches: 92,
        functions: 100,
        lines: 99,
      },
      "src/app/**": {
        statements: 98,
        branches: 97,
        functions: 97,
        lines: 98,
      },
    },
    projects: {
      root: import.meta.dirname,
      // The rules, the view, the specs' helpers and the scripts touch no
      // page.
      pure: ["src/rules", "src/view", "src/testing", "tools"],
      // The specs that replay every level's certificates and hold the
      // careless player to its floors, without the coverage that would
      // slow them several times over: the other rules specs alone hold the
      // rules to their floor.
      sim: ["src/rules/levels/every_level", "src/rules/levels/every_floor"],
    },
  }),
);
