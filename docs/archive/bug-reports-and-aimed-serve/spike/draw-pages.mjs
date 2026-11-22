#!/usr/bin/env node
/**
 * Draws three games' pages with modern-screenshot and with snapdom, each
 * canvas swapped for a frame of it, beside Chrome's own screenshot, for the
 * choice of the library a bug report's picture is drawn with.
 *
 *   node docs/archive/bug-reports-and-aimed-serve/spike/draw-pages.mjs
 *
 * It downloads each library's browser build from npm, checked against the
 * registry's integrity, into a folder of its own; serves each game on port
 * 9102 in turn, from its own dev server; opens it in a headless Chrome at
 * 1280 × 720 at 1×; and writes a WebP of Chrome's screenshot and of each
 * library's picture beside this script, with `results.json`: how long each
 * library took, three times over, the first cold, and how much of its picture
 * differs from Chrome's.
 *
 * Both libraries draw the page as the report would: every `<dialog>` and
 * whatever shows nothing left out, and each canvas swapped for a frame of
 * it, taken in the frame after the one in flight, since a WebGL canvas keeps
 * its pixels only in the frame that drew them.
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import {
  withChrome,
  withPage,
} from "../../../../frontend/lib/dev/src/chrome.ts";

/** @import { Page } from "../../../../frontend/lib/dev/src/chrome.ts" */

const SPIKE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(SPIKE, "../../../../frontend");
const GAMES_FOLDER = join(FRONTEND, "games");
const PRETTIER = join(FRONTEND, "node_modules/.bin/prettier");

/** The frontend's sharp, which writes the pictures and compares them. */
const sharp = /** @type {typeof import("sharp")} */ (
  createRequire(join(FRONTEND, "package.json"))("sharp")
);

/** The port each game is served on in turn. */
const PORT = 9102;

/** The window each page is drawn in. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 1 };

/** How many times each library draws each page; the first is cold. */
const DRAWS = 3;

/**
 * How far a channel of a pixel may move, of 255, before the pixel counts as
 * drawn differently from Chrome's.
 */
const DIFFERENT_LEVELS = 48;

/** The WebP quality the pictures are kept at. */
const WEBP_QUALITY = 75;

/**
 * A library under trial: its name in the results, its package, the version,
 * and the file of its browser build in the package.
 *
 * @typedef {object} Library
 * @property {"modern-screenshot" | "snapdom"} name
 * @property {string} pkg
 * @property {string} version
 * @property {string} file
 */

/** @type {readonly Library[]} */
const LIBRARIES = [
  {
    name: "modern-screenshot",
    pkg: "modern-screenshot",
    version: "4.7.0",
    file: "package/dist/index.js",
  },
  {
    name: "snapdom",
    pkg: "@zumer/snapdom",
    version: "3.8.1",
    file: "package/dist/snapdom.js",
  },
];

/**
 * A game drawn: its folder under `frontend/games/`, and what the page shows
 * once it is ready to draw.
 *
 * @typedef {object} Game
 * @property {string} folder
 * @property {string} ready A selector.
 */

/** @type {readonly Game[]} */
const GAMES = [
  { folder: "brick-breaker", ready: 'fz-phaser-canvas[data-state="ready"]' },
  { folder: "sudoku", ready: "app-board" },
  { folder: "solitaire", ready: 'fz-phaser-canvas[data-state="ready"]' },
];

/**
 * Fetches a URL, throwing unless it answers with what was asked for.
 *
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function fetched(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response;
}

/**
 * Downloads a library's package from npm into a folder of its own, checks it
 * against the registry's integrity, and returns its browser build's source.
 *
 * @param {Library} library
 * @param {string} folder
 * @returns {Promise<string>}
 */
