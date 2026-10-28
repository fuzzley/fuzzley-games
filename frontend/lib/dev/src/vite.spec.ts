import path from "node:path";
import type {
  HmrContext,
  HotPayload,
  Plugin,
  ResolvedConfig,
  ViteDevServer,
} from "vite";
import { mergeConfig } from "vite";
import {
  compiledId,
  componentUpdates,
  PHASER_CHUNK,
  gameConfig,
  watchLibraries,
} from "./vite.ts";

/** A game's folder, which its dev server serves. */
const ROOT = path.resolve("frontend/games/minesweeper");

/** The event Angular's runtime takes a component's update from. */
const UPDATE_EVENT = "angular:component-update";

/** A library's component, as Analog names it from the folder Vitest runs in. */
const LIBRARY_COMPONENT =
  "../game-ui/src/game_bar/game_bar.component.ts@GameBarComponent";

/** Returns a path as Angular writes it where the file system ignores case. */
function canonical(file: string): string {
  return file.replaceAll("\\", "/").toLowerCase();
}

/** A dev server running {@link componentUpdates}, as the tests drive it. */
interface Served {
  /** The messages the server has sent the page. */
  readonly sent: unknown[];
  /** Sends the page a message, or an event and its data. */
  send(payload: HotPayload | string, data?: unknown): void;
  /** Returns the address a request reaches Analog's middleware at. */
  route(url: string): string | undefined;
  /** Runs the update hook for an edit to a file the page loads as modules. */
  edit(file: string, modules: unknown[]): unknown;
}

/** Starts {@link componentUpdates} on a stand-in for a dev server. */
function serve(): Served {
  const plugin = componentUpdates(false);
  const sent: unknown[] = [];
  let middleware = (
    _req: { url?: string },
    _res: unknown,
    _next: () => void,
  ): void => undefined;
  const server = {
    ws: { send: (message: unknown) => sent.push(message) },
    middlewares: {
      use: (handler: typeof middleware) => {
        middleware = handler;
      },
    },
  };
  // The hooks read only the root, and use only the server's websocket and
  // middleware, so stand-ins for Vite's config and server are enough.
  const config = { root: process.cwd() } as unknown as ResolvedConfig;
  const viteServer = server as unknown as ViteDevServer;
  (plugin.configResolved as (config: ResolvedConfig) => void)(config);
  (plugin.configureServer as { handler: (s: ViteDevServer) => void }).handler(
    viteServer,
  );
  const update = plugin.handleHotUpdate as {
    handler: (ctx: HmrContext) => unknown;
  };
  return {
    sent,
    send: (payload, data) => {
      if (typeof payload === "string") viteServer.ws.send(payload, data);
      else viteServer.ws.send(payload);
    },
    route: (url) => {
      const req = { url };
      middleware(req, undefined, () => undefined);
      return req.url;
    },
    edit: (file, modules) =>
      update.handler({ file, modules, server } as unknown as HmrContext),
  };
}

/** Returns what a plugin adds to a stand-in dev server's watcher. */
function watched(plugin: Plugin): string[] {
  const added: string[] = [];
  // The hook uses only the server's watcher, so a stand-in for it is enough.
  const server = {
    watcher: { add: (folder: string) => added.push(folder) },
  } as unknown as ViteDevServer;
  (plugin.configureServer as (server: ViteDevServer) => void)(server);
  return added;
}

/** Returns the names of the plugins a config adds. */
function pluginNames(plugins: unknown[] | undefined): string[] {
  return (plugins ?? [])
    .flat(Infinity)
    .map((plugin) => (plugin as Plugin).name);
}

describe("gameConfig", () => {
  it("builds into dist/ with addresses relative to the page", () => {
    const config = gameConfig({ port: 9001, name: "Minesweeper" });

    expect(config).toMatchObject({
      base: "./",
      build: { outDir: "dist", assetsDir: "assets" },
    });
  });

  it("serves the game on its own port and opens it", () => {
    const config = gameConfig({ port: 9001, name: "Minesweeper" });

    expect(config.server).toEqual({ port: 9001, open: true });
  });

  it("compiles Angular and writes @fz/style's palettes and icons and the game's manifest", () => {
    const config = gameConfig({ port: 9001, name: "Minesweeper" });

    expect(pluginNames(config.plugins)).toEqual(
      expect.arrayContaining([
        "@analogjs/vite-plugin-angular",
        "fz-component-updates",
        "fz-watch-libraries",
        "fz-theme-bootstrap",
        "fz-game-manifest",
      ]),
    );
  });

  it("keeps what a game adds when the game merges its own config into it", () => {
    const config = mergeConfig(
      gameConfig({ port: 9000, name: "Solitaire Collection" }),
      {
        build: { sourcemap: true },
      },
    );

    expect(config["build"]).toMatchObject({
      outDir: "dist",
      assetsDir: "assets",
      rolldownOptions: {
        output: { codeSplitting: { groups: [PHASER_CHUNK] } },
      },
      sourcemap: true,
    });
  });
});

