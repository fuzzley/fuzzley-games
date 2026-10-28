// The Vite config every game built here shares, which its vite.config.ts
// extends with what is its own:
//
//     export default defineConfig(
//       mergeConfig(gameConfig({ port: 9001, name: "Minesweeper" }), {}),
//     );
//
// The site's config takes the Angular plugins from here too.

import path from "node:path";
import { fileURLToPath } from "node:url";
import angular from "@analogjs/vite-plugin-angular";
import { fuzzleyStyle } from "@fz/style/vite";
import ts from "typescript";
import type { HotPayload, Plugin, PluginOption, UserConfig } from "vite";
import { gameManifest, type ManifestSource } from "./game_manifest.ts";

/** Says what sets one game's config apart from the others'. */
export interface Game extends ManifestSource {
  /**
   * The dev server's port, a different one for each game, which its
   * screenshot script captures from unless told otherwise.
   */
  readonly port: number;
}

/** The event Angular's runtime takes a component's update from. */
const UPDATE_EVENT = "angular:component-update";

/** The path Angular's runtime fetches a component's update at. */
const UPDATE_PATH = "/@ng/component";

/** The folder that holds every library, this one among them. */
const LIBRARIES = path.resolve(fileURLToPath(import.meta.url), "../../..");

/**
 * Returns the ID Angular compiles into a component, which the page takes its
 * updates by, from the one Analog announces them by: the component's file
 * from the folder the server runs in, then `@` and its class.
 *
 * Angular names the file by its path from the app's root, or by its whole
 * path when it lies outside it, as a library's does, and in lower case on a
 * file system that ignores case.
 */
export function compiledId(
  announced: string,
  cwd: string,
  root: string,
  caseSensitive: boolean,
): string {
  const at = announced.lastIndexOf("@");
  const file = path.resolve(cwd, announced.slice(0, at));
  const fromRoot = path.relative(root, file);
  const outside = fromRoot.startsWith("..") || path.isAbsolute(fromRoot);
  const name = (outside ? file : fromRoot).replaceAll("\\", "/");
  return `${caseSensitive ? name : name.toLowerCase()}${announced.slice(at)}`;
}

/** Returns whether a value is an update Analog announces. */
function isUpdate(value: unknown): value is { id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

/**
 * Has the page take every update Analog's live reload sends, and reloads the
 * page for an edit to TypeScript, which Angular can't swap into it.
 *
 * Analog announces a component's update under a name of its own, which
 * matches the ID Angular compiles into the component only for a file in the
 * app's root whose path, where the file system ignores case, has no capital
 * letter. So this announces the update under Angular's ID, and points the
 * page's request for the update back at Analog's name. The app's `rootDir`
 * must be its root, as `tsconfig/angular.json` makes it.
 */
export function componentUpdates(
  caseSensitive: boolean = ts.sys.useCaseSensitiveFileNames,
): Plugin {
  let root = "";
  /** Analog's name for each component, by Angular's ID for it. */
  const analogIds = new Map<string, string>();
  return {
    name: "fz-component-updates",
    apply: "serve",
    configResolved(config) {
      root = config.root;
    },
    configureServer: {
      // Ahead of Analog's, so this middleware sees a request before Analog's
      // does, and Analog's batching, which passes on a message alone, wraps
      // this send.
      order: "pre",
      handler(server) {
        const send = server.ws.send.bind(server.ws);
        server.ws.send = (
          payload: HotPayload | string,
          data?: unknown,
        ): void => {
          const message: HotPayload =
            typeof payload === "string"
              ? { type: "custom", event: payload, data }
              : payload;
          if (
            message.type !== "custom" ||
            message.event !== UPDATE_EVENT ||
            !isUpdate(message.data)
          ) {
            send(message);
            return;
          }
          const analogId = decodeURIComponent(message.data.id);
          const id = compiledId(analogId, process.cwd(), root, caseSensitive);
          analogIds.set(id, analogId);
          send({
            ...message,
            data: { ...message.data, id: encodeURIComponent(id) },
          });
        };
        server.middlewares.use((req, _res, next) => {
          if (req.url?.includes(UPDATE_PATH)) {
            const url = new URL(req.url, "http://localhost");
            const analogId = analogIds.get(url.searchParams.get("c") ?? "");
            if (analogId !== undefined) {
              url.searchParams.set("c", analogId);
              req.url = `${url.pathname}${url.search}`;
            }
          }
          next();
        });
      },
    },
    handleHotUpdate: {
      // After Analog's, so the page reloads with the edit compiled.
      order: "post",
      handler({ file, modules, server }) {
        // A file the page doesn't load, such as a spec, has no modules.
        if (!file.endsWith(".ts") || modules.length === 0) return;
        server.ws.send({ type: "full-reload", triggeredBy: file });
        return [];
      },
    },
  };
}

/**
 * Has the dev server watch the libraries' folder, so it keeps seeing a
 * library's file that git replaces.
 *
 * Vite watches each file outside the app's folder on its own, and git
 * replaces a file by deleting it and writing it anew. A watcher that looks in
 * between finds the file gone and stops watching it, so the page keeps the
 * old file, and later edits to it go unseen until the server restarts.
 */
export function watchLibraries(folder: string = LIBRARIES): Plugin {
  return {
    name: "fz-watch-libraries",
    apply: "serve",
    configureServer(server) {
      server.watcher.add(folder);
    },
  };
}

/**
 * Returns Analog's Angular plugin with its live reload, which swaps an edited
 * component's template or styles into the running page, rather than reloading
 * it and losing what is in play, a library's components included.
 */
export function angularPlugins(): PluginOption[] {
  return [componentUpdates(), watchLibraries(), angular({ liveReload: true })];
}

/**
 * The chunk a game's build puts every module of Phaser in, so the game's code
 * can change without the browser downloading Phaser again. A game without
 * Phaser has no module for it to take.
 */
export const PHASER_CHUNK = {
  name: "phaser",
  test: /[\\/]node_modules[\\/]phaser[\\/]/,
} as const;

/**
 * Returns the config every game's build and dev server share: Angular, the
 * palettes and icons of `@fz/style`, and a build in `dist/` that the site can
 * serve from any folder, with the game.json that says what it holds.
 */
export function gameConfig({ port, ...manifest }: Game): UserConfig {
  return {
    // The site serves a game's build from /play/<slug>/, so every address in
    // it is relative to its index.html.
    base: "./",
    plugins: [angularPlugins(), fuzzleyStyle(), gameManifest(manifest)],
    server: {
      port,
      open: true,
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      rolldownOptions: {
        output: { codeSplitting: { groups: [PHASER_CHUNK] } },
      },
    },
  };
}
