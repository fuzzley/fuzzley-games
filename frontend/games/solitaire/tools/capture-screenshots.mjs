#!/usr/bin/env node
/**
 * Captures each game's rules-page screenshot from the running dev server.
 *
 *   yarn start
 *   yarn capture:screenshots [game id ...]
 *   yarn build:thumbs
 *
 * Writes `docs/screenshots/<id>/overview.png` for every game that has one, or
 * only the games named. Each game opens on a fresh deal in a browser context
 * of its own, so it shows the whole page with every setting at its default,
 * rather than whatever the last game left in storage. These lossless
 * originals stay out of `public/`: `yarn build:thumbs` makes the WebP images
 * the site serves from them.
 */
import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import sharp from "sharp";

/** @import { ChildProcess } from "node:child_process" */

const USAGE = `Usage: yarn capture:screenshots [options] [game id ...]

Captures each game's rules-page screenshot from the running dev server, or
only the games named. Run yarn build:thumbs afterwards.

  --url <url>      The dev server (default: http://localhost:9000/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "docs/screenshots");
const TARGET = "overview.png";

/** The page size every screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1440, height: 810, deviceScaleFactor: 2 };

/**
 * How long to let a board settle once its game is running, while the card
 * textures load and the first frames draw.
 */
const SETTLE_MS = 2500;

/** How long Chrome has to start before the capture gives up. */
const LAUNCH_TIMEOUT_MS = 15_000;

/** Where Chrome is usually installed, on each platform. */
const CHROME_PATHS = {
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/chromium"],
};

/**
 * What the page reports once its game is running.
 *
 * @typedef {{hash: string, running: boolean, openDialogs: number}} PageState
 */

/**
 * The results of the DevTools commands this script reads, by command.
 *
 * @typedef {{
 *   "Target.createBrowserContext": {browserContextId: string},
 *   "Target.createTarget": {targetId: string},
 *   "Target.attachToTarget": {sessionId: string},
 *   "Runtime.evaluate": {result: {value: unknown}},
 *   "Page.captureScreenshot": {data: string},
 * }} CommandResults
 */

/**
 * The result of a DevTools command, typed for the ones this script reads.
 *
 * @template {string} M
 * @typedef {M extends keyof CommandResults ? CommandResults[M] : unknown} ResultOf
 */

/**
 * A connection to Chrome's DevTools protocol, which sends commands to the
 * browser or, given a session, to one page.
 */
class DevToolsConnection {
  /** @param {WebSocket} socket */
  constructor(socket) {
    /** @private */
    this.socket = socket;
    /** @private */
    this.nextId = 1;
    /**
     * @private
     * @type {Map<number, {resolve: (result: unknown) => void, reject: (error: Error) => void}>}
     */
    this.pending = new Map();
    /**
     * @private
     * @type {{method: string, sessionId: string, resolve: (params: unknown) => void}[]}
     */
    this.waiters = [];
    socket.addEventListener("message", (event) =>
      this.receive(JSON.parse(String(event.data))),
    );
  }

  /**
   * Opens a connection to the browser at a DevTools WebSocket URL.
   *
   * @param {string} url
   * @returns {Promise<DevToolsConnection>}
   */
  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new DevToolsConnection(socket);
  }

  /**
   * Sends a command and returns its result.
   *
   * @template {string} M
   * @param {M} method
   * @param {object} [params]
   * @param {string} [sessionId] The page to send it to, or none for the
   *   browser.
   * @returns {Promise<ResultOf<M>>}
   */
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    return /** @type {Promise<ResultOf<M>>} */ (result);
  }

  /**
   * Returns a promise of the next event of a kind from a page.
   *
   * @param {string} method
   * @param {string} sessionId
   * @returns {Promise<unknown>}
   */
  next(method, sessionId) {
    return new Promise((resolve) =>
      this.waiters.push({ method, sessionId, resolve }),
    );
  }

  /** Closes the connection. */
  close() {
    this.socket.close();
  }

  /**
   * Settles the command a reply answers, or the waiters an event satisfies.
   *
   * @private
   * @param {{id?: number, result?: unknown, error?: {message: string}, method?: string, params?: unknown, sessionId?: string}} message
   */
  receive(message) {
    if (message.id !== undefined) {
      const command = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) command?.reject(new Error(message.error.message));
      else command?.resolve(message.result);
      return;
    }
    const satisfied = this.waiters.filter(
      (waiter) =>
        waiter.method === message.method &&
        waiter.sessionId === message.sessionId,
    );
    this.waiters = this.waiters.filter((waiter) => !satisfied.includes(waiter));
    for (const waiter of satisfied) waiter.resolve(message.params);
  }
}

/**
 * Returns the Chrome to run: the one asked for, or the first installed in a
 * usual place.
 *
 * @param {string | undefined} requested
 * @returns {Promise<string>}
 */
async function findChrome(requested) {
  const asked = requested ?? process.env["CHROME_PATH"];
  if (asked) return asked;
  const platform = /** @type {keyof typeof CHROME_PATHS} */ (process.platform);
  for (const path of CHROME_PATHS[platform] ?? []) {
    if (
      await access(path).then(
        () => true,
        () => false,
      )
    )
      return path;
  }
  throw new Error("Found no Chrome; pass --chrome or set CHROME_PATH.");
}

/**
 * Starts a headless Chrome on a throwaway profile and returns it with the
 * address of its DevTools endpoint.
 *
 * @param {string} chromePath
 * @param {string} profile
 * @returns {Promise<{chrome: ChildProcess, endpoint: string}>}
 */
async function launchChrome(chromePath, profile) {
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  // Chrome writes the port it chose, and its endpoint's path, once it listens.
  const portFile = join(profile, "DevToolsActivePort");
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const contents = await readFile(portFile, "utf8").catch(() => "");
    const [port, path] = contents.split("\n");
    if (path) return { chrome, endpoint: `ws://127.0.0.1:${port}${path}` };
    await sleep(100);
  }
  chrome.kill();
  throw new Error(`Chrome did not start within ${LAUNCH_TIMEOUT_MS} ms.`);
}