describe("PHASER_CHUNK", () => {
  it("takes Phaser's modules", () => {
    const taken = [
      "C:\\games\\frontend\\node_modules\\phaser\\dist\\phaser.esm.js",
      "/games/frontend/node_modules/phaser/src/core/Game.js",
    ].map((id) => PHASER_CHUNK.test.test(id));

    expect(taken).toEqual([true, true]);
  });

  it("leaves every other module to the bundler", () => {
    const taken = [
      "/games/frontend/node_modules/@angular/core/fesm2022/core.mjs",
      "/games/frontend/node_modules/phaser-plugin/index.js",
      "/games/frontend/games/snake/src/scene/phaser_scene.ts",
    ].map((id) => PHASER_CHUNK.test.test(id));

    expect(taken).toEqual([false, false, false]);
  });
});

describe("compiledId", () => {
  it("names an app's own component by its path from the app's root", () => {
    const id = compiledId(
      "src/app/bar/bar.component.ts@BarComponent",
      ROOT,
      ROOT,
      false,
    );

    expect(id).toBe("src/app/bar/bar.component.ts@BarComponent");
  });

  it("names a library's component by its whole path, in lower case where case is ignored", () => {
    const announced = "../../lib/game-ui/src/game_bar/Bar.ts@GameBarComponent";

    const id = compiledId(announced, ROOT, ROOT, false);

    const file = path.resolve(ROOT, "../../lib/game-ui/src/game_bar/Bar.ts");
    expect(id).toBe(`${canonical(file)}@GameBarComponent`);
  });

  it("keeps the path's case where the file system minds it", () => {
    const announced = "../../lib/game-ui/src/game_bar/Bar.ts@GameBarComponent";

    const id = compiledId(announced, ROOT, ROOT, true);

    const file = path.resolve(ROOT, "../../lib/game-ui/src/game_bar/Bar.ts");
    expect(id).toBe(`${file.replaceAll("\\", "/")}@GameBarComponent`);
  });
});

describe("componentUpdates", () => {
  /** Angular's ID for the library's component, from the folder Vitest runs in. */
  const libraryId = `${canonical(path.resolve("../game-ui/src/game_bar/game_bar.component.ts"))}@GameBarComponent`;

  it("announces a library component's update under the ID Angular compiled into it", () => {
    const server = serve();

    server.send(UPDATE_EVENT, {
      id: encodeURIComponent(LIBRARY_COMPONENT),
      timestamp: 1,
    });

    expect(server.sent).toEqual([
      {
        type: "custom",
        event: UPDATE_EVENT,
        data: { id: encodeURIComponent(libraryId), timestamp: 1 },
      },
    ]);
  });

  it("renames the update in a message, as Analog's batching passes it on", () => {
    const server = serve();

    server.send({
      type: "custom",
      event: UPDATE_EVENT,
      data: { id: encodeURIComponent(LIBRARY_COMPONENT) },
    });

    expect(server.sent).toEqual([
      {
        type: "custom",
        event: UPDATE_EVENT,
        data: { id: encodeURIComponent(libraryId) },
      },
    ]);
  });

  it("points the page's request for the update back at Analog's name", () => {
    const server = serve();
    server.send(UPDATE_EVENT, { id: encodeURIComponent(LIBRARY_COMPONENT) });

    const routed = server.route(
      `/@fs/lib/game_bar/@ng/component?c=${encodeURIComponent(libraryId)}&t=2`,
    );

    const query = new URL(routed ?? "", "http://localhost").searchParams;
    expect(query.get("c")).toBe(LIBRARY_COMPONENT);
  });

  it("passes the server's other messages and requests on as they are", () => {
    const server = serve();

    server.send({ type: "full-reload" });
    const routed = server.route("/@ng/component?c=unknown&t=3");

    expect({ sent: server.sent, routed }).toEqual({
      sent: [{ type: "full-reload" }],
      routed: "/@ng/component?c=unknown&t=3",
    });
  });

  it("reloads the page for an edit to TypeScript the page loads", () => {
    const server = serve();

    const modules = server.edit("src/app/bar/bar.component.ts", ["module"]);

    expect({ modules, sent: server.sent }).toEqual({
      modules: [],
      sent: [
        { type: "full-reload", triggeredBy: "src/app/bar/bar.component.ts" },
      ],
    });
  });

  it("leaves an edit to a template to Analog", () => {
    const server = serve();

    const modules = server.edit("src/app/bar/bar.component.html", ["module"]);

    expect({ modules, sent: server.sent }).toEqual({
      modules: undefined,
      sent: [],
    });
  });

  it("leaves alone TypeScript the page doesn't load, such as a spec", () => {
    const server = serve();

    const modules = server.edit("src/app/bar/bar.component.spec.ts", []);

    expect({ modules, sent: server.sent }).toEqual({
      modules: undefined,
      sent: [],
    });
  });
});

describe("watchLibraries", () => {
  it("watches the folder it is given", () => {
    const folders = watched(watchLibraries(ROOT));

    expect(folders).toEqual([ROOT]);
  });

  it("watches the folder that holds the libraries by default", () => {
    const folders = watched(watchLibraries());

    expect(folders).toEqual([path.resolve(import.meta.dirname, "../..")]);
  });
});
