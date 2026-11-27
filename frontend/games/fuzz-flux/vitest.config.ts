import { angularTests } from "@fz/dev/vitest";
import { defineConfig } from "vitest/config";
import { HELD_AS_RULES } from "./eslint.config.js";

/** The floor of the rules and the view, near 100%, since each is a spec's picture of a board. */
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
    // A floor over a folder with no file yet holds nothing, and holds its
    // first file the moment it is written.
    thresholds: {
      "src/rules/**": PURE_FLOOR,
      "src/view/**": PURE_FLOOR,
      // The specs' helpers held as the rules are, at the rules' floor, each
      // from the change that adds it to the list in eslint.config.js.
      ...Object.fromEntries(HELD_AS_RULES.map((file) => [file, PURE_FLOOR])),
      // The scene and the shell at Brick Fuzz Pop's and Rickashay's floors,
      // so a part without specs fails the run.
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
      // The specs that play the golden games, replay every level's
      // certificates, hold the casual player to its floors, and time what
      // a move runs, in a folder named benchmarks in any layer, without the
      // coverage that would slow them several times over: the other specs
      // alone hold the rules and the view to their floor.
      sim: [
        "src/rules/golden",
        "src/rules/levels/every_level",
        "src/rules/levels/every_floor",
        "src/**/benchmarks",
      ],
    },
  }),
);
