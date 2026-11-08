import { readFileSync } from "node:fs";
import angular from "@analogjs/vite-plugin-angular";
import { angularSpecs, coverage, nodeSpecs } from "@fz/dev/vitest";
import { type Plugin, normalizePath } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

// The specs that play every wave or lay every wave out run in a project of
// their own, without the coverage that would triple their time: the other
// rules specs alone hold the rules to their floor.
const SIMULATIONS: readonly string[] = [
  "src/rules/waves/every_wave/*.spec.ts",
  "src/rules/waves/every_endless_wave/*.spec.ts",
  "src/rules/field/every_layout/*.spec.ts",
];

// The specs of the rules and the view, which run in Node, as nothing they
// test touches a page.
const LAYER_SPECS: readonly string[] = [
  "src/rules/**/*.spec.ts",
  "src/view/**/*.spec.ts",
];

// The specs of the helpers that run the scene, by their names in
// `src/testing/`, which need a page, as the scene's own do; the other
// helpers' specs run in Node with the rules' and the view's.
const SCENE_HELPER_SPECS: readonly string[] = ["belt_board.spec.ts"];

/** Returns text a `RegExp` matches as it is. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The measured code both `dom` and `pure` load, the rules', the view's and
// the specs' helpers', but not their specs, which lint keeps free of
// Angular. Coverage adds a
// file's two runs up only where both compiled it alike, so `dom` leaves it
// to oxc, as `pure` does, rather than to Analog.
const SHARED_CODE = new RegExp(
  `^${escaped(normalizePath(import.meta.dirname))}/src/(?:rules|view|testing)/.*(?<!\\.spec)\\.ts$`,
);

/**
 * Hands a project's own Vite server each file the config's watcher sees
 * added or removed, since Vitest watches through that one alone, so Analog's
 * plugin takes a new component into its program while `yarn test:watch`
 * runs.
 */
function forwardAddedAndRemoved(): Plugin {
  return {
    name: "forward-added-and-removed",
    configureVitest({ vitest, project }) {
      const from = vitest.vite.watcher;
      const to = project.vite.watcher;
      if (from === to) {
        return;
      }
      from.on("add", (file: string) => to.emit("add", file));
      from.on("unlink", (file: string) => to.emit("unlink", file));
    },
  };
}

/**
 * Keys a project's cached modules by this file too, which Vitest leaves out
 * of a project declared with `extends: false`, so a change to what Analog's
 * plugin passes by is compiled afresh rather than read from the cache.
 */
function keyedByThisConfig(): Plugin {
  const config = readFileSync(import.meta.filename, "utf8");
  return {
    name: "keyed-by-this-config",
    configureVitest({ defineCacheKeyGenerator }) {
      defineCacheKeyGenerator(() => config);
    },
  };
}

export default defineConfig({
  test: {
    coverage: coverage({
      // The specs' helpers and the scripts are measured with no floor, so
      // what of them goes untested shows.
      include: ["src/**/*.ts", "tools/**/*.mjs"],
      exclude: ["src/main.ts", "src/test-setup.ts"],
      thresholds: {
        // The rules and the view are held to a floor near 100%, since each
        // is a spec's picture of a field.
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
        // The scene and the shell a little under what their specs reach,
        // so a part without specs fails the run; raised as they rise.
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
    }),
    // Each project is a config of its own, and Analog's plugin, jsdom and
    // the setup are `dom`'s alone, so they start only for the specs that
    // need them. The plugin, `dom`'s own, gives it Analog's pool.
    projects: [
      {
        extends: false,
        plugins: [
          angular({ transformFilter: (_code, id) => !SHARED_CODE.test(id) }),
          forwardAddedAndRemoved(),
          keyedByThisConfig(),
        ],
        // Analog's plugin turns oxc off unless a config sets it, so this
        // turns it back on for the code the plugin leaves.
        oxc: { include: SHARED_CODE },
        test: {
          name: "dom",
          ...angularSpecs(),
          // Every spec the other two don't run, so none runs in neither. The
          // last glob passes the scene helpers' specs alone: an extglob
          // checks only how a name starts, so it holds their whole names,
          // and one at a pattern's end takes `src/testing/` itself too,
          // dropping the folder whole, so `.spec.ts` follows it.
          exclude: [
            ...configDefaults.exclude,
            ...LAYER_SPECS,
            `src/testing/**/!(${SCENE_HELPER_SPECS.join("|")}).spec.ts`,
          ],
        },
      },
      {
        extends: false,
        test: {
          name: "pure",
          ...nodeSpecs([
            ...LAYER_SPECS,
            "src/testing/**/*.spec.ts",
            "tools/**/*.spec.ts",
          ]),
          exclude: [
            ...configDefaults.exclude,
            ...SIMULATIONS,
            ...SCENE_HELPER_SPECS.map((name) => `src/testing/**/${name}`),
          ],
        },
      },
      { extends: false, test: { name: "sim", ...nodeSpecs(SIMULATIONS) } },
    ],
  },
});
