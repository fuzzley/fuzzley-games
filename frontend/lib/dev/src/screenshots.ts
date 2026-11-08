// The images the site shows of a game built here, which the game's
// screenshot script writes into its build's docs/screenshots/<id>/, where the
// site's catalog looks for them (screenshotUrl() in the site's model), and
// what runs every game's screenshot script: its command line, the server it
// captures from, the Chrome it captures in, and the page it sets up there.

import { mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";
import type { Region, ResizeOptions } from "sharp";
import { THEME_STORAGE_KEY } from "@fz/style/themes";
import {
  type DevToolsConnection,
  type Page,
  type Viewport,
  withChrome,
} from "./chrome.ts";
import { settle } from "./layout_page.ts";
import { type PageSetup, preparePage } from "./screenshot_page.ts";
import {
  CONSOLE,
  type Printer,
  type Stop,
  isStop,
  misread,
  readArgs,
  stopWith,
  wrapped,
} from "./script.ts";

export type { Region } from "sharp";
export { PHASER_CANVAS_READY, PHASER_CANVAS_SETTLED } from "./board_page.ts";
export { describePhaserPage } from "./screenshot_page.ts";
export type {
  PageSetup,
  PhaserPageState,
  PhaserPageWait,
} from "./screenshot_page.ts";

/** An image to write: its file's name and its size in pixels. */
export interface Image {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/**
 * The images the site shows, each at least twice the CSS size it is shown
 * at, so that it stays sharp on a high density display: the thumbnail in a
 * row of the game browser at up to about 288 CSS px wide, the preview beside
 * it and in link previews at up to 1200.
 */
export const SITE_IMAGES = {
  thumb: { file: "thumb.webp", width: 576, height: 324 },
  preview: { file: "preview.webp", width: 2560, height: 1440 },
} as const satisfies Record<string, Image>;

/** The WebP quality the site's images are written at. */
export const SITE_IMAGE_QUALITY = 80;

/** Says how an image is made from a capture. */
export interface ImageOptions {
  /** The part of the capture to keep; all of it unless given. */
  readonly region?: Region | undefined;
  /** How the capture is fitted to the image's size: sharp's `cover` unless given. */
  readonly resize?: ResizeOptions | undefined;
  /** The WebP quality, from 1 to 100: {@link SITE_IMAGE_QUALITY} unless given. */
  readonly quality?: number;
}

/** Says how the site's two images are made from a capture. */
export interface SiteImageOptions {
  /** The part of the capture the thumbnail keeps, such as the board alone. */
  readonly thumbRegion?: Region | undefined;
  /** How the capture is fitted to each image's size. */
  readonly resize?: ResizeOptions;
}

/** Writes a capture to a WebP image of the given size, and returns its size in bytes. */
export async function writeImage(
  capture: string | Buffer,
  target: string,
  image: Image,
  { region, resize, quality = SITE_IMAGE_QUALITY }: ImageOptions = {},
): Promise<number> {
  const source = sharp(capture);
  await (region ? source.extract(region) : source)
    .resize(image.width, image.height, resize)
    // Smart subsampling keeps a small, saturated detail, such as a red suit
    // or a number's ink, from bleeding into what surrounds it.
    .webp({ quality, smartSubsample: true })
    .toFile(target);
  return (await stat(target)).size;
}

/**
 * Writes the site's thumbnail and preview of a game into a folder, and
 * returns each file's name and size in bytes.
 */
export async function writeSiteImages(
  capture: string | Buffer,
  folder: string,
  { thumbRegion, resize }: SiteImageOptions = {},
): Promise<Map<string, number>> {
  await mkdir(folder, { recursive: true });
  const sizes = new Map<string, number>();
  for (const [kind, image] of Object.entries(SITE_IMAGES)) {
    const region = kind === "thumb" ? thumbRegion : undefined;
    const target = join(folder, image.file);
    sizes.set(
      image.file,
      await writeImage(capture, target, image, { region, resize }),
    );
  }
  return sizes;
}

/**
 * Returns the part of a capture a thumbnail keeps of a box on its page: the
 * box with a margin around it, grown to the thumbnail's shape and kept on
 * the page, in the capture's pixels.
 *
 * It is rounded to whole pixels before it is kept on the page, so a pixel
 * rounded up can't carry it past the capture's edge.
 *
 * @param box The box, in CSS pixels.
 * @param viewport The page the capture was taken of.
 * @param margin The page kept around the box, in CSS pixels.
 */
export function thumbRegionAround(
  box: Region,
  viewport: Viewport,
  margin: number,
): Region {
  const { width: thumbWidth, height: thumbHeight } = SITE_IMAGES.thumb;
  const scale = viewport.deviceScaleFactor;
  // A capture is as many whole pixels as fit, so a region kept inside this
  // stays inside it.
  const pageWidth = Math.floor(viewport.width * scale);
  const pageHeight = Math.floor(viewport.height * scale);
  const width = Math.round(
    Math.min(
      Math.max(
        box.width + 2 * margin,
        ((box.height + 2 * margin) * thumbWidth) / thumbHeight,
      ) * scale,
      pageWidth,
    ),
  );
  const height = Math.round(
    Math.min((width * thumbHeight) / thumbWidth, pageHeight),
  );
  const centerX = (box.left + box.width / 2) * scale;
  const centerY = (box.top + box.height / 2) * scale;
  return {
    left: Math.min(
      Math.max(0, Math.round(centerX - width / 2)),
      pageWidth - width,
    ),
    top: Math.min(
      Math.max(0, Math.round(centerY - height / 2)),
      pageHeight - height,
    ),
    width,
    height,
  };
}

/** Sets a page up before its own scripts run, on every load, as a player might have left it. */
export async function setUpPage(page: Page, setup: PageSetup): Promise<void> {
  await page.beforeLoad(preparePage, setup, THEME_STORAGE_KEY);
}

/** How long a game has to draw before a screenshot gives up on it. */
const DRAW_TIMEOUT_MS = 20_000;

/**
 * Waits for a page to match a selector, as a game's page does once it has
 * drawn, its fonts loaded and drawn twice more, as the layout check waits,
 * and returns whether it did in time. It throws for anything else that goes
 * wrong in the page.
 */
export function settled(
  page: Page,
  selector: string,
  timeoutMs = DRAW_TIMEOUT_MS,
): Promise<boolean> {
  return page.evaluate(settle, selector, timeoutMs);
}

/**
 * A screenshot of a game for the site: the capture, the part of it the
 * thumbnail keeps, and what it shows, in words.
 */
export interface Shot {
  readonly png: Buffer;
  /** The part of the capture the thumbnail keeps; all of it unless given. */
  readonly thumbRegion?: Region;
  /** What the script says it captured, such as "Took up the run, paused with a score of 12." */
  readonly says: string;
}

/** Says why a screenshot couldn't be taken, such as "the board did not draw". */
export interface Missed {
  readonly problem: string;
}

/**
 * Writes the site's images of a shot into a folder, printing what it shows
 * and each image's size, or prints why it was missed, and returns the code
 * to exit with.
 */
export async function keepShot(
  shot: Shot | Missed,
  folder: string,
  { print, printError }: Printer,
): Promise<number> {
  if ("problem" in shot) {
    printError(`Not captured: ${shot.problem}.`);
    return 1;
  }
  print(shot.says);
  const sizes = await writeSiteImages(shot.png, folder, {
    thumbRegion: shot.thumbRegion,
  });
  for (const [file, bytes] of sizes) {
    print(`${file}: ${String(Math.round(bytes / 1024))} KB`);
  }
  return 0;
}

/** Says what a screenshot script's command line asks it to capture. */
export interface ScreenshotRequest {
  /** Where the game is served: an http or https address. */
  readonly url: string;
  /** The words after the options, which only a script that takes them is given. */
  readonly names: readonly string[];
}

/** Says what a game's `tools/capture-screenshots.mjs` captures. */
export interface ScreenshotScript {
  /** The game's name, as the usage says it, such as "Snake". */
  readonly game: string;
  /** The game's workspace folder, which Chrome's throwaway profile is named for. */
  readonly root: string;
  /** The port of the game's own dev server, which `--url` defaults to. */
  readonly port: number;
  /**
   * What the usage says the script captures: the screenshots the site shows
   * of the game unless given.
   */
  readonly about?: string;
  /**
   * What the usage calls each name the command line may give after its
   * options, such as "game id", for a script that captures several games;
   * a script without it takes none.
   */
  readonly nameLabel?: string;
  /**
   * Captures what the command line asks for, from the game served at its
   * address, in a headless Chrome, prints what it captured, and returns the
   * code to exit with.
   */
  readonly capture: (
    devtools: DevToolsConnection,
    request: ScreenshotRequest,
    printer: Printer,
  ) => Promise<number>;
}

/** Says what a screenshot script runs on, where a spec stands in for it. */
export interface ScreenshotScriptOptions extends Partial<Printer> {
  /** The command line's arguments, the process's by default. */
  readonly args?: readonly string[];
  /** Starts the headless Chrome, `withChrome()` by default. */
  readonly runChrome?: typeof withChrome;
}

/**
 * Runs a game's screenshot script from its command line, and returns the
 * exit code: it checks a server answers at `--url`, then starts a headless
 * Chrome and hands it to the script's capture, which says what it captured
 * and returns the code. It returns 1, before Chrome starts, where nothing
 * answers within five seconds, and 2 for a command line it can't read or a
 * `--url` that is no http or https address. It throws where it can't
 * capture at all, such as for no Chrome to run, or a function the capture
 * runs in the page that throws.
 */
export async function runScreenshotScript(
  script: ScreenshotScript,
  {
    args = process.argv.slice(2),
    runChrome = withChrome,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  }: ScreenshotScriptOptions = {},
): Promise<number> {
  const printer = { print, printError };
  const request = readRequest(args, script);
  if (isStop(request)) return stopWith(request, printer);
  if (!(await answers(request.url))) {
    printError(
      `Nothing answers at ${request.url}; start the game with yarn dev.`,
    );
    return 1;
  }
  const { chrome, ...asked } = request;
  return runChrome({ chrome, name: basename(script.root) }, (devtools) =>
    script.capture(devtools, asked, printer),
  );
}

/**
 * Returns what a screenshot script's command line asks for, and the Chrome
 * it names, or, for `--help`, or one the script can't read or whose `--url`
 * is no http or https address, what to print and the code to exit with.
 */
function readRequest(
  args: readonly string[],
  script: ScreenshotScript,
): (ScreenshotRequest & { readonly chrome: string | undefined }) | Stop {
  const usage = usageOf(script);
  const read = readArgs(args, {
    options: {
      url: {
        type: "string",
        default: `http://localhost:${String(script.port)}/`,
      },
      chrome: { type: "string" },
    },
    allowPositionals: script.nameLabel !== undefined,
    usage,
  });
  if (isStop(read)) return read;
  const { url, chrome } = read.values;
  const protocol = URL.parse(url)?.protocol;
  if (protocol !== "http:" && protocol !== "https:") {
    return misread(
      `--url takes an http or https address, not "${url}".`,
      usage,
    );
  }
  return { url, chrome, names: read.positionals };
}

/** Returns what a screenshot script's `--help` prints. */
function usageOf(script: ScreenshotScript): string {
  const names =
    script.nameLabel === undefined ? "" : ` [${script.nameLabel} ...]`;
  const about =
    script.about ??
    `Captures the screenshots the site shows of ${script.game} from a running server.`;
  return `Usage: yarn capture:screenshots [options]${names}

${wrapped(about)}

  --url <url>      The server (default: http://localhost:${String(script.port)}/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;
}

/** How long a server has to answer before a screenshot script gives up on it. */
const ANSWER_TIMEOUT_MS = 5_000;

/** Returns whether anything answers at an address in time. */
async function answers(url: string): Promise<boolean> {
  return fetch(url, { signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS) }).then(
    async (response) => {
      await response.body?.cancel();
      return true;
    },
    () => false,
  );
}
