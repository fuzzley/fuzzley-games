import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { type Plugin, normalizePath } from "vite";
import type {
  TestProjectInlineConfiguration,
  ViteUserConfig,
} from "vitest/config";
import {
  type CacheKeyIdGeneratorContext,
  type Vitest,
  type VitestPluginContext,
  createVitest,
} from "vitest/node";
import {
  type Projects,
  angularSpecs,
  angularTests,
  coverage,
  nodeSpecs,
  nodeTests,
} from "./vitest.ts";

/** Floors a suite would set. */
const THRESHOLDS = { statements: 90, branches: 80, functions: 90, lines: 90 };

/** The folder a game's specs are placed from. */
const ROOT = "/games/breaker";

/** How a game splits its specs into projects. */
const PROJECTS: Projects = {
  root: ROOT,
  pure: ["src/rules", "src/testing", "tools"],
  domSpecs: ["board.spec.ts"],
  sim: ["src/rules/every_level"],
};

/** Returns the names of the plugins a config adds. */
function pluginNames(plugins: unknown[] | undefined): string[] {
  return (plugins ?? [])
    .flat(Infinity)
    .map((plugin) => (plugin as Plugin).name);
}

/** Returns the plugin a project adds by its name. */
function pluginOf(
  project: TestProjectInlineConfiguration | undefined,
  name: string,
): Plugin {
  const plugins: unknown[] = project?.plugins ?? [];
  const plugin = plugins
    .flat(Infinity)
    .find(
      (each): each is Plugin =>
        typeof each === "object" &&
        each !== null &&
        "name" in each &&
        each.name === name,
    );
  if (plugin === undefined) {
    throw new Error(`The project adds no plugin named ${name}.`);
  }
  return plugin;
}

/**
 * Returns what a project's Analog plugin makes of a decorated class at a
 * path, and what it warns of, outside any program it has compiled.
 */
async function analogCompiled(
  project: TestProjectInlineConfiguration | undefined,
  id: string,
): Promise<{ compiled: unknown; warnings: string[] }> {
  const hook = pluginOf(project, "@analogjs/vite-plugin-angular").transform;
  const handler = typeof hook === "function" ? hook : hook?.handler;
  if (handler === undefined) {
    throw new Error("Analog's plugin compiles nothing.");
  }
  const warnings: string[] = [];
  const compiled: unknown = await Reflect.apply(
    handler,
    { warn: (message: string) => warnings.push(message) },
    ["@Component({})\nexport class Board {}\n", id],
  );
  return { compiled, warnings };
}

/** Returns the key a project's `keyed-by` plugin gives Vitest's module cache. */
function cacheKeyOf(
  project: TestProjectInlineConfiguration | undefined,
): ReturnType<Parameters<VitestPluginContext["defineCacheKeyGenerator"]>[0]> {
  const configure = pluginOf(project, "keyed-by").configureVitest;
  let key: ReturnType<typeof cacheKeyOf> = undefined;
  const file: Pick<CacheKeyIdGeneratorContext, "id" | "sourceCode"> = {
    id: `${ROOT}/src/rules/field.ts`,
    sourceCode: "",
  };
  const context: Pick<VitestPluginContext, "defineCacheKeyGenerator"> = {
    defineCacheKeyGenerator: (generate) => {
      // The generator reads nothing of the file it keys.
      key = generate(file as CacheKeyIdGeneratorContext);
    },
  };
  // The hook reads nothing of its context but where to define the generator.
  configure?.(context as VitestPluginContext);
  return key;
}

/** Returns the projects a config declares inline, by name. */
function projectsOf(
  config: ViteUserConfig,
): Map<string, TestProjectInlineConfiguration> {
  const inline = (config.test?.projects ?? []).filter(
    (project): project is TestProjectInlineConfiguration =>
      typeof project === "object" && "test" in project,
  );
  return new Map(
    inline.map((project) => {
      const name = project.test?.name;
      return [typeof name === "string" ? name : "", project];
    }),
  );
}

/** Returns the code a project leaves to oxc, which it names by a pattern. */
function oxcCodeOf(
  project: TestProjectInlineConfiguration | undefined,
): RegExp {
  const include = project?.oxc === false ? undefined : project?.oxc?.include;
  if (!(include instanceof RegExp)) {
    throw new Error("The project names no pattern of code for oxc.");
  }
  return include;
}

