#!/usr/bin/env node
/// <reference lib="dom" />
/**
 * Checks each game's bug report end to end, on its build in headless
 * Chrome: Report a bug in the settings opens the report with a picture of
 * the page that isn't blank, Open GitHub's link carries a state that its
 * tag unpacks, and the game's loader at `?debug` takes that state back
 * without an error. It prints how long each report took to open, from the
 * press, the most its picture can have taken, and how large the picture's
 * PNG is, and marks one over the picture's budget, a second and 300 KB,
 * which fails nothing, as a loaded machine is slower.
 *
 *   node tools/check-report.mjs [options] [game ...]
 *
 * It checks the games named by their folders under `games/`, or every game
 * that provides `BUG_REPORT_SOURCE`, one at a time: builds it as its
 * `yarn build` does, with its own Vite, and serves the build on a port.
 *
 * The functions it sends to the page need the DOM's types, which the
 * scripts' config leaves out, hence the reference above.
 */
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { PHASER_CANVAS_READY, PHASER_CANVAS_SETTLED } from "@fz/dev/board-page";
import { withChrome, withPage } from "@fz/dev/chrome";
import {
  CONSOLE,
  isStop,
  misread,
  readArgs,
  readCount,
  stopWith,
} from "@fz/dev/script";
import {
  packedTag,
  unpackState,
} from "../lib/game-ui/src/bug_report/packed.ts";

/** @import { DevToolsConnection, Page, PageFunction, Viewport } from "@fz/dev/chrome" */
/** @import { Printer } from "@fz/dev/script" */

/** The folder that holds each game's workspace. */
export const GAMES_FOLDER = join(import.meta.dirname, "../games");

/** The port each game's build is served on, in turn, unless told another. */
const PORT = 9113;

/**
 * The longest a picture should take, in milliseconds, which a report's time
 * to open, from the press, is held to as the most the picture can take.
 */
export const BUDGET_MS = 1000;

/** The most a picture's PNG at 1280 × 720 should weigh, in bytes. */
export const BUDGET_BYTES = 300_000;

/** How many reports each page opens; the first loads snapdom, cold. */
const REPORTS = 3;

/** How long the page has to show a game, or a report, before it fails. */
const WAIT_MS = 30_000;

/** The windows each game is checked in: a desktop's, at 1× and at 2×. */
const VIEWPORTS = /** @type {const} */ ([
  { width: 1280, height: 720, deviceScaleFactor: 1 },
  { width: 1280, height: 720, deviceScaleFactor: 2 },
]);

/** What a game's code says as it provides its reports. */
const PROVIDES_SOURCE = /\bprovide:\s*BUG_REPORT_SOURCE\b/;

/** The id of the issue form's field that carries the game's state. */
const STATE_FIELD = "game-state";

/** The fewest colors a picture, or a canvas's part of it, has unless blank. */
const FEWEST_COLORS = 3;

const USAGE = `Usage: node tools/check-report.mjs [options] [game ...]

Checks each game's bug report in headless Chrome, on its build: the report
opens from the settings with a picture that isn't blank, its link carries a
state that unpacks, and the loader at ?debug takes the state back. It takes
games by their folders under games/; without any, it checks every game that
provides BUG_REPORT_SOURCE.

Options:
  --built          Check the builds in each game's dist/, without building.
  --port <n>       The port to serve each build on (${PORT}).
  --chrome <path>  The Chrome to run, else CHROME_PATH or the usual place.
  -h, --help       Show this help.`;

/**
 * Describes a picture a report took, as the page read it back.
 *
 * @typedef {object} Picture
 * @property {number} bytes The PNG's size.
 * @property {number} width
 * @property {number} height
 * @property {number} colors How many colors it shows, counted to a limit.
 * @property {number[]} boards How many colors each canvas's part of it shows.
 */

/**
 * Describes a report the page couldn't open, or read, and why.
 *
 * @typedef {object} ReportFailure
 * @property {string} problem
 */

