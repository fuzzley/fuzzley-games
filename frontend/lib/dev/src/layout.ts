import { access } from "node:fs/promises";
import { basename, join } from "node:path";
import { preview } from "vite";
import {
  type BoardBox,
  type BoardInspection,
  type PhaserBoard,
  inspectPhaserBoard,
  inspectPhaserDeck,
  readNamedRects,
  readRect,
} from "./board_page.ts";
import {
  type DevToolsConnection,
  type Page,
  type PageFunction,
  type Viewport,
  withChrome,
  withPage,
} from "./chrome.ts";
import {
  barOutOfWindow,
  scrolling,
  settle,
  settleTurn,
} from "./layout_page.ts";
import { CONSOLE, type Printer, isStop, readArgs, stopWith } from "./script.ts";

export type {
  BoardBox,
  CanvasRect,
  NamedRect,
  PhaserBoard,
  PhaserDeck,
} from "./board_page.ts";
export { PHASER_CANVAS_READY, readNamedRects, readRect } from "./board_page.ts";

/** Names a shape of window a game is laid out for, and gives one. */
export interface Shape {
  readonly name: string;
  readonly viewport: Viewport;
}

/**
 * The shapes every game is checked at: a roomy window, a phone held upright,
 * and a phone on its side, each as a large phone and as a small one in its
 * browser's bars (an iPhone SE in Safari).
 */
export const SHAPES: readonly Shape[] = [
  {
    name: "roomy",
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  },
  {
    name: "phone portrait",
    viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
  },
  {
    name: "phone landscape",
    viewport: { width: 844, height: 390, deviceScaleFactor: 1 },
  },
  {
    name: "small phone portrait",
    viewport: { width: 375, height: 553, deviceScaleFactor: 1 },
  },
  {
    name: "small phone landscape",
    viewport: { width: 568, height: 320, deviceScaleFactor: 1 },
  },
];

/** A 320 × 480 phone held upright, the least room a board is checked in. */
export const SMALLEST: Shape = {
  name: "smallest phone portrait",
  viewport: { width: 320, height: 480, deviceScaleFactor: 1 },
};

/** Returns copies of shapes at a pixel ratio, such as 2. */
export function shapesAt(ratio: number, shapes: readonly Shape[]): Shape[] {
  return shapes.map((shape) => ({
    ...shape,
    viewport: { ...shape.viewport, deviceScaleFactor: ratio },
  }));
}

/** Names a turn of a phone, and gives the shape it starts from and ends at. */
export interface Turn {
  readonly name: string;
  readonly from: Viewport;
  readonly to: Viewport;
}

/** The turns a game is checked through: a phone, upright to its side and back. */
export const TURNS: readonly Turn[] = [
  {
    name: "phone portrait, turned on its side",
    from: { width: 390, height: 844, deviceScaleFactor: 1 },
    to: { width: 844, height: 390, deviceScaleFactor: 1 },
  },
  {
    name: "phone landscape, turned upright",
    from: { width: 844, height: 390, deviceScaleFactor: 1 },
    to: { width: 390, height: 844, deviceScaleFactor: 1 },
  },
];

/** Returns copies of turns at a pixel ratio, as {@link shapesAt} does shapes. */
function turnsAt(ratio: number, turns: readonly Turn[]): Turn[] {
  return turns.map((turn) => ({
    ...turn,
    from: { ...turn.from, deviceScaleFactor: ratio },
    to: { ...turn.to, deviceScaleFactor: ratio },
  }));
}

/**
 * The shapes a game drawn with Phaser is checked at: every shape and the
 * smallest phone, at twice the pixels, so the canvas's backing size is
 * tested.
 */
const PHASER_SHAPES: readonly Shape[] = shapesAt(2, [...SHAPES, SMALLEST]);

/** The turns a game drawn with Phaser is checked through, at twice the pixels. */
const PHASER_TURNS: readonly Turn[] = turnsAt(2, TURNS);

/**
 * The names of the shapes and turns {@link checkPhaserLayout} checks at, for
 * a layout script to say where the layout holds.
 */
export const PHASER_CHECKED_AT: string = [...PHASER_SHAPES, ...PHASER_TURNS]
  .map((shape) => shape.name)
  .join(", ");

