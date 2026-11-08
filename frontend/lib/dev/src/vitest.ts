// The Vitest settings every workspace's specs share. A workspace's
// vitest.config.ts gives its floors, and its files where they differ:
//
//     export default defineConfig(angularTests({ thresholds: { ... } }));

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import angular, { type PluginOptions } from "@analogjs/vite-plugin-angular";
import { type Plugin, normalizePath } from "vite";
import {
  type TestProjectInlineConfiguration,
  type ViteUserConfig,
  configDefaults,
} from "vitest/config";
import type { CoverageOptions, InlineConfig } from "vitest/node";

/** The floors `yarn test` fails below, for the whole suite or by glob. */
export type Thresholds = NonNullable<CoverageOptions["thresholds"]>;

/** Says what a workspace's coverage measures, and the floors it holds. */
export interface Coverage {
  /**
   * The files measured, as globs from the workspace's folder: every `.ts`
   * file under `src/` unless given.
   */
  readonly include?: readonly string[];
  /** The files left out of what `include` names. */
  readonly exclude?: readonly string[];
  /**
   * Floors a little under the suite's real figures, raised as they rise, so
   * that coverage only ever goes up.
   */
  readonly thresholds: Thresholds;
}

/**
 * Says which of an Angular workspace's specs run in which Vitest project, by
 * folders named from the workspace's (`src/rules`).
 */
export interface Projects {
  /** The workspace's folder, its config's `import.meta.dirname`. */
  readonly root: string;
  /**
   * The folders whose specs touch no page, such as the rules' and the
   * view's, which run in `pure`, in Node; `dom` runs every other spec
   * under `src/`, in jsdom with Analog's plugin.
   *
   * Their code must hold nothing Analog's plugin must compile, such as a
   * decorated class: `dom` compiles it with Vite's oxc, as `pure` does, so
   * that coverage counts it once.
   */
  readonly pure: readonly string[];
  /**
   * The folders of the specs that play or lay out every level or wave,
   * which run in `sim`, in Node, and which a `test` script runs apart,
   * without the coverage that would slow them several times over.
   */
  readonly sim?: readonly string[];
}

/**
 * Says what an Angular workspace's coverage measures and the floors it
 * holds, and the projects its specs run in, where it splits them.
 */
export interface AngularTests extends Coverage {
  /** The projects its specs run in: one, in jsdom, unless given. */
  readonly projects?: Projects;
}

/** The settings that say how and where a workspace's specs run. */
export type Specs = Pick<
  InlineConfig,
  "globals" | "environment" | "setupFiles" | "include" | "pool"
>;

/** Returns the V8 coverage settings, reported as text and as HTML. */
export function coverage({
  include = ["src/**/*.ts"],
  exclude,
  thresholds,
}: Coverage): NonNullable<InlineConfig["coverage"]> {
  return {
    provider: "v8",
    reporter: ["text", "html"],
    include: [...include],
    // Left out when there is nothing to leave out, so Vitest's own stand.
    ...(exclude === undefined ? {} : { exclude: [...exclude] }),
    thresholds,
  };
}

/**
 * Returns how an Angular workspace's specs run: every spec under `src/`, in
 * jsdom, after `src/test-setup.ts`, in Analog's pool.
 */
export function angularSpecs(): Specs {
  return {
    // Not optional: TestBed and Testing Library register their teardown on
    // the global afterEach.
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.spec.ts"],
    // The pool Analog's plugin sets, named here for a project that shares
    // its config's server: it takes the `test` options Vitest captured
    // before the plugin's config hook sets the pool, and would run in
    // `forks`.
    pool: "vmThreads",
  };
}

/** Returns how specs that run in Node do: every spec `include` names, under `src/` unless given. */
export function nodeSpecs(
  include: readonly string[] = ["src/**/*.spec.ts"],
): Specs {
  return { globals: true, environment: "node", include: [...include] };
}