/** Writes files into a folder of their own, hands it to `use` and removes it. */
async function inFolder<T>(
  files: readonly string[],
  use: (root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "fz-dev-projects-"));
  try {
    for (const file of files) {
      await written(root, file, "");
    }
    return await use(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Writes a file under a folder, with the folders it sits in. */
async function written(
  root: string,
  file: string,
  text: string,
): Promise<void> {
  await mkdir(dirname(join(root, file)), { recursive: true });
  await writeFile(join(root, file), text);
}

/**
 * Starts Vitest, given the projects, on a folder of its own holding the
 * files, hands it to `use` and closes it.
 */
async function withVitest<T>(
  files: readonly string[],
  projects: Omit<Projects, "root">,
  use: (vitest: Vitest, root: string) => T | Promise<T>,
): Promise<T> {
  return inFolder(files, async (root) => {
    const config = angularTests({
      thresholds: THRESHOLDS,
      projects: { ...projects, root },
    });
    const vitest = await createVitest(
      { config: false, root, watch: false },
      { ...config, logLevel: "silent" },
    );
    try {
      return await use(vitest, root);
    } finally {
      await vitest.close();
    }
  });
}

/**
 * Returns the projects each spec runs in, by its path, as Vitest places the
 * files, so a spec run twice, or in none, shows.
 */
async function placed(
  files: readonly string[],
  projects: Omit<Projects, "root">,
): Promise<Record<string, string[]>> {
  return withVitest(files, projects, async (vitest, root) => {
    const specs = await vitest.globTestSpecifications();
    const placements: Record<string, string[]> = {};
    for (const spec of specs) {
      const path = normalizePath(relative(root, spec.moduleId));
      placements[path] = [...(placements[path] ?? []), spec.project.name];
    }
    return placements;
  });
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

    expect(specs).toMatchObject({
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test-setup.ts"],
      include: ["src/**/*.spec.ts"],
    });
  });

  it("runs them in the pool Analog's plugin sets, which a project sharing its config's server would miss", () => {
    const specs = angularSpecs();

    expect(specs.pool).toBe("vmThreads");
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

describe("angularTests, given projects", () => {
  it("measures the projects together, with no plugin of its own", () => {
    const config = angularTests({
      exclude: ["src/main.ts"],
      thresholds: THRESHOLDS,
      projects: PROJECTS,
    });

    expect(config).toMatchObject({
      test: {
        coverage: coverage({
          exclude: ["src/test-setup.ts", "src/main.ts"],
          thresholds: THRESHOLDS,
        }),
      },
    });
    expect(config.plugins).toBeUndefined();
  });

  it("compiles Angular with Analog's plugin in dom alone", () => {
    const projects = projectsOf(
      angularTests({ thresholds: THRESHOLDS, projects: PROJECTS }),
    );

    expect(
      [...projects].map(([name, project]) => [
        name,
        pluginNames(project.plugins).includes("@analogjs/vite-plugin-angular"),
      ]),
    ).toEqual([
      ["dom", true],
      ["pure", false],
      ["sim", false],
    ]);
  });

  it("declares each project apart from the config, so none inherits another's plugins or setup", () => {
    const projects = projectsOf(
      angularTests({ thresholds: THRESHOLDS, projects: PROJECTS }),
    );

    expect([...projects.values()].map((project) => project.extends)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("runs dom in jsdom after the setup, and pure and sim in Node", () => {
    const projects = projectsOf(
      angularTests({ thresholds: THRESHOLDS, projects: PROJECTS }),
    );

    expect(
      [...projects.values()].map((project) => project.test?.environment),
    ).toEqual(["jsdom", "node", "node"]);
  });

  it("declares no sim for a workspace with no simulations", () => {
    const projects = projectsOf(
      angularTests({
        thresholds: THRESHOLDS,
        projects: { root: ROOT, pure: ["src/rules"] },
      }),
    );

    expect([...projects.keys()]).toEqual(["dom", "pure"]);
  });

  it("leaves to oxc in dom the code of pure's folders, but not their specs or any other code", () => {
    const shared = oxcCodeOf(
      projectsOf(
        angularTests({ thresholds: THRESHOLDS, projects: PROJECTS }),
      ).get("dom"),
    );

    expect(
      [
        `${ROOT}/src/rules/field.ts`,
        `${ROOT}/src/testing/picture.ts`,
        `${ROOT}/src/rules/field.spec.ts`,
        `${ROOT}/src/app/board.component.ts`,
        `${ROOT}/src/rulesets/field.ts`,
        "/games/other/src/rules/field.ts",
      ].map((id) => shared.test(id)),
    ).toEqual([true, true, false, false, false, false]);
  });

  it("has Analog's plugin in dom pass by the code it leaves to oxc, without a look", async () => {
    const dom = projectsOf(
      angularTests({ thresholds: THRESHOLDS, projects: PROJECTS }),
    ).get("dom");

    const passed = await analogCompiled(dom, `${ROOT}/src/rules/field.ts`);
    const looked = await analogCompiled(dom, `${ROOT}/src/app/board.ts`);

    expect(passed).toEqual({ compiled: undefined, warnings: [] });
    expect(looked.warnings).toHaveLength(1);
  });

  it("keys dom's cached modules by the code it leaves to oxc", () => {
    const keys = [PROJECTS, { ...PROJECTS, pure: ["src/rules"] }].map(
      (projects) =>
        cacheKeyOf(
          projectsOf(angularTests({ thresholds: THRESHOLDS, projects })).get(
            "dom",
          ),
        ),
    );

    expect(keys[0]).toEqual(expect.any(String));
    expect(keys[0]).not.toEqual(keys[1]);
  });

  it("keys dom's cached modules by the workspace's tsconfig.json and tsconfig.spec.json", async () => {
    const keys = await inFolder([], async (root) => {
      const keyNow = (): unknown =>
        cacheKeyOf(
          projectsOf(
            angularTests({
              thresholds: THRESHOLDS,
              projects: { ...PROJECTS, root },
            }),
          ).get("dom"),
        );
      const before = keyNow();
      await written(root, "tsconfig.json", '{ "files": [] }');
      const withConfig = keyNow();
      await written(root, "tsconfig.spec.json", '{ "include": [] }');
      return [before, withConfig, keyNow()];
    });

    expect(new Set(keys).size).toBe(3);
  });

  it("hands dom's server each file added to or removed from the config's, which Vitest watches through", async () => {
    const seen = await withVitest([], PROJECTS, (vitest) => {
      const events: string[][] = [];
      const dom = vitest.projects.find((project) => project.name === "dom");
      dom?.vite.watcher.on("add", (file: string) => events.push(["add", file]));
      dom?.vite.watcher.on("unlink", (file: string) =>
        events.push(["unlink", file]),
      );

      vitest.vite.watcher.emit("add", "src/app/new.component.ts");
      vitest.vite.watcher.emit("unlink", "src/app/old.component.ts");
      return events;
    });

    expect(seen).toEqual([
      ["add", "src/app/new.component.ts"],
      ["unlink", "src/app/old.component.ts"],
    ]);
  });

  it("runs each spec once: those of pure's folders in pure, the simulations in sim and every other in dom", async () => {
    const projects = await placed(
      [
        "src/app/app.component.spec.ts",
        "src/scene/scene.spec.ts",
        "src/rules/field.spec.ts",
        "src/rules/every_level/fast.spec.ts",
        "src/testing/picture.spec.ts",
        "tools/report.spec.ts",
      ],
      PROJECTS,
    );

    expect(projects).toEqual({
      "src/app/app.component.spec.ts": ["dom"],
      "src/scene/scene.spec.ts": ["dom"],
      "src/rules/field.spec.ts": ["pure"],
      "src/rules/every_level/fast.spec.ts": ["sim"],
      "src/testing/picture.spec.ts": ["pure"],
      "tools/report.spec.ts": ["pure"],
    });
  });

  it("runs a spec of pure's folders named in domSpecs in dom, but not one whose name only begins with it", async () => {
    const projects = await placed(
      [
        "src/testing/board.spec.ts",
        "src/testing/board_frames.spec.ts",
        "src/rules/board.spec.ts",
        "tools/board.spec.ts",
      ],
      PROJECTS,
    );

    expect(projects).toEqual({
      "src/testing/board.spec.ts": ["dom"],
      "src/testing/board_frames.spec.ts": ["pure"],
      "src/rules/board.spec.ts": ["dom"],
      "tools/board.spec.ts": ["dom"],
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