/**
 * Describes a report the page opened: how long it took to show, from the
 * press, its picture, and Open GitHub's link.
 *
 * @typedef {object} ReportRead
 * @property {number} ms
 * @property {Picture | null} picture
 * @property {string} url
 */

/** @typedef {ReportFailure | ReportRead} OpenedReport */

/**
 * The part of a game's own Vite the check serves its build with.
 *
 * @typedef {object} GameVite
 * @property {(config: object) => Promise<{close: () => Promise<void>}>} preview
 */

/**
 * Describes what the loader made of a state: whether the game took it, what
 * the loader said where it didn't, and the question the game asked first.
 *
 * @typedef {object} Loading
 * @property {string} [problem]
 * @property {string | null} [asked]
 */

/**
 * Describes what one game's check found: what is wrong, and what it
 * measured, each a line to print.
 *
 * @typedef {object} GameCheck
 * @property {string[]} problems
 * @property {string[]} measured
 */

/**
 * Returns the folders under `games/` of every game whose code, outside its
 * specs, provides `BUG_REPORT_SOURCE`, in order.
 *
 * @param {string} gamesFolder
 * @returns {Promise<string[]>}
 */
export async function gamesTakingReports(gamesFolder) {
  /** @type {string[]} */
  const found = [];
  for (const game of await readdir(gamesFolder, { withFileTypes: true })) {
    if (!game.isDirectory()) continue;
    const src = join(gamesFolder, game.name, "src");
    const files = await readdir(src, { recursive: true }).catch(() => []);
    for (const file of files) {
      if (!file.endsWith(".ts") || file.endsWith(".spec.ts")) continue;
      if (PROVIDES_SOURCE.test(await readFile(join(src, file), "utf8"))) {
        found.push(game.name);
        break;
      }
    }
  }
  return found.sort();
}

/**
 * Reads the title and the game-state field from the link Open GitHub
 * carries.
 *
 * @param {string} url
 * @returns {{title: string, state: string}}
 */
export function issueFields(url) {
  const { searchParams } = new URL(url);
  return {
    title: searchParams.get("title") ?? "",
    state: searchParams.get(STATE_FIELD) ?? "",
  };
}

/**
 * Returns what is wrong with a report's link: a title other than the
 * game's name in brackets, or a state that no tag unpacks.
 *
 * @param {string} url
 * @param {string} name The game's name, as its build's `game.json` gives it.
 * @returns {Promise<string[]>}
 */
export async function linkProblems(url, name) {
  const { title, state } = issueFields(url);
  /** @type {string[]} */
  const problems = [];
  if (title !== `[${name}] `) {
    problems.push(`The issue's title is "${title}", not "[${name}] ".`);
  }
  const tag = packedTag(state);
  if (tag === undefined) {
    problems.push("Open GitHub's link carries no game state.");
    return problems;
  }
  try {
    await unpackState(tag, state);
  } catch (error) {
    problems.push(
      `The link's state doesn't unpack: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return problems;
}

/**
 * Returns the line that says how long a page's reports took to open, from
 * the press, and how large the largest picture was, each over the budget
 * marked so.
 *
 * @param {Viewport} viewport
 * @param {readonly ReportRead[]} reports
 * @returns {string}
 */
export function measuredLine(viewport, reports) {
  const times = reports.map(({ ms }) => String(Math.round(ms)));
  const slow = reports.some(({ ms }) => ms > BUDGET_MS)
    ? ", over the second"
    : "";
  const [largest] = reports
    .flatMap(({ picture }) => (picture ? [picture] : []))
    .sort((a, b) => b.bytes - a.bytes);
  const size = largest
    ? `, PNG ${String(Math.round(largest.bytes / 1000))} KB at ${String(largest.width)} × ${String(largest.height)}${largest.bytes > BUDGET_BYTES ? ", over 300 KB" : ""}`
    : "";
  return `${String(viewport.deviceScaleFactor)}×: report in ${times.join(" · ")} ms${slow}${size}`;
}

/**
 * Returns what is wrong with a report a page opened at a viewport.
 *
 * @param {Viewport} viewport
 * @param {OpenedReport} report
 * @returns {string[]}
 */
export function reportProblems(viewport, report) {
  if ("problem" in report) return [report.problem];
  const { picture } = report;
  if (!picture) return ["The report opened with no picture."];
  /** @type {string[]} */
  const problems = [];
  if (picture.width !== viewport.width || picture.height !== viewport.height) {
    problems.push(
      `The picture is ${String(picture.width)} × ${String(picture.height)}, not the window's ${String(viewport.width)} × ${String(viewport.height)}.`,
    );
  }
  if (picture.colors < FEWEST_COLORS) problems.push("The picture is blank.");
  picture.boards.forEach((colors, index) => {
    if (colors < FEWEST_COLORS) {
      problems.push(`Canvas ${String(index + 1)} is blank in the picture.`);
    }
  });
  return problems;
}

