// The Vite plugins an app that uses @fz/style adds to its config:
//
//     plugins: [angular(), fuzzleyStyle()]

import type { Plugin } from "vite";
import { themeBootstrapScript } from "./theme_script.ts";
import { DEFAULT_THEMES, THEMES, THEME_STORAGE_KEY } from "./themes.ts";

/** The file the page loads, before anything else, to pick its palette. */
export const THEME_SCRIPT = "theme.js";

/** Returns the plugins every app that uses @fz/style adds. */
export function fuzzleyStyle(): Plugin[] {
  return [themeBootstrap()];
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
  const script = themeBootstrapScript({
    ids: THEMES.map((theme) => theme.id),
    storageKey: THEME_STORAGE_KEY,
    defaults: DEFAULT_THEMES,
  });
  return {
    name: "fz-theme-bootstrap",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (path !== server.config.base + THEME_SCRIPT) {
          next();
          return;
        }
        res.setHeader("Content-Type", "text/javascript");
        res.end(script);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: THEME_SCRIPT, source: script });
    },
  };
}