/**
 * Opens one game in a browser context of its own and returns its screenshot,
 * or why it could not be taken.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} baseUrl
 * @param {string} id
 * @returns {Promise<{png: Buffer} | {problem: string}>}
 */
async function capture(devtools, baseUrl, id) {
  const { browserContextId } = await devtools.send(
    "Target.createBrowserContext",
  );
  try {
    const { targetId } = await devtools.send("Target.createTarget", {
      url: "about:blank",
      browserContextId,
    });
    const { sessionId } = await devtools.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    await devtools.send(
      "Emulation.setDeviceMetricsOverride",
      { ...VIEWPORT, mobile: false },
      sessionId,
    );
    await devtools.send("Page.enable", {}, sessionId);
    const loaded = devtools.next("Page.loadEventFired", sessionId);
    await devtools.send(
      "Page.navigate",
      { url: new URL(`#/${id}`, baseUrl).href },
      sessionId,
    );
    await loaded;

    const { result } = await devtools.send(
      "Runtime.evaluate",
      {
        expression: `(async () => {
          for (let i = 0; i < 100 && !window.fsolitaire; i++) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          await document.fonts.ready;
          await new Promise((resolve) => setTimeout(resolve, ${SETTLE_MS}));
          return {
            hash: location.hash,
            running: Boolean(window.fsolitaire),
            openDialogs: document.querySelectorAll("dialog[open]").length,
          };
        })()`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    const state = /** @type {PageState} */ (result.value);
    if (state.hash !== `#/${id}`) return { problem: `opened ${state.hash}` };
    if (!state.running) return { problem: "no game started" };
    if (state.openDialogs > 0) return { problem: "a dialog is open" };

    const { data } = await devtools.send(
      "Page.captureScreenshot",
      { format: "png" },
      sessionId,
    );
    return { png: Buffer.from(data, "base64") };
  } finally {
    await devtools.send("Target.disposeBrowserContext", { browserContextId });
  }
}

/**
 * Returns the games the command line names, or every game with a screenshot,
 * and the options it sets.
 *
 * @returns {Promise<{ids: string[], baseUrl: string, chrome?: string} | undefined>}
 *   Nothing when it asks only for help.
 */
async function parseCommandLine() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: "string", default: "http://localhost:9000/" },
      chrome: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return undefined;
  }
  const ids = positionals.length
    ? positionals
    : (await readdir(SCREENSHOT_DIR, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
  return { ids, baseUrl: values.url, chrome: values.chrome };
}

async function main() {
  const options = await parseCommandLine();
  if (!options) return;
  await fetch(options.baseUrl).catch(() => {
    throw new Error(
      `Nothing answers at ${options.baseUrl}; start the dev server with yarn start.`,
    );
  });

  const profile = await mkdtemp(join(tmpdir(), "fsolitaire-capture-"));
  const { chrome, endpoint } = await launchChrome(
    await findChrome(options.chrome),
    profile,
  );
  const exited = new Promise((resolve) => chrome.once("exit", resolve));
  const failed = [];
  try {
    const devtools = await DevToolsConnection.open(endpoint);
    for (const id of options.ids) {
      const shot = await capture(devtools, options.baseUrl, id);
      if ("problem" in shot) {
        failed.push(id);
        console.log(`${id}: skipped, ${shot.problem}`);
        continue;
      }
      const target = join(SCREENSHOT_DIR, id, TARGET);
      await mkdir(dirname(target), { recursive: true });
      await sharp(shot.png).png({ compressionLevel: 9 }).toFile(target);
      console.log(`${id}: ${TARGET}`);
    }
    devtools.close();
  } finally {
    chrome.kill();
    await exited;
    await rm(profile, { recursive: true, force: true, maxRetries: 10 });
  }

  console.log(
    `Captured ${options.ids.length - failed.length} of ${options.ids.length}.`,
  );
  if (failed.length > 0) {
    console.error(`Not captured: ${failed.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("Run yarn build:thumbs to make the images the site serves.");
  }
}

await main();
