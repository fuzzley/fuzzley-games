import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type Rolldown, build, createServer } from "vite";
import { THEME_STORAGE_KEY } from "./themes.ts";
import { THEME_SCRIPT, themeBootstrap } from "./vite.ts";

describe("fuzzleyStyle", () => {
  it("loads in Node as it is, as an app's Vite config loads it", () => {
    const plugin = new URL("vite.ts", import.meta.url).href;
    const script = `const { fuzzleyStyle } = await import(${JSON.stringify(plugin)});
      process.stdout.write(fuzzleyStyle().map((p) => p.name).join());`;

    const names = execFileSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { encoding: "utf8" },
    );

    expect(names).toBe("fz-theme-bootstrap");
  });
});

describe("themeBootstrap", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "fz-style-"));
    writeFileSync(
      path.join(root, "index.html"),
      "<!doctype html><html></html>",
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /** Returns what the dev server answers for a path, under the given base. */
  async function served(base: string, url: string): Promise<string> {
    const server = await createServer({
      root,
      base,
      configFile: false,
      logLevel: "silent",
      plugins: [themeBootstrap()],
      server: { port: 0, watch: null, hmr: false },
    });
    try {
      await server.listen();
      const origin = server.resolvedUrls?.local[0] ?? "";
      const response = await fetch(new URL(url, origin));
      return await response.text();
    } finally {
      await server.close();
    }
  }

  it("serves theme.js from the dev server", async () => {
    expect(await served("/", "/theme.js")).toContain(THEME_STORAGE_KEY);
  });

  it("serves it at the top of the app's own base", async () => {
    expect(
      await served("/play/solitaire/", "/play/solitaire/theme.js"),
    ).toContain(THEME_STORAGE_KEY);
  });

  it("writes theme.js into the build", async () => {
    const output = (await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [themeBootstrap()],
      build: { write: false },
    })) as Rolldown.RolldownOutput;

    const script = output.output
      .filter((file) => file.type === "asset")
      .find((file) => file.fileName === THEME_SCRIPT);
    expect(String(script?.source)).toContain(THEME_STORAGE_KEY);
  });
});