/**
 * Returns the name a screen reader gives an element, as far as the games'
 * controls and dialogs give one: its label, the text it is labelled by, its
 * text, or its title. It runs in the page.
 *
 * @param {Element} element
 * @returns {string}
 */
function accessibleName(element) {
  const words = (/** @type {string | null | undefined} */ text) =>
    (text ?? "").replace(/\s+/g, " ").trim();
  const label = element.getAttribute("aria-label");
  if (label) return words(label);
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    return words(
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent)
        .join(" "),
    );
  }
  return words(element.textContent) || words(element.getAttribute("title"));
}

/**
 * Returns the first element under `root` that matches a selector, shows,
 * and has a name, or null. It runs in the page.
 *
 * @param {ParentNode} root
 * @param {string} selector
 * @param {string} name
 * @returns {HTMLElement | null}
 */
function shownNamed(root, selector, name) {
  for (const element of root.querySelectorAll(selector)) {
    if (
      element instanceof HTMLElement &&
      element.getClientRects().length > 0 &&
      accessibleName(element) === name
    ) {
      return element;
    }
  }
  return null;
}

/**
 * Returns the open dialog with a name, or null. It runs in the page.
 *
 * @param {string} name
 * @returns {HTMLDialogElement | null}
 */
function openDialog(name) {
  for (const dialog of document.querySelectorAll("dialog[open]")) {
    if (
      dialog instanceof HTMLDialogElement &&
      accessibleName(dialog) === name
    ) {
      return dialog;
    }
  }
  return null;
}

/**
 * Resolves to what `look` finds, once it finds something, looking every 10
 * milliseconds, or to null once `timeoutMs` has passed. It runs in the page.
 *
 * @template T
 * @param {() => T | null} look
 * @param {number} timeoutMs
 * @returns {Promise<T | null>}
 */
function waitFor(look, timeoutMs) {
  const end = performance.now() + timeoutMs;
  return new Promise((resolve) => {
    const again = () => {
      const found = look();
      if (found !== null) resolve(found);
      else if (performance.now() > end) resolve(null);
      else setTimeout(again, 10);
    };
    again();
  });
}

/**
 * Opens the settings, failing where it can't, and returns the drawer. It
 * runs in the page.
 *
 * @param {number} timeoutMs
 * @returns {Promise<HTMLDialogElement>}
 */
async function openSettings(timeoutMs) {
  const button = shownNamed(document, "button", "Settings");
  if (!button) throw new Error("The page has no Settings button.");
  button.click();
  const drawer = await waitFor(() => openDialog("Settings"), timeoutMs);
  if (!drawer) throw new Error("The settings didn't open.");
  return drawer;
}

