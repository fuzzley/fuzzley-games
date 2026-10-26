// The Vite plugins an app that uses @fz/style adds to its config:
//
//     plugins: [angular(), fuzzleyStyle()]

import { fileURLToPath } from "node:url";
import { compileString } from "sass";
import type { Plugin } from "vite";
import { fuzzballSvg } from "../fuzzball.ts";
import { fuzzballIco, fuzzballPng } from "./fuzzball_raster.ts";
import { themeBootstrapScript } from "./theme_script.ts";
import { DEFAULT_THEMES, THEMES, THEME_STORAGE_KEY } from "../themes.ts";

/** The file the page loads, before anything else, to pick its palette. */
export const THEME_SCRIPT = "theme.js";

/** The tab's icon, which the page links beside theme.js. */
export const FAVICON = "favicon.svg";

/** The tab's icon for a browser that draws no SVG icon. */
export const FAVICON_ICO = "favicon.ico";

/** The icon a phone puts on its home screen for the page. */
export const TOUCH_ICON = "apple-touch-icon.png";

/** How many pixels across the home screen icon is, as iOS asks. */
const TOUCH_ICON_SIZE = 180;

/** Returns the plugins every app that uses @fz/style adds. */
export function fuzzleyStyle(): Plugin[] {
  return [themeBootstrap(), icons()];
}

/**
 * Serves theme.js from the dev server and writes it into the build, at the
 * top of the app's own base, made from the palettes in themes.ts.
 *
 * The page loads it with a plain tag, first in its head, which Vite leaves
 * alone: `<script src="theme.js" vite-ignore></script>`, or `/theme.js` for
 * an app at the root of the site.
 */
export function themeBootstrap(): Plugin {
  return generatedFiles("fz-theme-bootstrap", [
    {
      fileName: THEME_SCRIPT,
      contentType: "text/javascript",
      make: () =>
        themeBootstrapScript({
          ids: THEMES.map((theme) => theme.id),
          storageKey: THEME_STORAGE_KEY,
          defaults: DEFAULT_THEMES,
        }),
    },
  ]);
}

/**
 * Serves the page's icons from the dev server and writes them into the
 * build, beside theme.js: favicon.svg, the fuzzball in the accent of the
 * default palette for each system color scheme, which ThemeService recolors
 * to the palette in use once the app starts; and, for what shows no SVG,
 * favicon.ico and apple-touch-icon.png, in the light default's accent.
 *
 * The page links them as it loads theme.js, each with `vite-ignore`, the SVG
 * after the ICO so that a browser that draws both picks it.
 */
export function icons(): Plugin {
  let colors: ReadonlyMap<string, ReadonlyMap<string, string>> | undefined;
  const color = (theme: string, role: string): string =>
    (colors ??= paletteColors()).get(theme)?.get(role) ?? "";
  const { light, dark } = DEFAULT_THEMES;
  return generatedFiles("fz-icons", [
    {
      fileName: FAVICON,
      contentType: "image/svg+xml",
      make: () =>
        fuzzballSvg({
          light: color(light, "accent"),
          dark: color(dark, "accent"),
        }),
    },
    {
      fileName: FAVICON_ICO,
      contentType: "image/x-icon",
      make: () => fuzzballIco(color(light, "accent")),
    },
    {
      fileName: TOUCH_ICON,
      contentType: "image/png",
      // iOS fills what is transparent with black, and rounds the corners
      // into the edge of the image, so the fuzzball sits inset on the page.
      make: () =>
        fuzzballPng(color(light, "accent"), TOUCH_ICON_SIZE, {
          background: color(light, "page"),
          scale: 0.7,
        }),
    },
  ]);
}

/** Returns each palette's roles' colors, by the palette's id, from its Sass. */
export function paletteColors(): ReadonlyMap<
  string,
  ReadonlyMap<string, string>
> {
  const tokens = fileURLToPath(new URL("../tokens/", import.meta.url));
  const { css } = compileString('@use "palettes";', { loadPaths: [tokens] });
  return new Map(
    [...css.matchAll(/\[data-theme=["']?([\w-]+)["']?\]\s*\{([^}]*)\}/g)].map(
      ([, id = "", rules = ""]) => [
        id,
        new Map(
          [...rules.matchAll(/--fz-([\w-]+):\s*([^;]+);/g)].map(
            ([, role = "", value = ""]) => [role, value.trim()],
          ),
        ),
      ],
    ),
  );
}

/** Describes a file a plugin serves and builds. */
interface GeneratedFile {
  readonly fileName: string;
  readonly contentType: string;
  readonly make: () => string | Uint8Array | Promise<Uint8Array>;
}

/**
 * Returns a plugin that serves files from the dev server and writes them into
 * the build, at the top of the app's own base. It makes each file the first
 * time either asks for it.
 */
function generatedFiles(name: string, files: readonly GeneratedFile[]): Plugin {
  const made = new Map<GeneratedFile, Promise<string | Uint8Array>>();
  const source = (file: GeneratedFile): Promise<string | Uint8Array> => {
    let pending = made.get(file);
    if (!pending) {
      pending = Promise.resolve(file.make());
      made.set(file, pending);
    }
    return pending;
  };
  return {
    name,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const file = files.find(
          ({ fileName }) => path === server.config.base + fileName,
        );
        if (!file) {
          next();
          return;
        }
        source(file).then(
          (body) => {
            res.setHeader("Content-Type", file.contentType);
            res.end(body);
          },
          (error: unknown) => {
            next(error);
          },
        );
      });
    },
    async generateBundle() {
      for (const file of files) {
        this.emitFile({
          type: "asset",
          fileName: file.fileName,
          source: await source(file),
        });
      }
    },
  };
}
