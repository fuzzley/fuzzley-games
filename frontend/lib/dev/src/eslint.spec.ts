import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ESLint } from "eslint";
import type { Config } from "eslint/config";
import {
  angular,
  phaser,
  phaserGameLayers,
  scripts,
  templates,
  tests,
  typescript,
} from "./eslint.ts";

/** A tsconfig.json that takes in everything under src/. */
const TSCONFIG = JSON.stringify({
  compilerOptions: {
    strict: true,
    noEmit: true,
    module: "preserve",
    moduleResolution: "bundler",
    target: "ES2022",
  },
  include: ["src"],
});

/** The blocks a workspace whose code is all under src/ would use. */
function workspace(root: string): Config[] {
  return [
    ...typescript({ root, files: ["src/**/*.ts"] }),
    ...angular({ files: ["src/**/*.ts"], prefix: "fz" }),
    ...templates({ files: ["src/**/*.html"] }),
    ...tests({ files: ["src/**/*.spec.ts"] }),
    ...phaser({ files: ["src/scene/**/*.ts"] }),
    ...scripts({ files: ["tools/**/*.mjs"] }),
  ];
}

/** The rule each layer's fence is, which adds to the testing fence's. */
const FENCE = "@typescript-eslint/no-restricted-imports";

/** A guard on a value its type says is always there, as Phaser's are. */
const GUARDED =
  "declare const scene: { cameras: { main: object } };\n" +
  "export const shaken = scene.cameras?.main !== undefined;\n";

/**
 * Returns a module whose function switches over a side, left or right,
 * with the cases given, then the line after the switch, if any.
 */
function sideSwitch(cases: readonly string[], after?: string): string {
  return [
    'export function sign(side: "left" | "right"): number {',
    "  switch (side) {",
    ...cases.map((line) => `    ${line}`),
    "  }",
    ...(after ? [`  ${after}`] : []),
    "}",
    "",
  ].join("\n");
}

/**
 * Returns a template that switches over a side, with a case for the left,
 * then the blocks given.
 */
function leftSwitch(...blocks: string[]): string {
  return [
    "@switch (side) {",
    '  @case ("left") {',
    "    <p>Left</p>",
    "  }",
    ...blocks.map((block) => `  ${block}`),
    "}",
    "",
  ].join("\n");
}

/**
 * Writes files into a workspace of their own, lints them with
 * {@link workspace}'s blocks and the blocks given, or made from the
 * workspace's folder, and returns the rules each one breaks.
 */
async function lint(
  files: Readonly<Record<string, string>>,
  blocks: readonly Config[] | ((root: string) => readonly Config[]) = [],
): Promise<Record<string, string[]>> {
  const root = await mkdtemp(join(tmpdir(), "fz-dev-eslint-"));
  try {
    await writeFile(join(root, "tsconfig.json"), TSCONFIG);
    for (const [name, text] of Object.entries(files)) {
      await mkdir(dirname(join(root, name)), { recursive: true });
      await writeFile(join(root, name), text);
    }
    const given = typeof blocks === "function" ? blocks(root) : blocks;
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: [...workspace(root), ...given],
    });
    const results = await eslint.lintFiles(Object.keys(files));
    return Object.fromEntries(
      results.map((result) => [
        result.filePath.slice(root.length + 1).replaceAll("\\", "/"),
        result.messages.map((message) => message.ruleId ?? message.message),
      ]),
    );
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 10 });
  }
}

describe("typescript", () => {
  it("keeps a library's testing helpers out of what isn't a test", async () => {
    const problems = await lint({ "src/app.ts": 'import "@fz/ui/testing";\n' });

    expect(problems["src/app.ts"]).toContain("no-restricted-imports");
  });

  it("checks types, as in a template literal", async () => {
    const problems = await lint({
      "src/app.ts": "export const greeting = `Hi ${String(null)}${[1]}`;\n",
    });

    expect(problems["src/app.ts"]).toEqual([
      "@typescript-eslint/restrict-template-expressions",
    ]);
  });

  it("lets a template literal hold a number", async () => {
    const problems = await lint({
      "src/app.ts": "const lives = 3;\nexport const left = `${lives} left`;\n",
    });

    expect(problems["src/app.ts"]).toEqual([]);
  });

  it("holds a switch over a union to a case for every member", async () => {
    const problems = await lint({
      "src/app.ts": sideSwitch(['case "left":', "  return -1;"], "return 1;"),
    });

    expect(problems["src/app.ts"]).toEqual([
      "@typescript-eslint/switch-exhaustiveness-check",
    ]);
  });

  it("lets a switch's default stand for the members it doesn't name", async () => {
    const problems = await lint({
      "src/app.ts": sideSwitch([
        'case "left":',
        "  return -1;",
        "default:",
        "  return 1;",
      ]),
    });

    expect(problems["src/app.ts"]).toEqual([]);
  });
});

