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
      // The scene and the shell a little under what their specs reach, so a
      // part without specs fails the run; raised as they rise.
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
      // page, but for the helper that runs the scene, which has no spec.
      pure: ["src/rules", "src/view", "src/testing", "tools"],
      // The specs that play every wave or lay every wave out, without the
      // coverage that would triple their time: the other rules specs alone
      // hold the rules to their floor.
      sim: [
        "src/rules/waves/every_wave",
        "src/rules/waves/every_endless_wave",
        "src/rules/field/every_layout",
      ],
    },
  }),
);
