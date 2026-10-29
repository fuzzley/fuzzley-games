import {
  type DevToolsConnection,
  type Page,
  type Viewport,
  withPage,
} from "./chrome.ts";
import {
  barOutOfWindow,
  scrolling,
  settle,
  settleTurn,
} from "./layout_page.ts";

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

/** Says how to check a game's layout. */
export interface LayoutCheck {
  /** Where the game is served, as its build is. */
  readonly url: string;
  /** A selector the page matches once the game has drawn. */
  readonly ready: string;
  /**
   * Returns what is wrong with the game's layout, in words, or nothing. It
   * runs in the page, sent as its source, so it can use nothing from the
   * module it is written in.
   */
  readonly inspect: () => string[];
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
 * the game bar outside the window, and what the game's own inspection finds.
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
 * Loads the game on a page and waits for it to draw, and returns the list of
 * errors the page reports, which goes on filling.
 */
async function load(page: Page, check: LayoutCheck): Promise<string[]> {
  const errors = await gatherErrors(page);
  if (check.before) await page.beforeLoad(check.before);
  await page.navigate(check.url);
  await page.evaluate(settle, check.ready, READY_TIMEOUT_MS);
  return errors;
}

/** Returns what is wrong with the game's layout as the page now stands. */
async function inspect(page: Page, check: LayoutCheck): Promise<string[]> {
  const own = await page.evaluate(check.inspect);
  const scrolls = await page.evaluate(scrolling);
  const bar = await page.evaluate(barOutOfWindow);
  return [...scrolls, ...bar, ...own];
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