describe("tests", () => {
  it("lets a test use a library's testing helpers", async () => {
    const problems = await lint({
      "src/app.spec.ts": 'import "@fz/ui/testing";\n',
    });

    expect(problems["src/app.spec.ts"]).toEqual([]);
  });

  it("lets a test assert what it knows is there", async () => {
    const problems = await lint({
      "src/app.spec.ts":
        "const found = [1].find((n) => n === 1);\nexport const one = found!;\n",
    });

    expect(problems["src/app.spec.ts"]).toEqual([]);
  });
});

describe("phaser", () => {
  it("lets code that drives Phaser guard what Phaser's types say is there", async () => {
    const problems = await lint({ "src/scene/board.ts": GUARDED });

    expect(problems["src/scene/board.ts"]).toEqual([]);
  });

  it("holds other code to the rule", async () => {
    const problems = await lint({ "src/rules/board.ts": GUARDED });

    expect(problems["src/rules/board.ts"]).toContain(
      "@typescript-eslint/no-unnecessary-condition",
    );
  });
});

describe("angular", () => {
  it("holds a component's selector to the prefix", async () => {
    const problems = await lint({
      "src/thing.ts": [
        'import { Component } from "@angular/core";',
        '@Component({ selector: "app-thing", template: "" })',
        "export class ThingComponent {}",
        "",
      ].join("\n"),
    });

    expect(problems["src/thing.ts"]).toContain(
      "@angular-eslint/component-selector",
    );
  });
});

describe("templates", () => {
  it("asks a button what kind it is", async () => {
    const problems = await lint({
      "src/thing.html": "<button>Go</button>\n",
    });

    expect(problems["src/thing.html"]).toEqual([
      "@angular-eslint/template/button-has-type",
    ]);
  });

  it("asks a switch what it shows for the values it doesn't name", async () => {
    const problems = await lint({ "src/thing.html": leftSwitch() });

    expect(problems["src/thing.html"]).toEqual([
      "@angular-eslint/template/require-switch-default",
    ]);
  });

  it("takes `@default never;` as a switch's default", async () => {
    const problems = await lint({
      "src/thing.html": leftSwitch("@default never;"),
    });

    expect(problems["src/thing.html"]).toEqual([]);
  });
});

describe("scripts", () => {
  it("asks a function for the types of what it takes", async () => {
    const problems = await lint({
      "tools/run.mjs": "export function double(n) {\n  return n * 2;\n}\n",
    });

    expect(problems["tools/run.mjs"]).toContain("jsdoc/require-jsdoc");
  });

  it("takes a function whose JSDoc carries its types", async () => {
    const problems = await lint({
      "tools/run.mjs": [
        "/**",
        " * Returns a number twice over.",
        " *",
        " * @param {number} n",
        " * @returns {number}",
        " */",
        "export function double(n) {",
        "  return n * 2;",
        "}",
        "",
      ].join("\n"),
    });

    expect(problems["tools/run.mjs"]).toEqual([]);
  });
});

