import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";

/** The floor of the rules and the view, near 100%, since each is a spec's picture of a field. */
const PURE_FLOOR = {
  statements: 100,
  branches: 95,
  functions: 100,
  lines: 100,
};

export default defineConfig(
  angularTests({
    // The specs' helpers and the scripts are measured with no floor, so what
    // of them goes untested shows, but for the helpers held as the rules are
    // (eslint.config.js), which keep the rules' floor.
    include: ["src/**/*.ts", "tools/**/*.mjs"],
    thresholds: {
      "src/rules/**": PURE_FLOOR,
      "src/testing/solver.ts": PURE_FLOOR,
      "src/view/**": PURE_FLOOR,
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
      // The specs that time what they run, in a folder named benchmarks in
      // any layer, a glob each lift's folder matches without a line here,
      // and without the coverage that would slow them several times over:
      // the layer's other specs alone hold it to its floor. `test:coverage`
      // runs them with `--passWithNoTests`, for a library with none yet,
      // which passes a run that finds no spec there and never one in which
      // a spec fails.
      sim: ["src/**/benchmarks"],
    },
  }),
);