async function download(library, folder) {
  const meta = /** @type {{dist: {tarball: string, integrity: string}}} */ (
    await (
      await fetched(
        `https://registry.npmjs.org/${library.pkg}/${library.version}`,
      )
    ).json()
  );
  const tarball = Buffer.from(
    await (await fetched(meta.dist.tarball)).arrayBuffer(),
  );
  const [algorithm, digest] = meta.dist.integrity.split("-", 2);
  const actual = createHash(algorithm ?? "sha512")
    .update(tarball)
    .digest("base64");
  if (actual !== digest) {
    throw new Error(`${library.pkg} didn't match the registry's integrity`);
  }
  execFileSync("tar", ["-xzf", "-", "-C", folder], { input: tarball });
  return readFile(join(folder, library.file), "utf8");
}

/**
 * Starts a game's dev server on {@link PORT}, and resolves once it answers,
 * failing if it ends first, as it does where the port is taken.
 *
 * @param {Game} game
 * @returns {Promise<() => void>} What stops it.
 */
async function serve(game) {
  const server = spawn(
    "npx",
    ["-y", "corepack", "yarn", "dev", "--port", String(PORT), "--strictPort"],
    { cwd: join(GAMES_FOLDER, game.folder), detached: true, stdio: "ignore" },
  );
  let ended = false;
  server.on("exit", () => {
    ended = true;
  });
  const stop = () => {
    if (ended || server.pid === undefined) return;
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // The server's group ended on its own meanwhile.
    }
  };
  for (let tries = 0; tries < 120 && !ended; tries++) {
    // Node's fetch dials localhost's IPv4 address, and the server may listen
    // on its IPv6 one alone, where Chrome finds it.
    for (const host of ["127.0.0.1", "[::1]"]) {
      try {
        if ((await fetch(`http://${host}:${PORT}/`)).ok) return stop;
      } catch {
        // Not up yet, or not on this address.
      }
    }
    await sleep(500);
  }
  stop();
  throw new Error(
    `${game.folder}'s dev server ${ended ? "ended" : "didn't answer"}`,
  );
}

/**
 * Waits for an element in the page, and says whether it came.
 *
 * @param {string} selector
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function waitFor(selector, timeoutMs) {
  const end = performance.now() + timeoutMs;
  while (performance.now() < end) {
    if (document.querySelector(selector)) return true;
    await new Promise((done) => setTimeout(done, 100));
  }
  return false;
}

/**
 * Takes a frame of every canvas in the page, as a PNG's data URL, and marks
 * the element each is drawn in with its frame's number. It runs in the page.
 *
 * Each frame is read in an animation frame asked for after the game's own,
 * so it runs once the game has drawn and before the browser clears the
 * canvas.
 *
 * @returns {Promise<string[]>}
 */
async function takeFrames() {
  const canvases = [...document.querySelectorAll("canvas")];
  return Promise.all(
    canvases.map(
      (canvas, index) =>
        /** @type {Promise<string>} */ (
          new Promise((done) => {
            setTimeout(() => {
              requestAnimationFrame(() => {
                const copy = document.createElement("canvas");
                copy.width = canvas.width;
                copy.height = canvas.height;
                copy.getContext("2d")?.drawImage(canvas, 0, 0);
                canvas.parentElement?.setAttribute(
                  "data-spike-frame",
                  String(index),
                );
                done(copy.toDataURL("image/png"));
              });
            });
          })
        ),
    ),
  );
}

/**
 * The globals {@link LIBRARIES}' builds set in a page, as far as they're
 * called here.
 *
 * @typedef {object} PageLibraries
 * @property {{domToBlob: (node: Node, options: object) => Promise<Blob>}} modernScreenshot
 * @property {(node: Node, options: object) => Promise<{toCanvas: () => Promise<HTMLCanvasElement>}>} snapdom
 */

/**
 * Draws the page with a library, as the report would, and returns its PNG
 * as a data URL with how long the library took. It runs in the page, where
 * {@link LIBRARIES}' builds have set `modernScreenshot` and `snapdom`.
 *
 * @param {"modern-screenshot" | "snapdom"} library
 * @param {readonly string[]} frames
 * @returns {Promise<{ms: number, png: string}>}
 */
