import {
  type DevToolsConnection,
  type Page,
  type Viewport,
  withPage,
} from "./chrome.ts";
import { scrolling, settle } from "./layout_page.ts";

/** Names a shape of window a game is laid out for, and gives one. */
export interface Shape {
  readonly name: string;
  readonly viewport: Viewport;
}

/**
 * The shapes every game is checked at: a roomy window, a phone held upright,
 * and a phone on its side.
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
 * Opens a game at every shape, each in a page of its own, and returns what
 * is wrong: an error the page reported, a page that scrolls, and what the
 * game's own inspection finds.
 */
export async function checkLayout(
  devtools: DevToolsConnection,
  check: LayoutCheck,
  shapes: readonly Shape[] = SHAPES,
): Promise<LayoutProblem[]> {
  const problems: LayoutProblem[] = [];
  for (const shape of shapes) {
    const found = await withPage(devtools, shape.viewport, (page) =>
      problemsOn(page, check),
    );
    problems.push(...found.map((problem) => ({ shape: shape.name, problem })));
  }
  return problems;
}

/** Loads the game on a page, and returns what is wrong with it there. */
async function problemsOn(page: Page, check: LayoutCheck): Promise<string[]> {
  const errors = await gatherErrors(page);
  if (check.before) await page.beforeLoad(check.before);
  await page.navigate(check.url);
  await page.evaluate(settle, check.ready, READY_TIMEOUT_MS);
  const own = await page.evaluate(check.inspect);
  const scrolls = await page.evaluate(scrolling);
  return [...errors, ...scrolls, ...own];
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
