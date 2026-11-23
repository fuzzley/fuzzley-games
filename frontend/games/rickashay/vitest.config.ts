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
    // The specs' helpers but those held at the rules' floor below, and the
    // scripts, are measured with no floor, so what of them goes untested
    // shows.
    include: ["src/**/*.ts", "tools/**/*.mjs"],
    exclude: ["src/main.ts"],
    thresholds: {
      "src/rules/**": PURE_FLOOR,
      "src/view/**": PURE_FLOOR,
      // The players and the checks the certificates, the floors and the
      // marks are found and held with, held as the rules are, at their floor.
      "src/testing/{line_play,wall_score,blind,sweet_spot,rally_mark,certify_api,report_api}.ts":
        PURE_FLOOR,
      // The scene and the shell at Brick Fuzz Pop's floors, so a part
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
      // The specs that replay every level's certificates, hold the careless
      // player to its floors, check every level, and time the flight,
      // without the coverage that would slow them several times over: the
      // other rules specs alone hold the rules to their floor.
      sim: [
        "src/rules/levels/every_level",
        "src/rules/levels/every_floor",
        "src/rules/levels/every_check",
        "src/rules/flight/benchmarks",
      ],
    },
  }),
);
