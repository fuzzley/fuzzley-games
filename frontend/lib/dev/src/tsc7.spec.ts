import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runTsc7, tsc7Script } from "./tsc7.ts";

/** The `tsc7` binary, as a workspace's `typecheck` runs it. */
const BINARY = fileURLToPath(new URL("../bin/tsc7.mjs", import.meta.url));

/** A folder made for a spec, removed after it. */
let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "fz-tsc7-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

/** Writes a project of one file, which `tsc -p` checks with no emit. */
async function writeProject(folder: string, source: string): Promise<void> {
  await writeFile(
    join(folder, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { noEmit: true, strict: true, types: [] },
      files: ["main.ts"],
    }),
  );
  await writeFile(join(folder, "main.ts"), source);
}

describe("tsc7Script", () => {
  it("is TypeScript 7's tsc", () => {
    const { stdout } = spawnSync(
      process.execPath,
      [tsc7Script(), "--version"],
      { encoding: "utf8" },
    );

    expect(stdout).toMatch(/^Version 7\./);
  });
});

describe("runTsc7", () => {
  it("exits with 0 for a project that type-checks", async () => {
    await writeProject(folder, "export const n: number = 1;\n");

    expect(
      runTsc7(["-p", "tsconfig.json"], { cwd: folder, stdio: "ignore" }),
    ).toBe(0);
  });

  it("exits with tsc's code for a project that doesn't", async () => {
    await writeProject(folder, 'export const n: number = "one";\n');

    expect(
      runTsc7(["-p", "tsconfig.json"], { cwd: folder, stdio: "ignore" }),
    ).toBe(1);
  });

  it("throws where it can't start, as from a folder that isn't there", () => {
    expect(() =>
      runTsc7(["--version"], { cwd: join(folder, "nowhere"), stdio: "ignore" }),
    ).toThrow(/ENOENT/);
  });
});

describe("the tsc7 binary", () => {
  it.each([
    ["0 for a project that type-checks", "export const n: number = 1;\n", 0],
    [
      "tsc's code for a project that doesn't",
      'export const n: number = "one";\n',
      1,
    ],
  ])("exits with %s", async (_, source, code) => {
    await writeProject(folder, source);

    const { status } = spawnSync(
      process.execPath,
      [BINARY, "-p", "tsconfig.json"],
      { cwd: folder, stdio: "ignore" },
    );

    expect(status).toBe(code);
  });
});
