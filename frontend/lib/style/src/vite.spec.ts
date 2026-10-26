import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type Plugin, type Rolldown, build, createServer } from "vite";
import { fuzzballSvg } from "./fuzzball.ts";
import { DEFAULT_THEMES, THEMES, THEME_STORAGE_KEY } from "./themes.ts";
import {
  FAVICON,
  THEME_SCRIPT,
  favicon,
  paletteAccents,
  themeBootstrap,
} from "./vite.ts";

/** Holds a temporary app folder with an empty index.html, for each spec. */
function useTemporaryApp(): { readonly root: string } {
  const app = { root: "" };
  beforeEach(() => {
    app.root = mkdtempSync(path.join(tmpdir(), "fz-style-"));
    writeFileSync(
      path.join(app.root, "index.html"),
      "<!doctype html><html></html>",
    );
  });
  afterEach(() => {
    rmSync(app.root, { recursive: true, force: true });
  });
  return app;
}

/** Returns what a dev server with a plugin answers for a path, under a base. */
async function served(
  root: string,
  plugin: Plugin,
  base: string,
  url: string,
): Promise<string> {
  const server = await createServer({
    root,
    base,
    configFile: false,
    logLevel: "silent",
    plugins: [plugin],
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

/** Returns a file a build with a plugin writes, by its name. */
async function built(
  root: string,
  plugin: Plugin,
  fileName: string,
): Promise<string> {
  const output = (await build({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [plugin],
    build: { write: false },
  })) as Rolldown.RolldownOutput;

  const file = output.output
    .filter((chunk) => chunk.type === "asset")
    .find((chunk) => chunk.fileName === fileName);
  return String(file?.source);
}

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

    expect(names).toBe("fz-theme-bootstrap,fz-favicon");
  });
});

describe("themeBootstrap", () => {
  const app = useTemporaryApp();

  it("serves theme.js from the dev server", async () => {
    expect(
      await served(app.root, themeBootstrap(), "/", "/theme.js"),
    ).toContain(THEME_STORAGE_KEY);
  });

  it("serves it at the top of the app's own base", async () => {
    expect(
      await served(
        app.root,
        themeBootstrap(),
        "/play/solitaire/",
        "/play/solitaire/theme.js",
      ),
    ).toContain(THEME_STORAGE_KEY);
  });

  it("writes theme.js into the build", async () => {
    expect(await built(app.root, themeBootstrap(), THEME_SCRIPT)).toContain(
      THEME_STORAGE_KEY,
    );
  });
});

describe("favicon", () => {
  const app = useTemporaryApp();

  /** Returns the fuzzball in the default palettes' accents. */
  function defaultFuzzball(): string {
    const accents = paletteAccents();
    return fuzzballSvg({
      light: accents.get(DEFAULT_THEMES.light) ?? "",
      dark: accents.get(DEFAULT_THEMES.dark) ?? "",
    });
  }

  it("serves the fuzzball in the default palettes' accents", async () => {
    expect(
      await served(
        app.root,
        favicon(),
        "/play/solitaire/",
        "/play/solitaire/favicon.svg",
      ),
    ).toBe(defaultFuzzball());
  });

  it("writes favicon.svg into the build", async () => {
    expect(await built(app.root, favicon(), FAVICON)).toBe(defaultFuzzball());
  });
});

describe("paletteAccents", () => {
  it("reads every palette's accent", () => {
    expect([...paletteAccents().keys()]).toEqual(THEMES.map(({ id }) => id));
  });

  it("reads each accent as the palette sets it", () => {
    expect(paletteAccents().get("casino")).toBe("#e0b13a");
  });
});
