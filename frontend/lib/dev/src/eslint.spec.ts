import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ESLint } from "eslint";
import type { Config } from "eslint/config";
import {
  angular,
  phaser,
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
 * {@link workspace}'s blocks, and returns the rules each one breaks.
 */
async function lint(
  files: Readonly<Record<string, string>>,
): Promise<Record<string, string[]>> {
  const root = await mkdtemp(join(tmpdir(), "fz-dev-eslint-"));
  try {
    await writeFile(join(root, "tsconfig.json"), TSCONFIG);
    for (const [name, text] of Object.entries(files)) {
      await mkdir(dirname(join(root, name)), { recursive: true });
      await writeFile(join(root, name), text);
    }
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: workspace(root),
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
