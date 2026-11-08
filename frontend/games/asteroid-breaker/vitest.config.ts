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

// The specs that run in Node, as nothing they test touches a page.
const PURE_SPECS: readonly string[] = [
  "src/rules/**/*.spec.ts",
  "src/view/**/*.spec.ts",
  "src/testing/**/*.spec.ts",
];

/** Returns text a `RegExp` matches as it is. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The measured code both `dom` and `pure` load, which lint keeps free of
// Angular. Coverage adds a file's two runs up only where both compiled it
// alike, so `dom` leaves it to oxc, as `pure` does, rather than to Analog.
const SHARED_CODE = new RegExp(
  `^${escaped(normalizePath(import.meta.dirname))}/src/(?:rules|view)/.*\\.ts$`,
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

export default defineConfig({
  test: {
    coverage: coverage({
      exclude: ["src/main.ts", "src/test-setup.ts", "src/testing/**"],
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
        ],
        // Analog's plugin turns oxc off unless a config sets it, so this
        // turns it back on for the code the plugin leaves.
        oxc: { include: SHARED_CODE },
        test: {
          name: "dom",
          ...angularSpecs(),
          // Every spec the other two don't run, so none runs in neither.
          exclude: [...configDefaults.exclude, ...PURE_SPECS],
        },
      },
      {
        extends: false,
        test: {
          name: "pure",
          ...nodeSpecs(PURE_SPECS),
          exclude: [...configDefaults.exclude, ...SIMULATIONS],
        },
      },
      { extends: false, test: { name: "sim", ...nodeSpecs(SIMULATIONS) } },
    ],
  },
});