/**
 * Waits for the game to show, its Settings button there and every canvas
 * board drawn or failed, then, once its fonts have loaded, gives it a
 * second and a half to settle, so the first picture's time isn't the
 * game's start's. It resolves to what went wrong, or to "" once the game
 * shows. It runs in the page.
 *
 * @param {string} ready Matches a board drawn.
 * @param {string} settled Matches a board drawn or failed.
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
async function waitForGame(ready, settled, timeoutMs) {
  const boards = () => document.querySelectorAll("fz-phaser-canvas").length;
  const shown = await waitFor(
    () =>
      shownNamed(document, "button", "Settings") &&
      document.querySelectorAll(settled).length === boards()
        ? true
        : null,
    timeoutMs,
  );
  if (!shown) return "The game never showed.";
  if (document.querySelectorAll(ready).length < boards()) {
    return "A board failed to draw.";
  }
  await document.fonts.ready;
  await new Promise((done) => setTimeout(done, 1500));
  return "";
}

/**
 * Reads a picture back: its size, its dimensions, and how many colors it
 * shows, in all and in each canvas's part of the page. It counts colors
 * four bits a channel, and stops at a few, as it asks only whether the
 * picture is blank. It runs in the page.
 *
 * @param {HTMLImageElement} image
 * @returns {Promise<Picture>}
 */
