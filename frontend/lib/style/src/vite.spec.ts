import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { type Plugin, type Rolldown, build, createServer } from "vite";
import { fuzzballSvg } from "./fuzzball.ts";
import { fuzzballIco } from "./fuzzball_raster.ts";
import {
  DEFAULT_THEMES,
  PALETTE_ROLES,
  THEMES,
  THEME_STORAGE_KEY,
} from "./themes.ts";
import {
  FAVICON,
  FAVICON_ICO,
  THEME_SCRIPT,
  TOUCH_ICON,
  icons,
  paletteColors,
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

/** Describes what a dev server answered for a path. */
interface Answer {
  readonly type: string | null;
  readonly body: Buffer;
}

/** Returns what a dev server with a plugin answers for a path, under a base. */
async function served(
  root: string,
  plugin: Plugin,
  base: string,
  url: string,
): Promise<Answer> {
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
    return {
      type: response.headers.get("Content-Type"),
      body: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    await server.close();
  }
}

/** Returns a file a build with a plugin writes, by its name. */
async function built(
  root: string,
  plugin: Plugin,
  fileName: string,
): Promise<Buffer> {
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
  return Buffer.from(file?.source ?? "");
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

    expect(names).toBe("fz-theme-bootstrap,fz-icons");
  });
});

describe("themeBootstrap", () => {
  const app = useTemporaryApp();

  it("serves theme.js from the dev server", async () => {
    const { body } = await served(app.root, themeBootstrap(), "/", "/theme.js");

    expect(body.toString()).toContain(THEME_STORAGE_KEY);
  });

  it("serves it at the top of the app's own base", async () => {
    const { body } = await served(
      app.root,
      themeBootstrap(),
      "/play/solitaire/",
      "/play/solitaire/theme.js",
    );

    expect(body.toString()).toContain(THEME_STORAGE_KEY);
  });

  it("writes theme.js into the build", async () => {
    const file = await built(app.root, themeBootstrap(), THEME_SCRIPT);

    expect(file.toString()).toContain(THEME_STORAGE_KEY);
  });
});

describe("icons", () => {
  const app = useTemporaryApp();
  const colors = paletteColors();
  const accent = (theme: string): string =>
    colors.get(theme)?.get("accent") ?? "";

  /** Returns the fuzzball in the default palettes' accents. */
  function defaultFuzzball(): string {
    return fuzzballSvg({
      light: accent(DEFAULT_THEMES.light),
      dark: accent(DEFAULT_THEMES.dark),
    });
  }

  it("serves the fuzzball in the default palettes' accents", async () => {
    const { type, body } = await served(
      app.root,
      icons(),
      "/play/solitaire/",
      "/play/solitaire/favicon.svg",
    );

    expect([type, body.toString()]).toEqual([
      "image/svg+xml",
      defaultFuzzball(),
    ]);
  });

  it("writes favicon.svg into the build", async () => {
    const file = await built(app.root, icons(), FAVICON);

    expect(file.toString()).toBe(defaultFuzzball());
  });

  it("serves favicon.ico", async () => {
    const { type } = await served(app.root, icons(), "/", "/favicon.ico");

    expect(type).toBe("image/x-icon");
  });

  it("writes favicon.ico in the light default's accent", async () => {
    const file = await built(app.root, icons(), FAVICON_ICO);

    expect(file).toEqual(await fuzzballIco(accent(DEFAULT_THEMES.light)));
  });

  it("serves the home screen icon", async () => {
    const { type } = await served(
      app.root,
      icons(),
      "/",
      "/apple-touch-icon.png",
    );

    expect(type).toBe("image/png");
  });

  it("writes the home screen icon, 180 pixels square", async () => {
    const file = await built(app.root, icons(), TOUCH_ICON);

    const { width, height } = await sharp(file).metadata();

    expect([width, height]).toEqual([180, 180]);
  });

  it("fills the home screen icon to its corners, which iOS would blacken", async () => {
    const file = await built(app.root, icons(), TOUCH_ICON);

    const { isOpaque } = await sharp(file).stats();

    expect(isOpaque).toBe(true);
  });
});

describe("paletteColors", () => {
  it("reads every palette", () => {
    expect([...paletteColors().keys()]).toEqual(THEMES.map(({ id }) => id));
  });

  it("reads every role of a palette", () => {
    const roles = [...(paletteColors().get("classic")?.keys() ?? [])];

    expect(roles.sort()).toEqual([...PALETTE_ROLES].sort());
  });

  it("reads each color as the palette sets it", () => {
    expect(paletteColors().get("casino")?.get("accent")).toBe("#e0b13a");
  });
});