/** Says how to check a game's layout. */
export interface LayoutCheck {
  /** Where the game is served, as its build is. */
  readonly url: string;
  /** A selector the page matches once the game has drawn. */
  readonly ready: string;
  /**
   * The board drawn with Phaser, where the game has one, which the check
   * inspects as it does every such board, and its deck, where it has one,
   * once the page says where the board lies.
   */
  readonly board?: PhaserBoard;
  /**
   * Returns what is wrong with the game's layout, in words, or nothing. It is
   * given where the check's board lies, where it has one and the page says
   * where, and nothing otherwise. It runs in the page, sent as its source
   * with {@link readRect} and {@link readNamedRects}, which it may call by
   * those names, so it can use nothing else from the module it is written in.
   *
   * It calls them as names of its own module, or from a script Node runs, as
   * a game's `tools/check-layout.mjs` is, never through an import Vite
   * rewrites: Vitest's module runner turns an imported `readRect(…)` into
   * `(0, __vite_ssr_import_0__.readRect)(…)`, the source the page is then
   * sent, which names nothing there.
   */
  readonly inspect: (box?: BoardBox) => string[];
  /**
   * Runs in the page before its own scripts, as `Page.beforeLoad()` runs
   * one, to set it up as a player might have, such as with a setting
   * stored. It is sent as its source, so it can use nothing from the module
   * it is written in.
   */
  readonly before?: () => void;
}

/** Says what is wrong with a game's layout at one shape. */
export interface LayoutProblem {
  readonly shape: string;
  readonly problem: string;
}

/** How long a game has to draw before a check gives up on it. */
const READY_TIMEOUT_MS = 10_000;

/**
 * How long a game has to lay itself out again after a turn: longer than a
 * frame, since what follows the window may wait a frame or two to move.
 */
const TURN_SETTLE_MS = 500;

/**
 * Opens a game at every shape, each in a page of its own, and returns what
 * is wrong: an error the page reported, a page that scrolls, a control of
 * the game bar outside the window, what is wrong with a board drawn with
 * Phaser, where the check has one, and what the game's own inspection finds.
 */
export async function checkLayout(
  devtools: DevToolsConnection,
  check: LayoutCheck,
  shapes: readonly Shape[] = SHAPES,
): Promise<LayoutProblem[]> {
  const problems: LayoutProblem[] = [];
  for (const shape of shapes) {
    const found = await withPage(devtools, shape.viewport, async (page) => {
      const errors = await load(page, check);
      const wrong = await inspect(page, check);
      return [...errors, ...wrong];
    });
    problems.push(...found.map((problem) => ({ shape: shape.name, problem })));
  }
  return problems;
}

/**
 * Opens a game at the shape each turn starts from, turns the window to the
 * one it ends at, as a phone turns, and returns what is wrong once the game
 * has laid itself out again, as {@link checkLayout} does at a shape.
 */
export async function checkTurns(
  devtools: DevToolsConnection,
  check: LayoutCheck,
  turns: readonly Turn[] = TURNS,
): Promise<LayoutProblem[]> {
  const problems: LayoutProblem[] = [];
  for (const turn of turns) {
    const found = await withPage(devtools, turn.from, async (page) => {
      const errors = await load(page, check);
      await page.send("Emulation.setDeviceMetricsOverride", {
        ...turn.to,
        mobile: false,
      });
      await page.evaluate(settleTurn, TURN_SETTLE_MS);
      const wrong = await inspect(page, check);
      return [...errors, ...wrong];
    });
    problems.push(...found.map((problem) => ({ shape: turn.name, problem })));
  }
  return problems;
}

/**
 * Checks a game drawn with Phaser as {@link checkLayout} does, at every
 * shape and the smallest phone, then as {@link checkTurns} does, through
 * every turn, all at twice the pixels, so the canvas's backing size is
 * tested, and returns what is wrong.
 */
export async function checkPhaserLayout(
  devtools: DevToolsConnection,
  check: LayoutCheck,
): Promise<LayoutProblem[]> {
  const shaped = await checkLayout(devtools, check, PHASER_SHAPES);
  const turned = await checkTurns(devtools, check, PHASER_TURNS);
  return [...shaped, ...turned];
}

/** Says what a game's `tools/check-layout.mjs` checks its build with. */
export interface LayoutScript {
  /** The game's name, as the script's words say it, such as "Snake". */
  readonly game: string;
  /** The game's workspace folder, whose build, in `dist/`, is served. */
  readonly root: string;
  /**
   * Runs the game's checks on its build, served at `url`, and returns what
   * is wrong.
   */
  readonly check: (
    devtools: DevToolsConnection,
    url: string,
  ) => Promise<LayoutProblem[]>;
  /**
   * Says where the checks found the layout holds, which the script prints
   * once they find nothing wrong, as in "Sudoku's layout holds at each
   * shape: roomy, …".
   */
  readonly holds: string;
}

/** Says what a layout script runs on, where a spec stands in for it. */
export interface LayoutScriptOptions extends Partial<Printer> {
  /** The command line's arguments, the process's by default. */
  readonly args?: readonly string[];
  /** Starts the headless Chrome, `withChrome()` by default. */
  readonly runChrome?: typeof withChrome;
}

