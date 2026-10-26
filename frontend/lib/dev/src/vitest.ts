// The Vitest settings every workspace's specs share. A workspace's
// vitest.config.ts gives its floors, and its files where they differ:
//
//     export default defineConfig(angularTests({ thresholds: { ... } }));

import angular from "@analogjs/vite-plugin-angular";
import type { ViteUserConfig } from "vitest/config";
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

/** The settings that say how and where a workspace's specs run. */
export type Specs = Pick<
  InlineConfig,
  "globals" | "environment" | "setupFiles" | "include"
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
 * jsdom, after `src/test-setup.ts`.
 */
export function angularSpecs(): Specs {
  return {
    // Not optional: TestBed and Testing Library register their teardown on
    // the global afterEach.
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.spec.ts"],
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
 * Analog's plugin to compile it. Coverage leaves out `src/test-setup.ts`.
 */
export function angularTests({
  exclude = [],
  ...rest
}: Coverage): ViteUserConfig {
  return {
    plugins: [angular()],
    test: {
      ...angularSpecs(),
      coverage: coverage({
        ...rest,
        exclude: ["src/test-setup.ts", ...exclude],
      }),
    },
  };
}

/** Returns the config of a workspace whose specs run in Node. */
export function nodeTests(settings: Coverage): ViteUserConfig {
  return { test: { ...nodeSpecs(), coverage: coverage(settings) } };
}
