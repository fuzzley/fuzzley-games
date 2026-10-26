// The Vite plugins an app that uses @fz/style adds to its config:
//
//     plugins: [angular(), fuzzleyStyle()]

import { fileURLToPath } from "node:url";
import { compileString } from "sass";
import type { Plugin } from "vite";
import { fuzzballSvg } from "./fuzzball.ts";
import { themeBootstrapScript } from "./theme_script.ts";
import { DEFAULT_THEMES, THEMES, THEME_STORAGE_KEY } from "./themes.ts";

/** The file the page loads, before anything else, to pick its palette. */
export const THEME_SCRIPT = "theme.js";

/** The tab's icon, which the page links beside theme.js. */
export const FAVICON = "favicon.svg";

/** Returns the plugins every app that uses @fz/style adds. */
export function fuzzleyStyle(): Plugin[] {
  return [themeBootstrap(), favicon()];
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
  return generatedFile(
    "fz-theme-bootstrap",
    THEME_SCRIPT,
    "text/javascript",
    () =>
      themeBootstrapScript({
        ids: THEMES.map((theme) => theme.id),
        storageKey: THEME_STORAGE_KEY,
        defaults: DEFAULT_THEMES,
      }),
  );
}

/**
 * Serves favicon.svg from the dev server and writes it into the build, beside
 * theme.js: the fuzzball in the accent of the default palette for each system
 * color scheme. ThemeService recolors it to the palette in use once the app
 * starts.
 *
 * The page links it as it loads theme.js:
 * `<link rel="icon" type="image/svg+xml" href="favicon.svg" vite-ignore />`.
 */
export function favicon(): Plugin {
  return generatedFile("fz-favicon", FAVICON, "image/svg+xml", () => {
    const accents = paletteAccents();
    return fuzzballSvg({
      light: accents.get(DEFAULT_THEMES.light) ?? "",
      dark: accents.get(DEFAULT_THEMES.dark) ?? "",
    });
  });
}

/** Returns each palette's accent, by the palette's id, from its Sass. */
export function paletteAccents(): ReadonlyMap<string, string> {
  const tokens = fileURLToPath(new URL("tokens/", import.meta.url));
  const { css } = compileString('@use "palettes";', { loadPaths: [tokens] });
  return new Map(
    [
      ...css.matchAll(
        /\[data-theme=["']?([\w-]+)["']?\]\s*\{[^}]*?--fz-accent:\s*([^;]+);/g,
      ),
    ].map(([, id = "", accent = ""]) => [id, accent.trim()]),
  );
}

/**
 * Returns a plugin that serves a file from the dev server and writes it into
 * the build, at the top of the app's own base. It makes the file the first
 * time either asks for it.
 */
function generatedFile(
  name: string,
  fileName: string,
  contentType: string,
  make: () => string,
): Plugin {
  let made: string | undefined;
  const source = (): string => (made ??= make());
  return {
    name,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (path !== server.config.base + fileName) {
          next();
          return;
        }
        res.setHeader("Content-Type", contentType);
        res.end(source());
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName, source: source() });
    },
  };
}