/**
 * Runs a game's layout check from its script's command line, and returns
 * the exit code: it serves the build as `yarn preview` does, runs the
 * game's checks on it in a headless Chrome, and prints what is wrong, or
 * that the layout holds.
 *
 * It throws, rather than returning a code, where it can't run the checks at
 * all, such as for a game with no build, no Chrome to run, or a page that
 * never draws.
 */
export async function runLayoutScript(
  script: LayoutScript,
  {
    args = process.argv.slice(2),
    runChrome = withChrome,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  }: LayoutScriptOptions = {},
): Promise<number> {
  const read = readArgs(args, {
    options: { chrome: { type: "string" } },
    usage: usage(script.game),
  });
  if (isStop(read)) return stopWith(read, { print, printError });
  const options = read.values;
  await access(join(script.root, "dist/index.html")).catch(() => {
    throw new Error("Found no build to check; run yarn build first.");
  });
  const server = await preview({
    root: script.root,
    logLevel: "silent",
    // The loopback address itself, not `localhost`, which can name ::1 to the
    // server and 127.0.0.1 to a client dialing it; and no browser of the
    // desktop's, whatever the game's own config asks, as the checks bring
    // their own.
    preview: { host: "127.0.0.1", port: 0, strictPort: true, open: false },
  });
  try {
    const url = server.resolvedUrls?.local[0];
    if (!url) throw new Error("The preview server gave no address.");
    const problems = await runChrome(
      { chrome: options.chrome, name: basename(script.root) },
      (devtools) => script.check(devtools, url),
    );
    for (const { shape, problem } of problems) {
      printError(`${shape}: ${problem}`);
    }
    if (problems.length > 0) return 1;
    print(`${script.game}'s layout holds ${script.holds}.`);
    return 0;
  } finally {
    await server.close();
  }
}

/** Returns what `--help` prints for a game. */
function usage(game: string): string {
  return `Usage: yarn check:layout [options]

Checks ${game}'s layout in headless Chrome, on the build yarn build made.

  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;
}

/**
 * Loads the game on a page and waits for it to draw, and returns the list of
 * errors the page reports, which goes on filling.
 */
async function load(page: Page, check: LayoutCheck): Promise<string[]> {
  const errors = await gatherErrors(page);
  if (check.before) await page.beforeLoad(check.before);
  await page.navigate(check.url);
  if (!(await page.evaluate(settle, check.ready, READY_TIMEOUT_MS))) {
    throw new Error(
      `Nothing matched ${check.ready} in ${String(READY_TIMEOUT_MS)} ms.`,
    );
  }
  return errors;
}

/**
 * The readers of the rectangles a board writes, which the inspections, the
 * board's, its deck's and the game's own, are sent into the page with.
 */
const READERS: readonly PageFunction[] = [readRect, readNamedRects];

/** Returns what is wrong with the game's layout as the page now stands. */
async function inspect(page: Page, check: LayoutCheck): Promise<string[]> {
  const board: BoardInspection = check.board
    ? await page.evaluateWith(READERS, inspectPhaserBoard, check.board)
    : { problems: [] };
  const deck =
    check.board?.deck && board.box
      ? await page.evaluateWith(
          READERS,
          inspectPhaserDeck,
          check.board,
          board.box,
        )
      : [];
  // An argument goes to the page as JSON, which turns undefined into null.
  const own = board.box
    ? await page.evaluateWith(READERS, check.inspect, board.box)
    : await page.evaluateWith(READERS, check.inspect);
  const scrolls = await page.evaluate(scrolling);
  const bar = await page.evaluate(barOutOfWindow);
  return [...scrolls, ...bar, ...board.problems, ...deck, ...own];
}

/**
 * Starts gathering what a page reports as an error, and returns the list it
 * fills: an exception nothing caught, a call of `console.error`, and the
 * browser's own word, such as a request that failed or a resource the
 * Content Security Policy refused.
 */
async function gatherErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("Runtime.exceptionThrown", (params) => {
    const details = field(params, "exceptionDetails");
    const thrown = field(field(details, "exception"), "description");
    errors.push(`Uncaught: ${String(thrown ?? field(details, "text"))}`);
  });
  page.on("Runtime.consoleAPICalled", (params) => {
    if (field(params, "type") !== "error") return;
    const args = field(params, "args");
    const words = Array.isArray(args)
      ? args.map((arg) =>
          String(field(arg, "value") ?? field(arg, "description")),
        )
      : [];
    errors.push(`console.error: ${words.join(" ")}`);
  });
  page.on("Log.entryAdded", (params) => {
    const entry = field(params, "entry");
    if (field(entry, "level") === "error") {
      errors.push(String(field(entry, "text")));
    }
  });
  await page.send("Runtime.enable");
  await page.send("Log.enable");
  return errors;
}

/** Returns a field of an object DevTools sent, or undefined without one. */
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? (Reflect.get(value, key) as unknown)
    : undefined;
}
