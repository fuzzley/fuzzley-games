// Starts the site's dev server and every game's at once, each game served live
// under the site's /play/<slug>/, so an edit to the site, a game or a library
// they share shows on the page as soon as it is saved.
//
//   node tools/dev-all.mjs [--port <port>]
//
//   --port  The site's port, 4200 unless given. The games take the ones after
//           it, in the order games.json lists them.
//
// Each app runs its own Vite, in its own folder, because Analog's Angular
// plugin finds the app's files from the folder it starts in. The site's sends
// each game's folder, websocket and all, to that game's server
// (proxyGameServers in vite-plugins.ts), so the games share the site's origin
// and what it stores, such as the palette. When one server stops, so do the
// others.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { readManifest } from "./games.mjs";
import { SITE_DIR, WORKSPACE_ROOT, errorMessage, logger } from "./script.mjs";

/** @import { ChildProcess } from "node:child_process" */
/** @import { GameBuild } from "./games.mjs" */

/**
 * The variable that tells the site's dev server where each game's server is,
 * as JSON mapping each slug to its server's address.
 */
export const GAME_SERVERS_ENV = "FZ_GAME_SERVERS";

/** The site's port when none is given, as its vite.config.ts sets it. */
const SITE_PORT = 4200;

const log = logger("dev-all");

/**
 * @typedef {object} GameServer A game's dev server.
 * @property {string} slug The folder the site serves it at, /play/<slug>/.
 * @property {string} workspace Its folder in frontend/.
 * @property {number} port
 */

/**
 * @typedef {object} Server A Node process to run alongside the others.
 * @property {string} name What its output is labeled with.
 * @property {string} cwd
 * @property {string[]} args Node's arguments: the script, then its own.
 * @property {Record<string, string>} env What it adds to this process's
 *   environment.
 */

/**
 * @typedef {object} Printer Where the servers' output goes.
 * @property {(line: string) => void} log
 * @property {(line: string) => void} error
 */

/**
 * @typedef {object} Running The servers, once started.
 * @property {() => void} stop Stops every server still running.
 * @property {Promise<number>} done Settles once every server has exited, with
 *   0 if they were stopped and 1 if one stopped on its own.
 */

/**
 * Returns the games' dev servers, on the ports after the site's.
 *
 * @param {Record<string, GameBuild>} manifest
 * @param {number} sitePort
 * @returns {GameServer[]}
 */
export function gameServers(manifest, sitePort) {
  return Object.entries(manifest).map(([slug, { workspace }], index) => ({
    slug,
    workspace,
    port: sitePort + 1 + index,
  }));
}

/**
 * Returns the arguments that start a game's Vite at its folder in the site.
 *
 * @param {GameServer} game
 * @returns {string[]}
 */
export function gameArgs({ slug, port }) {
  return [
    "--base",
    `/play/${slug}/`,
    "--port",
    String(port),
    "--strictPort",
    "--no-open",
  ];
}

/**
 * Returns what the site's dev server reads from {@link GAME_SERVERS_ENV}.
 *
 * @param {GameServer[]} games
 * @returns {string}
 */
export function gameServersEnv(games) {
  return JSON.stringify(
    Object.fromEntries(
      games.map(({ slug, port }) => [slug, `http://localhost:${port}`]),
    ),
  );
}

/**
 * Returns the Vite servers to run: each game's in its workspace, then the
 * site's, which sends each game's folder to the game's server.
 *
 * @param {GameServer[]} games
 * @param {number} sitePort
 * @param {string} vite The script that runs Vite.
 * @returns {Server[]}
 */
export function viteServers(games, sitePort, vite) {
  return [
    ...games.map((game) => ({
      name: game.slug,
      cwd: path.join(WORKSPACE_ROOT, game.workspace),
      args: [vite, ...gameArgs(game)],
      env: {},
    })),
    {
      name: "site",
      cwd: SITE_DIR,
      args: [vite, "--port", String(sitePort), "--strictPort"],
      env: { [GAME_SERVERS_ENV]: gameServersEnv(games) },
    },
  ];
}

/**
 * Returns a port from the command line, or fails on anything else.
 *
 * @param {string} text
 * @returns {number}
 */
export function parsePort(text) {
  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${text} isn't a port.`);
  }
  return port;
}

/**
 * Returns the path to the script that runs Vite.
 *
 * @returns {string}
 */
export function viteBin() {
  const packageFile = createRequire(import.meta.url).resolve(
    "vite/package.json",
  );
  /** @type {{bin: {vite: string}}} */
  const { bin } = JSON.parse(readFileSync(packageFile, "utf8"));
  return path.join(path.dirname(packageFile), bin.vite);
}

/**
 * Prints each line a stream writes, under a label.
 *
 * @param {NodeJS.ReadableStream | null} stream
 * @param {string} label
 * @param {(line: string) => void} print
 */
function relay(stream, label, print) {
  if (!stream) return;
  createInterface({ input: stream }).on("line", (line) => {
    print(`${label} ${line}`);
  });
}

/**
 * Starts the servers, each line of their output labeled with its name, and
 * stops the rest when one stops.
 *
 * @param {Server[]} servers
 * @param {Printer} [printer]
 * @returns {Running}
 */
export function runServers(servers, printer = console) {
  const width = Math.max(...servers.map(({ name }) => name.length));
  /** @type {ChildProcess[]} */
  const children = [];
  let code = 0;
  let stopping = false;

  const stop = () => {
    stopping = true;
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill();
    }
  };

  const exits = servers.map(({ name, cwd, args, env }) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(child);
    const label = `[${name.padEnd(width)}]`;
    relay(child.stdout, label, printer.log);
    relay(child.stderr, label, printer.error);
    child.on("exit", () => {
      if (stopping) return;
      printer.error(`dev-all: ${name} stopped, so the others stop too.`);
      code = 1;
      stop();
    });
    // Once its output has all been printed, too.
    return new Promise((resolve) => child.on("close", resolve));
  });

  return { stop, done: Promise.all(exits).then(() => code) };
}

async function main() {
  const { values } = parseArgs({ options: { port: { type: "string" } } });
  const sitePort = parsePort(values.port ?? String(SITE_PORT));
  const games = gameServers(readManifest(), sitePort);
  // Vite only colors what it writes to a terminal, and its output comes here.
  if (process.stdout.isTTY) process.env["FORCE_COLOR"] = "1";

  const site = `http://localhost:${sitePort}`;
  log(`the site will be at ${site}/, with the games at:`);
  for (const { slug } of games) log(`  ${site}/play/${slug}/`);

  const running = runServers(viteServers(games, sitePort, viteBin()));
  process.on("SIGINT", running.stop);
  process.on("SIGTERM", running.stop);
  process.exitCode = await running.done;
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(`dev-all: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
