import { angularTests, nodeSpecs } from "@fz/dev/vitest";
import { configDefaults, defineConfig, mergeConfig } from "vitest/config";

// The specs that play every level run in Node, in a project of their own,
// without the coverage that would quadruple their time: the other rules
// specs alone hold the rules to their floor.
const SIMULATIONS: readonly string[] = [
  "src/rules/levels/every_level/*.spec.ts",
];

export default mergeConfig(
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
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            // Analog's plugin sets this pool in a config hook, after Vitest
            // has taken the `test` a project sharing the server inherits, so
            // without it `unit` would run in `forks`.
            pool: "vmThreads",
            exclude: [...configDefaults.exclude, ...SIMULATIONS],
          },
        },
        // Takes nothing of the config above, whose setup needs jsdom.
        { extends: false, test: { name: "sim", ...nodeSpecs(SIMULATIONS) } },
      ],
    },
  }),
);
