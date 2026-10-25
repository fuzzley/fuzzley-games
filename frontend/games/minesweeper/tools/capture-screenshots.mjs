#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Minesweeper from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp` to
 * `public/docs/screenshots/minesweeper/`. Both show the same game, part
 * played: the deal is seeded, the moves are the ones the numbers force, and
 * one mine is stepped on to show a life lost. The page opens in a browser
 * context of its own, so the palette and the difficulty are the defaults.
 */
import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import sharp from "sharp";

/** @import { ChildProcess } from "node:child_process" */

const USAGE = `Usage: yarn capture:screenshots [options]

Captures the screenshots the site shows of Minesweeper from a running server.

  --url <url>      The server (default: http://localhost:9000/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/minesweeper");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/** The images written from the screenshot. */
const OUTPUTS = [
  { file: "preview.webp", width: 1280, height: 720, quality: 80 },
  { file: "thumb.webp", width: 192, height: 108, quality: 80 },
];

/** Seeds the page's `Math.random`, which the game deals from. */
const SEED = 7;

/** How much of the field the opening clears before it stops, from 0 to 1. */
const OPEN_SHARE = 0.45;

/** What the clock reads when the screenshot is taken, in seconds. */
const CLOCK_SECONDS = 84;

/** Where the game keeps the game in progress, which sets the clock. */
const SAVED_GAME_KEY = "minesweeper-game";

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
 * What the opening left on the board.
 *
 * @typedef {{open: number, flagged: number, tripped: number}} Opening
 */

/**
 * What the page shows once it has reloaded the game.
 *
 * @typedef {{boards: number, tripped: number, openDialogs: number, time: string}} PageState
 */

/**
 * The results of the DevTools commands this script reads, by command.
 *
 * @typedef {{
 *   "Target.createBrowserContext": {browserContextId: string},
 *   "Target.createTarget": {targetId: string},
 *   "Target.attachToTarget": {sessionId: string},
 *   "Runtime.evaluate": {result: {value: unknown}, exceptionDetails?: {text: string, exception?: {description?: string}}},
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
 * Seeds `Math.random`, and sets the clock of a game in progress, before the
 * game starts. It runs in the page, so it uses nothing from this module.
 *
 * @param {number} seed
 * @param {number} seconds
 * @param {string} key Where the game keeps the game in progress.
 */
function preparePage(seed, seconds, key) {
  // Mulberry32, as the game's own random numbers are.
  let state = seed;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
  const saved = localStorage.getItem(key);
  if (saved) {
    localStorage.setItem(
      key,
      JSON.stringify({ ...JSON.parse(saved), seconds }),
    );
  }
}

/**
 * Plays the opening of a game: reveals the middle square, then flags the
 * mines the numbers give away and opens the squares they clear until enough
 * of the field is open, and steps on the last mine it flagged. It runs in the
 * page, so it uses nothing from this module.
 *
 * @param {number} share How much of the field to clear, from 0 to 1.
 * @returns {Promise<Opening>}
 */
async function playOpening(share) {
  /** @returns {Promise<void>} */
  const settle = () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );
  for (let i = 0; i < 100 && !document.querySelector(".board"); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const board = document.querySelector(".board");
  if (!(board instanceof HTMLElement)) throw new Error("No board showed.");
  const cols = Number(board.style.getPropertyValue("--cols"));

  /** @returns {HTMLElement[]} */
  const squares = () =>
    [...board.querySelectorAll("[data-index]")].map(
      (square) => /** @type {HTMLElement} */ (square),
    );
  /**
   * @param {HTMLElement} square
   * @param {string} type
   */
  const press = (square, type) => {
    square.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true }),
    );
  };
  /**
   * @param {number} index
   * @param {number} count
   * @returns {number[]}
   */
  const around = (index, count) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const found = [];
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        const inside = r >= 0 && c >= 0 && c < cols && r * cols + c < count;
        if (inside && (r !== row || c !== col)) found.push(r * cols + c);
      }
    }
    return found;
  };
  /**
   * @param {string[]} states
   * @returns {number}
   */
  const cleared = (states) =>
    states.filter((state) => state === "number" || state === "blank").length;

  const rows = squares().length / cols;
  const middle = squares()[Math.floor(rows / 2) * cols + Math.floor(cols / 2)];
  if (!middle) throw new Error("The board has no squares.");
  press(middle, "click");
  await settle();

  /** @type {HTMLElement | undefined} */
  let lastFlag;
  for (;;) {
    const all = squares();
    const states = all.map((square) => square.dataset["show"] ?? "");
    if (cleared(states) >= share * all.length) break;
    const mines = new Set();
    const safe = new Set();
    all.forEach((square, index) => {
      if (states[index] !== "number") return;
      const near = around(index, all.length);
      const hidden = near.filter((n) => states[n] === "hidden");
      const known = near.filter(
        (n) => states[n] === "flagged" || states[n] === "tripped",
      ).length;
      const left = Number(square.dataset["n"]) - known;
      if (hidden.length > 0 && left === hidden.length) {
        for (const n of hidden) mines.add(n);
      } else if (hidden.length > 0 && left === 0) {
        for (const n of hidden) safe.add(n);
      }
    });
    if (mines.size === 0 && safe.size === 0) break;
    for (const n of mines) {
      lastFlag = all[n];
      if (lastFlag) press(lastFlag, "contextmenu");
    }
    for (const n of safe) {
      const square = all[n];
      if (square) press(square, "click");
    }
    await settle();
  }

  if (lastFlag) {
    press(lastFlag, "contextmenu");
    await settle();
    press(lastFlag, "click");
    await settle();
  }
  const states = squares().map((square) => square.dataset["show"] ?? "");
  return {
    open: cleared(states) / states.length,
    flagged: states.filter((state) => state === "flagged").length,
    tripped: states.filter((state) => state === "tripped").length,
  };
}

/**
 * Waits for the reloaded game to show and paint, and returns what it shows.
 * It runs in the page, so it uses nothing from this module.
 *
 * @returns {Promise<PageState>}
 */
async function describePage() {
  for (let i = 0; i < 100 && !document.querySelector(".board"); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await document.fonts.ready;
  for (let i = 0; i < 2; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const timer = [...document.querySelectorAll("dt")].find(
    (term) => term.textContent?.trim() === "Time",
  );
  return {
    boards: document.querySelectorAll(".board").length,
    tripped: document.querySelectorAll('[data-show="tripped"]').length,
    openDialogs: document.querySelectorAll("dialog[open]").length,
    time: timer?.nextElementSibling?.textContent?.trim() ?? "",
  };
}

/**
 * Runs a function in a page with arguments that survive JSON, and returns
 * what it resolves to. The function is sent as its source, so it can use
 * nothing from this module.
 *
 * @template {unknown[]} A
 * @template T
 * @param {DevToolsConnection} devtools
 * @param {string} sessionId
 * @param {(...args: A) => T} fn
 * @param {A} args
 * @returns {Promise<Awaited<T>>}
 */
async function evaluate(devtools, sessionId, fn, ...args) {
  const call = `(${String(fn)})(...${JSON.stringify(args)})`;
  const { result, exceptionDetails } = await devtools.send(
    "Runtime.evaluate",
    { expression: call, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (exceptionDetails) {
    throw new Error(
      exceptionDetails.exception?.description ?? exceptionDetails.text,
    );
  }
  return /** @type {Awaited<T>} */ (result.value);
}

/**
 * Navigates a page, or reloads it, and waits for it to load.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} sessionId
 * @param {string} method `Page.navigate` or `Page.reload`.
 * @param {object} [params]
 */
async function load(devtools, sessionId, method, params) {
  const loaded = devtools.next("Page.loadEventFired", sessionId);
  await devtools.send(method, params, sessionId);
  await loaded;
}

/**
 * Plays the opening in a browser context of its own and returns the
 * screenshot, or why it could not be taken.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @returns {Promise<{png: Buffer, opening: Opening, page: PageState} | {problem: string}>}
 */
async function capture(devtools, url) {
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
    const args = [SEED, CLOCK_SECONDS, SAVED_GAME_KEY];
    await devtools.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: `(${String(preparePage)})(...${JSON.stringify(args)})` },
      sessionId,
    );
    await load(devtools, sessionId, "Page.navigate", { url });
    const opening = await evaluate(
      devtools,
      sessionId,
      playOpening,
      OPEN_SHARE,
    );
    if (opening.tripped !== 1) return { problem: "no mine was stepped on" };

    // The game saves itself as it goes; the reload takes the clock from it.
    await load(devtools, sessionId, "Page.reload");
    const page = await evaluate(devtools, sessionId, describePage);
    if (page.boards !== 1) return { problem: "the board did not show" };
    if (page.tripped !== 1) return { problem: "the game was not restored" };
    if (page.openDialogs > 0) return { problem: "a dialog is open" };

    const { data } = await devtools.send(
      "Page.captureScreenshot",
      { format: "png" },
      sessionId,
    );
    return { png: Buffer.from(data, "base64"), opening, page };
  } finally {
    await devtools.send("Target.disposeBrowserContext", { browserContextId });
  }
}

/**
 * Returns the options the command line sets.
 *
 * @returns {{url: string, chrome?: string} | undefined} Nothing when it asks
 *   only for help.
 */
function parseCommandLine() {
  const { values } = parseArgs({
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
  return { url: values.url, chrome: values.chrome };
}

async function main() {
  const options = parseCommandLine();
  if (!options) return;
  await fetch(options.url).catch(() => {
    throw new Error(
      `Nothing answers at ${options.url}; start the game with yarn dev.`,
    );
  });

  const profile = await mkdtemp(join(tmpdir(), "minesweeper-capture-"));
  const { chrome, endpoint } = await launchChrome(
    await findChrome(options.chrome),
    profile,
  );
  const exited = new Promise((resolve) => chrome.once("exit", resolve));
  try {
    const devtools = await DevToolsConnection.open(endpoint);
    const shot = await capture(devtools, options.url);
    devtools.close();
    if ("problem" in shot) {
      console.error(`Not captured: ${shot.problem}.`);
      process.exitCode = 1;
      return;
    }
    const { opening, page } = shot;
    console.log(
      `Cleared ${Math.round(opening.open * 100)}%, ${opening.flagged} flags, ` +
        `the clock at ${page.time}.`,
    );
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    for (const output of OUTPUTS) {
      const target = join(SCREENSHOT_DIR, output.file);
      await sharp(shot.png)
        .resize(output.width, output.height)
        .webp({ quality: output.quality })
        .toFile(target);
      const kilobytes = Math.round((await stat(target)).size / 1024);
      console.log(`${output.file}: ${kilobytes} KB`);
    }
  } finally {
    chrome.kill();
    await exited;
    await rm(profile, { recursive: true, force: true, maxRetries: 10 });
  }
}

await main();