describe("phaserGameLayers", () => {
  it.each([
    ["src/rules/run.ts", "../view/paint"],
    ["src/rules/run.ts", "../testing/fields"],
    ["src/rules/run.ts", "@fz/phaser/shapes"],
    ["src/view/paint.ts", "../scene/belt"],
    ["src/scene/belt.ts", "../app/board"],
    ["src/scene/belt.ts", "@angular/core"],
    ["src/scene/belt.ts", "@fz/phaser/canvas"],
    ["src/scene/belt.ts", "@fz/ui/dialog"],
    ["src/app/board.ts", "phaser"],
    ["src/app/board.ts", "@fz/phaser/host"],
  ])("keeps %s off %s", async (file, imported) => {
    const problems = await lint(
      { [file]: `import "${imported}";\n` },
      phaserGameLayers(),
    );

    expect(problems[file]).toEqual([FENCE]);
  });

  it("lets the rules take @fz/core", async () => {
    const problems = await lint(
      { "src/rules/run.ts": 'import "@fz/core/math";\n' },
      phaserGameLayers(),
    );

    expect(problems["src/rules/run.ts"]).toEqual([]);
  });

  it("leaves a layer's specs free to import what the layer may not", async () => {
    const problems = await lint(
      { "src/rules/run.spec.ts": 'import "../view/paint";\n' },
      phaserGameLayers(),
    );

    expect(problems["src/rules/run.spec.ts"]).toEqual([]);
  });

  it("keeps Phaser and the frameworks out of the rules and the view", async () => {
    const problems = await lint(
      {
        "src/rules/run.ts": 'import "phaser";\n',
        "src/view/paint.ts": 'import "@angular/core";\n',
      },
      phaserGameLayers(),
    );

    expect(problems).toEqual({
      "src/rules/run.ts": [FENCE],
      "src/view/paint.ts": [FENCE],
    });
  });

  it("lets the view take @fz/core and @fz/phaser's pure entries", async () => {
    const problems = await lint(
      {
        "src/view/paint.ts":
          'import "@fz/core/math";\nimport "@fz/phaser/shapes";\n',
      },
      phaserGameLayers(),
    );

    expect(problems["src/view/paint.ts"]).toEqual([]);
  });

  it("keeps the view off every other library's entries and packages", async () => {
    const problems = await lint(
      {
        "src/view/paint.ts":
          'import "@fz/style/fuzzball";\nimport "@fz/phaser";\n',
      },
      phaserGameLayers(),
    );

    expect(problems["src/view/paint.ts"]).toEqual([FENCE, FENCE]);
  });

  it("lets the view take an entry the game allows, but not its package", async () => {
    const problems = await lint(
      {
        "src/view/paint.ts":
          'import "@fz/style/fuzzball";\nimport "@fz/style";\n',
      },
      phaserGameLayers({ viewAllows: ["@fz/style/fuzzball"] }),
    );

    expect(problems["src/view/paint.ts"]).toEqual([FENCE]);
  });

  it("refuses the rules and the view @fz/core's unseeded randomSeed()", async () => {
    const code =
      'import { randomSeed } from "@fz/core/random";\nexport { randomSeed };\n';

    const problems = await lint(
      { "src/rules/run.ts": code, "src/view/paint.ts": code },
      phaserGameLayers(),
    );

    expect(problems).toEqual({
      "src/rules/run.ts": [FENCE],
      "src/view/paint.ts": [FENCE],
    });
  });

  it.each(["@fz/style", "@fz/style/fuzzball/colors"])(
    "refuses to let the view take %s, which is no library's entry",
    (allowed) => {
      expect(() => phaserGameLayers({ viewAllows: [allowed] })).toThrow(
        `viewAllows takes only a library's entries, as @fz/<lib>/<entry>, which the view's fence can let in, not "${allowed}"`,
      );
    },
  );

  it("lets the shell take the scene by type alone", async () => {
    const problems = await lint(
      {
        "src/app/board.ts":
          'import type { Belt } from "../scene/belt";\nexport type Shown = Belt;\n',
        "src/app/shell.ts": 'import "../scene/belt";\n',
      },
      phaserGameLayers(),
    );

    expect(problems).toEqual({
      "src/app/board.ts": [],
      "src/app/shell.ts": [FENCE],
    });
  });

  it.each([
    ["Date.now()", "no-restricted-properties"],
    ["new Date()", "no-restricted-syntax"],
    ["performance.now()", "no-restricted-globals"],
    ["setTimeout(() => undefined, 1)", "no-restricted-globals"],
    ["Math.random()", "no-restricted-properties"],
    ["Math.imul(7, 9)", "no-restricted-properties"],
    ["window.innerWidth", "no-restricted-globals"],
    ["globalThis.innerWidth", "no-restricted-globals"],
    ['localStorage.getItem("run")', "no-restricted-globals"],
  ])("keeps the rules and the view off %s", async (read, rule) => {
    const code = `export const read = ${read};\n`;

    const problems = await lint(
      { "src/rules/run.ts": code, "src/view/paint.ts": code },
      phaserGameLayers(),
    );

    expect(problems).toEqual({
      "src/rules/run.ts": [rule],
      "src/view/paint.ts": [rule],
    });
  });

  it("lets the rules make a date from a time they are handed", async () => {
    const problems = await lint(
      {
        "src/rules/run.ts":
          "export const at = (time: number): Date => new Date(time);\n",
      },
      phaserGameLayers(),
    );

    expect(problems["src/rules/run.ts"]).toEqual([]);
  });

  it("leaves the specs, the scene and the shell the clock", async () => {
    const code = "export const now = Date.now();\n";

    const problems = await lint(
      {
        "src/rules/run.spec.ts": code,
        "src/scene/belt.ts": code,
        "src/app/board.ts": code,
      },
      phaserGameLayers(),
    );

    expect(problems).toEqual({
      "src/rules/run.spec.ts": [],
      "src/scene/belt.ts": [],
      "src/app/board.ts": [],
    });
  });

  it("holds the files a game names as the rules are", async () => {
    const problems = await lint(
      {
        "src/testing/autopilot.ts":
          'import "@angular/core";\nexport const now = Date.now();\n',
        "src/testing/fields.ts": 'import "@angular/core";\n',
      },
      (root) =>
        phaserGameLayers({
          heldAsRules: { root, files: ["src/testing/autopilot.ts"] },
        }),
    );

    expect(problems).toEqual({
      "src/testing/autopilot.ts": [FENCE, "no-restricted-properties"],
      "src/testing/fields.ts": [],
    });
  });

  it("lets a file held as the rules are import another held with it", async () => {
    const problems = await lint(
      {
        "src/testing/autopilot.ts":
          'import "./kept_run";\nimport "../rules/run";\n',
        "src/testing/kept_run.ts": "export const kept = 1;\n",
      },
      (root) =>
        phaserGameLayers({
          heldAsRules: {
            root,
            files: ["src/testing/autopilot.ts", "src/testing/kept_run.ts"],
          },
        }),
    );

    expect(problems["src/testing/autopilot.ts"]).toEqual([]);
  });

  it("refuses a file held as the rules are anything else beside it", async () => {
    const problems = await lint(
      {
        "src/testing/autopilot.ts":
          'import "./fields";\nimport "./kept_run/sub";\nimport "./sub/x";\nimport ".";\n',
        "src/testing/kept_run.ts": "export const kept = 1;\n",
      },
      (root) =>
        phaserGameLayers({
          heldAsRules: {
            root,
            files: ["src/testing/autopilot.ts", "src/testing/kept_run.ts"],
          },
        }),
    );

    expect(problems["src/testing/autopilot.ts"]).toEqual([
      FENCE,
      FENCE,
      FENCE,
      FENCE,
    ]);
  });

  it("reads a held file's name as it is written, not as a pattern", async () => {
    const problems = await lint(
      {
        "src/testing/autopilot.ts":
          'import "./kept.run";\nimport "./kept-run";\n',
        "src/testing/kept.run.ts": "export const kept = 1;\n",
      },
      (root) =>
        phaserGameLayers({
          heldAsRules: {
            root,
            files: ["src/testing/autopilot.ts", "src/testing/kept.run.ts"],
          },
        }),
    );

    expect(problems["src/testing/autopilot.ts"]).toEqual([FENCE]);
  });

  it.each([
    [
      "a glob",
      ["src/testing/*.ts"],
      'takes only files by their paths from the workspace\'s folder, as src/testing/autopilot.ts, never a glob, not "src/testing/*.ts"',
    ],
    [
      "a path from the root of the disk",
      ["/src/testing/autopilot.ts"],
      'takes only files by their paths from the workspace\'s folder, as src/testing/autopilot.ts, never a glob, not "/src/testing/autopilot.ts"',
    ],
    [
      "a path out of the workspace's folder",
      ["../src/testing/autopilot.ts"],
      'takes only files by their paths from the workspace\'s folder, as src/testing/autopilot.ts, never a glob, not "../src/testing/autopilot.ts"',
    ],
    [
      "a path written with backslashes",
      ["src\\testing\\autopilot.ts"],
      'takes only files by their paths from the workspace\'s folder, as src/testing/autopilot.ts, never a glob, not "src\\testing\\autopilot.ts"',
    ],
    [
      "a path that normalizes to another",
      ["./src/testing/autopilot.ts"],
      'takes only files by their paths from the workspace\'s folder, as src/testing/autopilot.ts, never a glob, not "./src/testing/autopilot.ts"',
    ],
    [
      "files of two folders",
      ["src/testing/autopilot.ts", "src/tools/report.ts"],
      'takes only files of one folder, which may import one another, not files of "src/testing" and "src/tools"',
    ],
    [
      "a file the workspace doesn't have",
      ["src/testing/autopilot.ts", "src/testing/gone.ts"],
      'names "src/testing/gone.ts", which the workspace doesn\'t have',
    ],
  ])("refuses to hold %s as the rules are", async (_, files, message) => {
    const held = lint(
      {
        "src/testing/autopilot.ts": "export const auto = 1;\n",
        "src/tools/report.ts": "export const report = 1;\n",
      },
      (root) => phaserGameLayers({ heldAsRules: { root, files } }),
    );

    await expect(held).rejects.toThrow(
      `phaserGameLayers()'s heldAsRules ${message}`,
    );
  });
});
