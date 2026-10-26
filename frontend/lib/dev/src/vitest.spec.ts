import type { Plugin } from "vite";
import {
  angularSpecs,
  angularTests,
  coverage,
  nodeSpecs,
  nodeTests,
} from "./vitest.ts";

/** Floors a suite would set. */
const THRESHOLDS = { statements: 90, branches: 80, functions: 90, lines: 90 };

/** Returns the names of the plugins a config adds. */
function pluginNames(plugins: unknown[] | undefined): string[] {
  return (plugins ?? [])
    .flat(Infinity)
    .map((plugin) => (plugin as Plugin).name);
}

describe("coverage", () => {
  it("measures every .ts file under src/ with V8, as text and HTML", () => {
    const settings = coverage({ thresholds: THRESHOLDS });

    expect(settings).toEqual({
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      thresholds: THRESHOLDS,
    });
  });

  it("leaves Vitest's exclusions alone when it is given none", () => {
    const settings = coverage({ thresholds: THRESHOLDS });

    expect(settings).not.toHaveProperty("exclude");
  });

  it("measures the files it is given, less the ones it leaves out", () => {
    const settings = coverage({
      include: ["src/**/*.ts", "tools/**/*.mjs"],
      exclude: ["src/main.ts"],
      thresholds: THRESHOLDS,
    });

    expect(settings).toMatchObject({
      include: ["src/**/*.ts", "tools/**/*.mjs"],
      exclude: ["src/main.ts"],
    });
  });
});

describe("angularSpecs", () => {
  it("runs every spec under src/ in jsdom, with globals, after the setup file", () => {
    const specs = angularSpecs();

    expect(specs).toEqual({
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test-setup.ts"],
      include: ["src/**/*.spec.ts"],
    });
  });
});

describe("nodeSpecs", () => {
  it("runs every spec under src/ in Node, with globals", () => {
    const specs = nodeSpecs();

    expect(specs).toEqual({
      globals: true,
      environment: "node",
      include: ["src/**/*.spec.ts"],
    });
  });

  it("runs the specs it is given", () => {
    const specs = nodeSpecs(["tools/**/*.spec.ts"]);

    expect(specs.include).toEqual(["tools/**/*.spec.ts"]);
  });
});

describe("angularTests", () => {
  it("compiles Angular with Analog's plugin", () => {
    const config = angularTests({ thresholds: THRESHOLDS });

    expect(pluginNames(config.plugins)).toContain(
      "@analogjs/vite-plugin-angular",
    );
  });

  it("runs the specs as angularSpecs says", () => {
    const config = angularTests({ thresholds: THRESHOLDS });

    expect(config.test).toMatchObject(angularSpecs());
  });

  it("leaves the setup file out of coverage, with the files it is given", () => {
    const config = angularTests({
      exclude: ["src/main.ts"],
      thresholds: THRESHOLDS,
    });

    expect(config.test?.coverage).toMatchObject({
      exclude: ["src/test-setup.ts", "src/main.ts"],
      thresholds: THRESHOLDS,
    });
  });
});

describe("nodeTests", () => {
  it("runs the specs in Node, held to its floors", () => {
    const config = nodeTests({ thresholds: THRESHOLDS });

    expect(config).toEqual({
      test: { ...nodeSpecs(), coverage: coverage({ thresholds: THRESHOLDS }) },
    });
  });
});