async function readPicture(image) {
  const blob = await (await fetch(image.src)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The page can't read the picture back.");
  context.drawImage(bitmap, 0, 0);
  const colorsIn = (
    /** @type {number} */ x,
    /** @type {number} */ y,
    /** @type {number} */ width,
    /** @type {number} */ height,
  ) => {
    if (width < 1 || height < 1) return 0;
    const { data } = context.getImageData(x, y, width, height);
    const seen = new Set();
    for (let i = 0; i < data.length && seen.size < 16; i += 4) {
      seen.add(
        ((data[i] ?? 0) >> 4) |
          (((data[i + 1] ?? 0) >> 4) << 4) |
          (((data[i + 2] ?? 0) >> 4) << 8) |
          (((data[i + 3] ?? 0) >> 4) << 12),
      );
    }
    return seen.size;
  };
  const boards = [...document.querySelectorAll("canvas")]
    .filter(
      (board) => !board.closest("dialog") && board.getClientRects().length,
    )
    .map((board) => {
      const box = board.getBoundingClientRect();
      const left = Math.max(0, Math.round(box.left));
      const top = Math.max(0, Math.round(box.top));
      const right = Math.min(bitmap.width, Math.round(box.right));
      const bottom = Math.min(bitmap.height, Math.round(box.bottom));
      return colorsIn(left, top, right - left, bottom - top);
    });
  return {
    bytes: blob.size,
    width: bitmap.width,
    height: bitmap.height,
    colors: colorsIn(0, 0, bitmap.width, bitmap.height),
    boards,
  };
}

/**
 * Opens a report from the settings, as a player does, reads it, and closes
 * it again. It times the report from the press to its dialog showing, the
 * most its picture can have taken. It runs in the page.
 *
 * @param {number} timeoutMs
 * @returns {Promise<OpenedReport>}
 */
async function openReport(timeoutMs) {
  try {
    const drawer = await openSettings(timeoutMs);
    const button = shownNamed(drawer, "button", "Report a bug");
    if (!button) return { problem: "The settings offer no Report a bug." };
    const pressed = performance.now();
    button.click();
    const dialog = await waitFor(() => openDialog("Report a bug"), timeoutMs);
    const ms = performance.now() - pressed;
    if (!dialog) return { problem: "The report didn't open." };
    const link = [...dialog.querySelectorAll("a")].find((a) =>
      accessibleName(a).startsWith("Open GitHub"),
    );
    if (!link) return { problem: "The report has no Open GitHub link." };
    const image = dialog.querySelector("img");
    const picture = image ? await readPicture(image) : null;
    shownNamed(dialog, "button", "Close bug report")?.click();
    if (
      !(await waitFor(
        () => (openDialog("Report a bug") ? null : true),
        timeoutMs,
      ))
    ) {
      return { problem: "The report didn't close." };
    }
    return { ms, picture, url: link.href };
  } catch (error) {
    return { problem: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Pastes a state into the loader in the settings and loads it, answering
 * yes where the game asks first, then waits for the settings to close, as
 * a loaded state closes them, or for the loader to say why not. It runs in
 * the page.
 *
 * @param {string} state
 * @param {number} timeoutMs
 * @returns {Promise<Loading>}
 */
async function loadState(state, timeoutMs) {
  try {
    const drawer = await openSettings(timeoutMs);
    const label = shownNamed(drawer, "label", "Load game state");
    const field = label instanceof HTMLLabelElement ? label.control : null;
    if (!(field instanceof HTMLTextAreaElement)) {
      return { problem: "The settings at ?debug offer no Load game state." };
    }
    const loader = field.closest("fz-bug-report-loader");
    const load = loader && shownNamed(loader, "button", "Load");
    if (!load) return { problem: "The loader has no Load button." };
    field.value = state;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    load.click();
    /** @type {string | null} */
    let asked = null;
    const said = await waitFor(() => {
      const question = document.querySelector(
        'dialog[open][role="alertdialog"]',
      );
      if (question && asked === null) {
        asked = accessibleName(question);
        [...question.querySelectorAll("button")].at(-1)?.click();
        return null;
      }
      const problem = loader
        .querySelector('[role="status"]')
        ?.textContent?.trim();
      if (problem) return problem;
      return openDialog("Settings") ? null : "";
    }, timeoutMs);
    if (said === null) {
      return { problem: "The loader neither loaded the state nor said why." };
    }
    return said ? { problem: `The loader said: ${said}`, asked } : { asked };
  } catch (error) {
    return { problem: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The functions the page's functions call by their names.
 *
 * @type {readonly PageFunction[]}
 */
const PAGE_HELPERS = [
  accessibleName,
  shownNamed,
  openDialog,
  waitFor,
  openSettings,
  readPicture,
];

/**
 * Notes, from now on, every error a page throws or logs, and every request
 * it makes to another origin than `origin`, as a picture loads only what
 * the game serves.
 *
 * @param {Page} page
 * @param {string} origin
 * @returns {Promise<string[]>} What it notes, which grows as the page runs.
 */
async function watchPage(page, origin) {
  /** @type {string[]} */
  const noted = [];
  page.on("Runtime.exceptionThrown", (params) => {
    const { exceptionDetails } =
      /** @type {{exceptionDetails: {text: string, exception?: {description?: string}}}} */ (
        params
      );
    noted.push(
      `The page threw: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`,
    );
  });
  page.on("Runtime.consoleAPICalled", (params) => {
    const { type, args } =
      /** @type {{type: string, args: {value?: unknown, description?: string}[]}} */ (
        params
      );
    if (type !== "error") return;
    const words = args.map((arg) => arg.description ?? String(arg.value));
    noted.push(`The page logged an error: ${words.join(" ")}`);
  });
  page.on("Log.entryAdded", (params) => {
    const { entry } =
      /** @type {{entry: {level: string, text: string, url?: string}}} */ (
        params
      );
    if (entry.level !== "error") return;
    noted.push(
      `The browser said: ${entry.text}${entry.url ? ` (${entry.url})` : ""}`,
    );
  });
  page.on("Network.requestWillBeSent", (params) => {
    const { request } = /** @type {{request: {url: string}}} */ (params);
    const { protocol, origin: from } = new URL(request.url);
    if (protocol === "data:" || protocol === "blob:" || from === origin) return;
    noted.push(`The page loaded from another origin: ${request.url}`);
  });
  await page.send("Runtime.enable");
  await page.send("Log.enable");
  await page.send("Network.enable");
  return noted;
}

/**
 * Waits for a game's page to show, and resolves to what went wrong, or to ""
 * once it shows.
 *
 * @param {Page} page
 * @returns {Promise<string>}
 */
function showGame(page) {
  return page.evaluateWith(
    PAGE_HELPERS,
    waitForGame,
    PHASER_CANVAS_READY,
    PHASER_CANVAS_SETTLED,
    WAIT_MS,
  );
}

/**
 * Opens a game at a viewport and has it open {@link REPORTS} reports, and
 * returns what each found, with anything the page threw or logged.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @param {Viewport} viewport
 * @returns {Promise<{reports: OpenedReport[], noted: string[]}>}
 */
function openReports(devtools, url, viewport) {
  return withPage(devtools, viewport, async (page) => {
    const noted = await watchPage(page, new URL(url).origin);
    await page.navigate(url);
    const problem = await showGame(page);
    if (problem) return { reports: [{ problem }], noted };
    /** @type {OpenedReport[]} */
    const reports = [];
    for (let report = 0; report < REPORTS; report++) {
      const opened = await page.evaluateWith(PAGE_HELPERS, openReport, WAIT_MS);
      reports.push(opened);
      if ("problem" in opened) break;
    }
    return { reports, noted };
  });
}

/**
 * Opens a game at `?debug` and loads a reported state into it through the
 * loader, and returns what it found, with anything the page threw or
 * logged.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @param {string} state The report's whole game-state field.
 * @returns {Promise<{loading: Loading, noted: string[]}>}
 */
function loadReported(devtools, url, state) {
  const [viewport] = VIEWPORTS;
  return withPage(devtools, viewport, async (page) => {
    const noted = await watchPage(page, new URL(url).origin);
    await page.navigate(new URL("?debug", url).href);
    const problem = await showGame(page);
    if (problem) {
      return { loading: { problem: `At ?debug: ${problem}` }, noted };
    }
    const loading = await page.evaluateWith(
      PAGE_HELPERS,
      loadState,
      state,
      WAIT_MS,
    );
    return { loading, noted };
  });
}

/**
 * Checks one game's report on its build, served at `url`: at each viewport,
 * the reports it opens and their pictures; then the first report's link,
 * its title against the game's name, and the loader taking its state back.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @param {string} name The game's name, as its build's `game.json` gives it.
 * @returns {Promise<GameCheck>}
 */
export async function checkGame(devtools, url, name) {
  /** @type {string[]} */
  const problems = [];
  /** @type {string[]} */
  const measured = [];
  /** @type {string | undefined} */
  let link;
  for (const viewport of VIEWPORTS) {
    const { reports, noted } = await openReports(devtools, url, viewport);
    const at = `At ${String(viewport.deviceScaleFactor)}×: `;
    for (const report of reports) {
      problems.push(...reportProblems(viewport, report).map((p) => at + p));
    }
    problems.push(...noted.map((p) => at + p));
    /** @type {ReportRead[]} */
    const read = [];
    for (const report of reports) {
      if (!("problem" in report)) read.push(report);
    }
    if (read.length === reports.length) {
      measured.push(measuredLine(viewport, read));
    }
    link ??= read[0]?.url;
  }
  if (link === undefined) return { problems: [...new Set(problems)], measured };
  problems.push(...(await linkProblems(link, name)));
  const { state } = issueFields(link);
  const { loading, noted } = await loadReported(devtools, url, state);
  if (loading.problem !== undefined) problems.push(loading.problem);
  problems.push(...noted.map((p) => `At ?debug: ${p}`));
  measured.push(
    `link: state of ${String(state.length)} characters, ${loading.problem === undefined ? "loaded back" : "not loaded"} at ?debug${loading.asked ? `, asking "${loading.asked}" first` : ""}`,
  );
  return { problems: [...new Set(problems)], measured };
}

/**
 * Returns a game's name as its build's `game.json` gives it, which the
 * issue's title starts with.
 *
 * @param {string} root The game's workspace folder.
 * @returns {Promise<string>}
 */
async function builtName(root) {
  const manifest = /** @type {{name?: unknown}} */ (
    JSON.parse(await readFile(join(root, "dist/game.json"), "utf8"))
  );
  if (typeof manifest.name !== "string") {
    throw new Error("The build's game.json names no game.");
  }
  return manifest.name;
}

/**
 * Builds a game as its `yarn build` does, with its own Vite, and resolves
 * once it has, or rejects with what the build printed.
 *
 * @param {string} root The game's workspace folder.
 * @returns {Promise<void>}
 */
function build(root) {
  const vite = join(
    dirname(
      createRequire(join(root, "package.json")).resolve("vite/package.json"),
    ),
    "bin/vite.js",
  );
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [vite, "build"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    /** @type {Buffer[]} */
    const printed = [];
    child.stdout.on("data", (chunk) => printed.push(chunk));
    child.stderr.on("data", (chunk) => printed.push(chunk));
    child.on("error", fail);
    child.on("close", (code) => {
      if (code === 0) done();
      else
        fail(
          new Error(`The build failed:\n${Buffer.concat(printed).toString()}`),
        );
    });
  });
}

/**
 * Serves a game's build on a port, as `yarn preview` does, with its own
 * Vite, and returns its address and what stops it.
 *
 * @param {string} root The game's workspace folder.
 * @param {number} port
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
async function serve(root, port) {
  /** @type {GameVite} */
  const vite = await import(
    pathToFileURL(createRequire(join(root, "package.json")).resolve("vite"))
      .href
  );
  // The loopback address itself, not `localhost`, which can name ::1 to the
  // server and 127.0.0.1 to a client dialing it.
  const server = await vite.preview({
    root,
    logLevel: "silent",
    preview: { host: "127.0.0.1", port, strictPort: true, open: false },
  });
  return {
    url: `http://127.0.0.1:${String(port)}/`,
    close: () => server.close(),
  };
}

/**
 * Says what {@link runReportCheck} runs on, where a caller stands in for
 * the process's.
 *
 * @typedef {object} ReportCheckOptions
 * @property {readonly string[]} [args] The command line, the process's by default.
 * @property {string} [gamesFolder]
 * @property {(line: string) => void} [print]
 * @property {(line: string) => void} [printError]
 */

/**
 * Runs the check from its command line, and returns the code to exit with:
 * 0 where every game's report holds, 1 where one doesn't or it finds no
 * game, 2 for a command line it can't read.
 *
 * @param {ReportCheckOptions} [options]
 * @returns {Promise<number>}
 */
export async function runReportCheck({
  args = process.argv.slice(2),
  gamesFolder = GAMES_FOLDER,
  print = CONSOLE.print,
  printError = CONSOLE.printError,
} = {}) {
  /** @type {Printer} */
  const printer = { print, printError };
  const read = readArgs(args, {
    options: {
      built: { type: "boolean" },
      port: { type: "string" },
      chrome: { type: "string" },
    },
    allowPositionals: true,
    usage: USAGE,
  });
  if (isStop(read)) return stopWith(read, printer);
  const port = readCount("port", read.values.port, USAGE) ?? PORT;
  if (isStop(port)) return stopWith(port, printer);
  if (port > 65_535) {
    return stopWith(
      misread(`--port takes a port, not "${String(port)}".`, USAGE),
      printer,
    );
  }
  const folders = (await readdir(gamesFolder, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const games =
    read.positionals.length > 0
      ? [...read.positionals]
      : await gamesTakingReports(gamesFolder);
  const unknown = games.filter((game) => !folders.includes(game));
  if (unknown.length > 0) {
    return stopWith(
      misread(`There is no game ${unknown.join(" or ")} under games/.`, USAGE),
      printer,
    );
  }
  if (games.length === 0) {
    printError("Found no game that provides BUG_REPORT_SOURCE.");
    return 1;
  }
  let failed = false;
  await withChrome(
    { chrome: read.values.chrome, name: "check-report" },
    async (devtools) => {
      for (const game of games) {
        const root = join(gamesFolder, game);
        /** @type {GameCheck} */
        let found;
        try {
          if (!read.values.built) await build(root);
          const name = await builtName(root);
          const server = await serve(root, port);
          try {
            found = await checkGame(devtools, server.url, name);
          } finally {
            await server.close();
          }
        } catch (error) {
          found = {
            problems: [error instanceof Error ? error.message : String(error)],
            measured: [],
          };
        }
        for (const problem of found.problems) printError(`${game}: ${problem}`);
        print(
          `${game}: ${found.problems.length === 0 ? "the report holds" : "the report fails"}.`,
        );
        for (const line of found.measured) print(`  ${line}`);
        failed ||= found.problems.length > 0;
      }
    },
  );
  return failed ? 1 : 0;
}

if (import.meta.main) {
  process.exitCode = await runReportCheck();
}
