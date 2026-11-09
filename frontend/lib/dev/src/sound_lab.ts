// The sound lab's page, which only a game's dev server serves: a game's
// vite.config.ts adds soundLab() with the module that mounts its lab
// (`@fz/dev/sound-lab-page`'s mountSoundLab()), and the server answers
// sound-lab/ under its base with a page that loads it. The plugin applies
// only to the dev server, so no build holds the page.

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/** The folder of this library's modules, the page's among them. */
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The page's own modules here, by their names. */
const PAGE_MODULES = [
  "sound_lab_page.ts",
  "sound_lab_mix.ts",
  "sound_lab_notes.ts",
  "zzfx.ts",
];

/** The page's path under the dev server's base. */
export const SOUND_LAB_PATH = "sound-lab/";

/** Describes a game's sound lab. */
export interface SoundLabPage {
  /** The module that mounts the lab, by its path from the game's folder, such as `tools/sound-lab.ts`. */
  readonly entry: string;
  /** The page's title. */
  readonly title: string;
}

/** Returns text with the characters HTML reads as markup written as entities. */
function escaped(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Returns the page's HTML, before the dev server transforms it: the palette
 * the player chose, from theme.js at the top of the base, as a game's own
 * page loads it, and the lab's module.
 */
export function soundLabHtml({ entry, title }: SoundLabPage): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>${escaped(title)}</title>
    <script src="../theme.js" vite-ignore></script>
  </head>
  <body>
    <script type="module" src="/${escaped(entry)}"></script>
  </body>
</html>
`;
}

/** Returns a path with forward slashes, as Vite names a module. */
function forwardSlashed(file: string): string {
  return file.replaceAll("\\", "/");
}

/**
 * Returns what matches the page's modules, a game's entry under its folder
 * and this library's own, by the paths Vite names them by.
 */
export function pageModules(root: string, entry: string): RegExp {
  const files = [
    path.resolve(root, entry),
    ...PAGE_MODULES.map((name) => path.join(HERE, name)),
  ].map((file) => forwardSlashed(file).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^(?:${files.join("|")})$`);
}

/**
 * Returns the plugin that has a game's dev server serve its sound lab at
 * `sound-lab/` under its base, and the path without its slash moved there,
 * so the page's relative addresses resolve. It applies to the dev server
 * alone.
 *
 * Analog's plugin turns Vite's own TypeScript compiler off unless the config
 * sets it, and compiles only what the app's program holds, which the page's
 * modules are not, so this has Vite's compile them, and nothing else.
 */
export function soundLab(page: SoundLabPage): Plugin {
  return {
    name: "fz-sound-lab",
    apply: "serve",
    config(config) {
      const root = path.resolve(config.root ?? process.cwd());
      return { oxc: { include: pageModules(root, page.entry) } };
    },
    configureServer(server) {
      const at = `${server.config.base}${SOUND_LAB_PATH}`;
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path === at.slice(0, -1)) {
          res.statusCode = 301;
          res.setHeader("Location", at);
          res.end();
          return;
        }
        if (path !== at) {
          next();
          return;
        }
        // The server's own pages are transformed by their path from its base.
        const url = `/${SOUND_LAB_PATH}`;
        server.transformIndexHtml(url, soundLabHtml(page)).then((html) => {
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        }, next);
      });
    },
  };
}