async function drawWith(library, frames) {
  const MARK = "data-spike-frame";
  /**
   * @param {Node} node
   * @returns {boolean}
   */
  const keep = (node) => {
    if (!(node instanceof Element)) return true;
    if (node instanceof HTMLDialogElement) return false;
    // The canvas is swapped for its frame, so a library needn't draw it first.
    if (node.parentElement?.hasAttribute(MARK)) return false;
    return getComputedStyle(node).display !== "none";
  };
  /**
   * Swaps a copy of an element a canvas is drawn in for its frame, laid as
   * its background: an image put in its place, snapdom draws blurred.
   *
   * @param {Element} copy
   */
  const swap = (copy) => {
    const frame = frames[Number(copy.getAttribute(MARK))];
    if (frame === undefined || !(copy instanceof HTMLElement)) return;
    copy.replaceChildren();
    copy.style.background = `url("${frame}") 0 0 / 100% 100% no-repeat`;
  };
  // The libraries' builds set globals the DOM's types don't declare.
  const page = /** @type {PageLibraries} */ (/** @type {unknown} */ (window));
  // The page's own background, which the browser paints behind the whole
  // window from the root, or from the body where the root has none, and a
  // copy of the root paints only behind the root's box.
  /**
   * @param {Element} element
   * @returns {string}
   */
  const backgroundOf = (element) => getComputedStyle(element).backgroundColor;
  const rootBackground = backgroundOf(document.documentElement);
  const backgroundColor =
    rootBackground === "rgba(0, 0, 0, 0)"
      ? backgroundOf(document.body)
      : rootBackground;
  const start = performance.now();
  /** @type {Blob} */
  let blob;
  if (library === "modern-screenshot") {
    blob = await page.modernScreenshot.domToBlob(document.documentElement, {
      width: innerWidth,
      height: innerHeight,
      scale: 1,
      type: "image/png",
      backgroundColor,
      filter: keep,
      /** @param {Node} cloned */
      onCloneEachNode: (cloned) => {
        if (cloned instanceof Element && cloned.hasAttribute(MARK)) {
          swap(cloned);
        }
      },
    });
  } else {
    const result = await page.snapdom(document.documentElement, {
      dpr: 1,
      backgroundColor,
      filter: keep,
      filterMode: "remove",
      plugins: [
        {
          name: "frames",
          /** @param {{clone?: Element | null}} context */
          afterClone: (context) => {
            for (const marked of context.clone?.querySelectorAll(`[${MARK}]`) ??
              []) {
              swap(marked);
            }
          },
        },
      ],
    });
    // Its own PNG encoder takes several times as long as the browser's.
    const canvas = await result.toCanvas();
    blob = await /** @type {Promise<Blob>} */ (
      new Promise((done, fail) => {
        canvas.toBlob((png) => {
          if (png) done(png);
          else fail(new Error("The canvas couldn't be encoded"));
        }, "image/png");
      })
    );
  }
  const ms = performance.now() - start;
  const png = await new Promise((done) => {
    const reader = new FileReader();
    reader.onload = () => {
      done(String(reader.result));
    };
    reader.readAsDataURL(blob);
  });
  return { ms, png };
}

/**
 * Returns the share of pixels in a picture that differ from Chrome's by more
 * than {@link DIFFERENT_LEVELS} in a channel, laid on white as a viewer
 * shows it, with their mean difference, and the share it leaves transparent.
 * It throws for a picture of another size than Chrome's.
 *
 * @param {Buffer} picture A PNG.
 * @param {Buffer} chrome A PNG.
 * @returns {Promise<{differing: number, meanLevels: number, transparent: number}>}
 */