/**
 * Returns the config of a workspace whose specs test Angular code, with
 * Analog's plugin to compile it, in one project or in those it names.
 * Coverage leaves out `src/test-setup.ts`.
 */
export function angularTests({
  exclude = [],
  projects,
  ...rest
}: AngularTests): ViteUserConfig {
  const measured = coverage({
    ...rest,
    exclude: ["src/test-setup.ts", ...exclude],
  });
  if (projects === undefined) {
    return {
      plugins: [angular()],
      test: { ...angularSpecs(), coverage: measured },
    };
  }
  return { test: { coverage: measured, projects: angularProjects(projects) } };
}

/** Returns the config of a workspace whose specs run in Node. */
export function nodeTests(settings: Coverage): ViteUserConfig {
  return { test: { ...nodeSpecs(), coverage: coverage(settings) } };
}

/**
 * Returns the Vitest projects an Angular workspace's specs run in, each a
 * config of its own, so each starts only what its specs need: `dom`,
 * `pure` and, where it has simulations, `sim`.
 */
function angularProjects({
  root,
  pure,
  sim = [],
}: Projects): TestProjectInlineConfiguration[] {
  const compilers = compilersOf(root, pure);
  const simulations = specsIn(sim);
  const projects: TestProjectInlineConfiguration[] = [
    {
      extends: false,
      plugins: [
        angular(compilers.analog),
        forwardAddedAndRemoved(),
        keyedBy(
          [
            readFileSync(import.meta.filename, "utf8"),
            compilers.oxc.include.source,
            ...["tsconfig.json", "tsconfig.spec.json"].map((name) =>
              textOf(join(root, name)),
            ),
          ].join("\n"),
        ),
      ],
      oxc: compilers.oxc,
      test: {
        name: "dom",
        ...angularSpecs(),
        // Every spec under `src/` the other two don't run, so none there
        // runs in neither.
        exclude: [...configDefaults.exclude, ...simulations, ...specsIn(pure)],
      },
    },
    {
      extends: false,
      test: {
        name: "pure",
        ...nodeSpecs(specsIn(pure)),
        exclude: [...configDefaults.exclude, ...simulations],
      },
    },
  ];
  if (sim.length > 0) {
    projects.push({
      extends: false,
      test: { name: "sim", ...nodeSpecs(simulations) },
    });
  }
  return projects;
}

/**
 * Returns how `dom` compiles its code: that of `pure`'s folders with Vite's
 * oxc, as `pure` does, and the rest with Analog's plugin, which passes the
 * first by.
 *
 * Coverage adds up a file's runs in two projects only where both compiled
 * it alike, or each of its functions would count twice, untested in the
 * project that never calls it.
 */
function compilersOf(
  root: string,
  pure: readonly string[],
): {
  readonly analog: Required<Pick<PluginOptions, "transformFilter">>;
  readonly oxc: { readonly include: RegExp };
} {
  const shared = new RegExp(
    `^${escaped(normalizePath(root))}/(?:${pure.map(escaped).join("|")})/.*\\.ts$`,
  );
  return {
    analog: { transformFilter: (_code, id) => !shared.test(id) },
    // Analog's plugin turns oxc off unless a config sets it, so this turns
    // it back on for the code the plugin passes by.
    oxc: { include: shared },
  };
}

/** Returns a file's text, or nothing where there is no such file. */
function textOf(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/** Returns the globs of the specs under each folder. */
function specsIn(folders: readonly string[]): string[] {
  return folders.map((folder) => `${folder}/**/*.spec.ts`);
}

/** Returns text a `RegExp` matches as it is. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
 * Keys a project's cached modules by a text standing for its config, which
 * Vitest leaves out of the key of a project declared with `extends: false`,
 * so a change to how its plugins compile, such as what Analog's passes by,
 * compiles afresh rather than being read from the cache.
 */
function keyedBy(text: string): Plugin {
  return {
    name: "keyed-by",
    configureVitest({ defineCacheKeyGenerator }) {
      defineCacheKeyGenerator(() => text);
    },
  };
}
