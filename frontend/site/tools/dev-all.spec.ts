import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  GAME_SERVERS_ENV,
  type Server,
  gameArgs,
  gameServers,
  gameServersEnv,
  parsePort,
  runServers,
  viteBin,
  viteServers,
} from "./dev-all.mjs";
import { SITE_DIR, WORKSPACE_ROOT } from "./script.mjs";
import { gameServerTargets } from "./vite-plugins.ts";

const MANIFEST = {
  solitaire: { workspace: "games/solitaire" },
  minesweeper: { workspace: "games/minesweeper" },
};

/** Returns a server that runs a line of JavaScript. */
function nodeServer(name: string, code: string): Server {
  return { name, cwd: tmpdir(), args: ["-e", code], env: {} };
}

/** A server that runs until it is stopped. */
const LASTING = "setTimeout(() => {}, 60_000)";

/** Returns a printer that keeps what it is given. */
function recorder(): {
  log: (line: string) => void;
  error: (line: string) => void;
  out: string[];
  err: string[];
} {
  const out: string[] = [];
  const err: string[] = [];
  return {
    log: (line) => out.push(line),
    error: (line) => err.push(line),
    out,
    err,
  };
}

describe("gameServers", () => {
  it("puts the games on the ports after the site's, in the order games.json lists them", () => {
    const servers = gameServers(MANIFEST, 4300);

    expect(servers).toEqual([
      { slug: "solitaire", workspace: "games/solitaire", port: 4301 },
      { slug: "minesweeper", workspace: "games/minesweeper", port: 4302 },
    ]);
  });
});

describe("gameArgs", () => {
  it("serves a game at its folder in the site, on its port alone, without opening a browser", () => {
    const args = gameArgs({
      slug: "minesweeper",
      workspace: "games/minesweeper",
      port: 4302,
    });

    expect(args).toEqual([
      "--base",
      "/play/minesweeper/",
      "--port",
      "4302",
      "--strictPort",
      "--no-open",
    ]);
  });
});

describe("gameServersEnv", () => {
  it("tells the site's dev server to send each game's folder to its server", () => {
    const env = {
      [GAME_SERVERS_ENV]: gameServersEnv(gameServers(MANIFEST, 4200)),
    };

    expect(gameServerTargets(env)).toEqual({
      "/play/solitaire/": "http://localhost:4201",
      "/play/minesweeper/": "http://localhost:4202",
    });
  });
});

describe("viteServers", () => {
  it("runs each game's Vite in its workspace, then the site's, which knows where they are", () => {
    const games = gameServers(MANIFEST, 4200);

    const servers = viteServers(games, 4200, "vite.js");

    expect(servers).toEqual([
      {
        name: "solitaire",
        cwd: path.join(WORKSPACE_ROOT, "games/solitaire"),
        args: [
          "vite.js",
          "--base",
          "/play/solitaire/",
          "--port",
          "4201",
        ].concat(["--strictPort", "--no-open"]),
        env: {},
      },
      {
        name: "minesweeper",
        cwd: path.join(WORKSPACE_ROOT, "games/minesweeper"),
        args: [
          "vite.js",
          "--base",
          "/play/minesweeper/",
          "--port",
          "4202",
        ].concat(["--strictPort", "--no-open"]),
        env: {},
      },
      {
        name: "site",
        cwd: SITE_DIR,
        args: ["vite.js", "--port", "4200", "--strictPort"],
        env: { [GAME_SERVERS_ENV]: gameServersEnv(games) },
      },
    ]);
  });
});

describe("parsePort", () => {
  it("reads a port", () => {
    expect(parsePort("4300")).toBe(4300);
  });

  it.each(["", "http", "0", "42.5", "65536"])("rejects %j", (text) => {
    expect(() => parsePort(text)).toThrow(/isn't a port/);
  });
});

describe("viteBin", () => {
  it("finds the script that runs Vite", () => {
    const bin = viteBin();

    expect(existsSync(bin)).toBe(true);
  });
});

describe("runServers", () => {
  it("labels each line a server prints with its name", async () => {
    const printer = recorder();
    const servers = [
      nodeServer("site", "console.log('ready'); console.error('careful')"),
    ];

    await runServers(servers, printer).done;

    expect(printer.out).toEqual(["[site] ready"]);
    expect(printer.err).toContain("[site] careful");
  });

  it("stops the others when one stops on its own, and fails", async () => {
    const printer = recorder();
    const servers = [nodeServer("site", LASTING), nodeServer("game", "")];

    const code = await runServers(servers, printer).done;

    expect(code).toBe(1);
    expect(printer.err).toEqual([
      "dev-all: game stopped, so the others stop too.",
    ]);
  });

  it("stops every server when asked, and succeeds", async () => {
    const printer = recorder();
    const running = runServers(
      [nodeServer("site", LASTING), nodeServer("game", LASTING)],
      printer,
    );

    running.stop();

    expect(await running.done).toBe(0);
  });
});