async function differenceFrom(picture, chrome) {
  const [drawn, shown] = await Promise.all([
    sharp(picture).metadata(),
    sharp(chrome).metadata(),
  ]);
  if (drawn.width !== shown.width || drawn.height !== shown.height) {
    throw new Error(
      `A picture of ${drawn.width} x ${drawn.height} isn't Chrome's ${shown.width} x ${shown.height}`,
    );
  }
  /**
   * @param {Buffer} png
   * @returns {Promise<Buffer>}
   */
  const raw = (png) =>
    sharp(png).flatten({ background: "#ffffff" }).raw().toBuffer();
  const alpha = await sharp(picture)
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer();
  const [a, b] = await Promise.all([raw(picture), raw(chrome)]);
  let differing = 0;
  let total = 0;
  for (let i = 0; i < a.length; i += 3) {
    const moved = Math.max(
      Math.abs((a[i] ?? 0) - (b[i] ?? 0)),
      Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)),
      Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0)),
    );
    total += moved;
    if (moved > DIFFERENT_LEVELS) differing++;
  }
  const pixels = a.length / 3;
  const transparent = alpha.filter((level) => level < 255).length;
  return {
    differing: Number((differing / pixels).toFixed(4)),
    meanLevels: Number((total / pixels).toFixed(2)),
    transparent: Number((transparent / alpha.length).toFixed(4)),
  };
}

/**
 * Writes a PNG as a WebP beside this script.
 *
 * @param {string} name
 * @param {Buffer} png
 * @returns {Promise<void>}
 */
async function writeWebp(name, png) {
  await sharp(png)
    .webp({ quality: WEBP_QUALITY })
    .toFile(join(SPIKE, `${name}.webp`));
}

/**
 * Draws one game's page with Chrome and with each library, and returns what
 * it measured.
 *
 * @param {Page} page
 * @param {Game} game
 * @param {ReadonlyMap<string, string>} sources Each library's build, by name.
 * @returns {Promise<Record<string, unknown>>}
 */
async function drawGame(page, game, sources) {
  await page.navigate(`http://localhost:${PORT}/`);
  if (!(await page.evaluate(waitFor, game.ready, 30_000))) {
    throw new Error(`${game.folder} never showed ${game.ready}`);
  }
  await sleep(1500);
  for (const source of sources.values()) {
    await page.send("Runtime.evaluate", { expression: source });
  }
  const chrome = await page.screenshot();
  await writeWebp(`${game.folder}-chrome`, chrome);
  const framesStart = performance.now();
  const frames = await page.evaluate(takeFrames);
  /** @type {Record<string, unknown>} */
  const measured = {
    canvases: frames.length,
    framesMs: Math.round(performance.now() - framesStart),
  };
  for (const library of LIBRARIES) {
    const times = [];
    let png = Buffer.alloc(0);
    for (let draw = 0; draw < DRAWS; draw++) {
      const drawn = await page.evaluate(drawWith, library.name, frames);
      times.push(Math.round(drawn.ms));
      png = Buffer.from(drawn.png.slice(drawn.png.indexOf(",") + 1), "base64");
    }
    await writeWebp(`${game.folder}-${library.name}`, png);
    measured[library.name] = {
      ms: times,
      pngBytes: png.length,
      ...(await differenceFrom(png, chrome)),
    };
  }
  return measured;
}

const downloads = await mkdtemp(join(tmpdir(), "draw-pages-"));
try {
  /** @type {Map<string, string>} */
  const sources = new Map();
  for (const library of LIBRARIES) {
    const folder = await mkdtemp(join(downloads, `${library.name}-`));
    sources.set(library.name, await download(library, folder));
  }
  /** @type {Record<string, unknown>} */
  const results = {};
  await withChrome({ name: "draw-pages" }, async (devtools) => {
    for (const game of GAMES) {
      const stop = await serve(game);
      try {
        results[game.folder] = await withPage(devtools, VIEWPORT, (page) =>
          drawGame(page, game, sources),
        );
        console.log(game.folder, JSON.stringify(results[game.folder]));
      } finally {
        stop();
        await sleep(1000);
      }
    }
  });
  const file = join(SPIKE, "results.json");
  await writeFile(file, `${JSON.stringify(results, null, 2)}\n`);
  // Formatted as the repository checks every file under docs/.
  execFileSync(PRETTIER, ["--write", file], { stdio: "ignore" });
} finally {
  await rm(downloads, { recursive: true, force: true });
}
