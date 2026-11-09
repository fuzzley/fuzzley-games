import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { type Server, createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import sharp from "sharp";
import type { Sharp } from "sharp";
import { THEME_STORAGE_KEY } from "@fz/style/themes";
import {
  type ChromeOptions,
  DevToolsConnection,
  Page,
  type withChrome,
} from "./chrome.ts";
import { PHASER_CANVAS_SETTLED, type PhaserPageState } from "./board_page.ts";
import {
  type ScreenshotRequest,
  type ScreenshotScript,
  SCREENSHOT_VIEWPORT,
  SITE_IMAGES,
  keepShot,
  runScreenshotScript,
  settled,
  setUpPage,
  siteImagesFolder,
  takenUpBoard,
  thumbRegionAround,
  writeImage,
  writeSiteImages,
} from "./screenshots.ts";
import { recordingPrinter } from "./script.ts";
import { type Reply, FakeBrowser } from "./testing/fake_browser.ts";

// One thread per image, so encoding the 2560 × 1440 preview doesn't starve
// the specs running beside these.
sharp.concurrency(1);

/** Where the capture's board lies: all but the 100 rows of red above it. */
const BOARD = { left: 0, top: 100, width: 1280, height: 620 };

/** Returns a capture: a 1280 × 720 PNG, red above a green board. */
async function capture(): Promise<Buffer> {
  const red = { r: 200, g: 0, b: 0 };
  const green = { r: 0, g: 120, b: 0 };
  const board = await sharp({
    create: {
      width: BOARD.width,
      height: BOARD.height,
      channels: 3,
      background: green,
    },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 1280, height: 720, channels: 3, background: red },
  })
    .composite([{ input: board, top: BOARD.top, left: BOARD.left }])
    .png()
    .toBuffer();
}

/**
 * Opens an image written to disk. Sharp would keep a file it opened by path
 * locked on Windows, and the folder could not be removed.
 */
async function open(file: string): Promise<Sharp> {
  return sharp(await readFile(file));
}

/** Returns the colour of an image's pixel at its middle, top row. */
async function topMiddle(file: string): Promise<number[]> {
  const { data, info } = await (
    await open(file)
  )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = Math.floor(info.width / 2) * info.channels;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

let folder: string;

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "fz-screenshots-"));
});

afterAll(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("writeSiteImages", () => {
  // Written once, into a folder that doesn't exist yet, since the preview
  // takes a while to encode.
  let images: string;
  let sizes: Map<string, number>;

  beforeAll(async () => {
    images = join(folder, "docs", "screenshots", "klondike");
    sizes = await writeSiteImages(await capture(), images, {
      thumbRegion: BOARD,
    });
  });

  it("writes the thumbnail at the size the site shows it", async () => {
    const thumb = await (await open(join(images, "thumb.webp"))).metadata();

    expect([thumb.format, thumb.width, thumb.height]).toEqual([
      "webp",
      SITE_IMAGES.thumb.width,
      SITE_IMAGES.thumb.height,
    ]);
  });

  it("writes the preview at the size the site shows it", async () => {
    const preview = await (await open(join(images, "preview.webp"))).metadata();

    expect([preview.format, preview.width, preview.height]).toEqual([
      "webp",
      SITE_IMAGES.preview.width,
      SITE_IMAGES.preview.height,
    ]);
  });

  it("returns each file's size", () => {
    expect([...sizes.keys()]).toEqual(["thumb.webp", "preview.webp"]);
    expect([...sizes.values()].every((size) => size > 0)).toBe(true);
  });

  it("crops the thumbnail to the region it is given", async () => {
    const [red] = await topMiddle(join(images, "thumb.webp"));

    expect(red).toBeLessThan(50);
  });

  it("leaves the preview whole", async () => {
    const [red] = await topMiddle(join(images, "preview.webp"));

    expect(red).toBeGreaterThan(150);
  });
});

describe("writeImage", () => {
  it("fits the capture as it is told", async () => {
    const target = join(folder, "overview.webp");

    await writeImage(
      await capture(),
      target,
      { file: "overview.webp", width: 400, height: 400 },
      { resize: { fit: "contain", position: "top", background: "#00ff00" } },
    );

    const { width, height } = await (await open(target)).metadata();
    expect([width, height]).toEqual([400, 400]);
  });
});

/** The page a thumbnail keeps around its box, in CSS px. */
const MARGIN = 24;

describe("thumbRegionAround", () => {
  it("keeps the box and its margin in the middle, at the thumbnail's shape, in the capture's pixels", () => {
    expect(
      thumbRegionAround(
        { left: 352, top: 216, width: 576, height: 320 },
        SCREENSHOT_VIEWPORT,
        MARGIN,
      ),
    ).toEqual({ left: 626, top: 384, width: 1308, height: 736 });
  });

  it("grows a box wider than the thumbnail's shape down, keeping it whole", () => {
    expect(
      thumbRegionAround(
        { left: 240, top: 310, width: 800, height: 100 },
        SCREENSHOT_VIEWPORT,
        MARGIN,
      ),
    ).toEqual({ left: 432, top: 243, width: 1696, height: 954 });
  });

  it("keeps the region on the capture for a box at its top left", () => {
    expect(
      thumbRegionAround(
        { left: 0, top: 0, width: 400, height: 225 },
        SCREENSHOT_VIEWPORT,
        MARGIN,
      ),
    ).toEqual({ left: 0, top: 0, width: 971, height: 546 });
  });

  it("keeps the region on the capture for a box at its bottom right", () => {
    expect(
      thumbRegionAround(
        { left: 880, top: 495, width: 400, height: 225 },
        SCREENSHOT_VIEWPORT,
        MARGIN,
      ),
    ).toEqual({ left: 1589, top: 894, width: 971, height: 546 });
  });

  // Its width, 2000.5 pixels, and its left edge kept on the page, 559.5,
  // would each round up, and run a pixel past the capture's right edge.
  it("keeps a region whose pixels round up on the capture at its right edge", () => {
    expect(
      thumbRegionAround(
        { left: 1000, top: 100, width: 280, height: 514.640625 },
        SCREENSHOT_VIEWPORT,
        MARGIN,
      ),
    ).toEqual({ left: 559, top: 152, width: 2001, height: 1126 });
  });

  it("keeps a region whose pixels round up on the capture at its bottom edge", () => {
    expect(
      thumbRegionAround(
        { left: 100, top: 400, width: 280, height: 514.640625 },
        SCREENSHOT_VIEWPORT,
        MARGIN,
      ),
    ).toEqual({ left: 0, top: 314, width: 2001, height: 1126 });
  });

  // The page is 1707.5 pixels wide, of which a capture has 1707 whole ones.
  it("keeps the region to a capture's whole pixels at a ratio that leaves part of one", () => {
    expect(
      thumbRegionAround(
        { left: 1066, top: 100, width: 300, height: 200 },
        { width: 1366, height: 768, deviceScaleFactor: 1.25 },
        MARGIN,
      ),
    ).toEqual({ left: 1156, top: 95, width: 551, height: 310 });
  });

  it("keeps the whole capture for a box as wide as the page", () => {
    expect(
      thumbRegionAround(
        { left: 0, top: 48, width: 1280, height: 640 },
        SCREENSHOT_VIEWPORT,
        MARGIN,
      ),
    ).toEqual({ left: 0, top: 0, width: 2560, height: 1440 });
  });

  it("keeps 24 CSS px around the box unless told otherwise", () => {
    const box = { left: 352, top: 216, width: 576, height: 320 };

    expect(thumbRegionAround(box, SCREENSHOT_VIEWPORT)).toEqual(
      thumbRegionAround(box, SCREENSHOT_VIEWPORT, 24),
    );
  });
});

describe("SCREENSHOT_VIEWPORT", () => {
  it("captures a page as large as the site's preview, which is never enlarged", () => {
    const { width, height, deviceScaleFactor } = SCREENSHOT_VIEWPORT;

    expect([width * deviceScaleFactor, height * deviceScaleFactor]).toEqual([
      SITE_IMAGES.preview.width,
      SITE_IMAGES.preview.height,
    ]);
  });
});

describe("siteImagesFolder", () => {
  it("names the game's folder under its workspace's public/, where its build serves the site's images", () => {
    expect(siteImagesFolder(join("games", "snake"), "snake")).toBe(
      join("games", "snake", "public", "docs", "screenshots", "snake"),
    );
  });
});

/** Returns a page of a fake browser that answers a function run in it as given. */
function pageAnswering(evaluate: Reply): { page: Page; browser: FakeBrowser } {
  const browser = new FakeBrowser({ "Runtime.evaluate": evaluate });
  return {
    page: new Page(new DevToolsConnection(browser), "page"),
    browser,
  };
}

describe("setUpPage", () => {
  it("sets the page up before its own scripts, the palette under the games' key", async () => {
    const { page, browser } = pageAnswering({ result: { result: {} } });
    const setup = { theme: "casino", seed: 7 };

    await setUpPage(page, setup);

    const source = String(
      browser.last("Page.addScriptToEvaluateOnNewDocument")?.params["source"],
    );
    expect(source).toMatch(
      new RegExp(
        `^\\(function preparePage[^]*\\)\\(\\.\\.\\.${escaped(JSON.stringify([setup, THEME_STORAGE_KEY]))}\\)$`,
      ),
    );
  });
});

/** Returns text a `RegExp` matches as it is. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("settled", () => {
  it("waits in the page for the selector to match, and says it did", async () => {
    const { page, browser } = pageAnswering({
      result: { result: { value: true } },
    });

    const drawn = await settled(page, "main.ready", 500);

    const expression = String(
      browser.last("Runtime.evaluate")?.params["expression"],
    );
    expect({ drawn, expression }).toEqual({
      drawn: true,
      expression: expect.stringMatching(
        /^\(function settle[^]*\)\(\.\.\.\["main\.ready",500\]\)$/,
      ) as unknown,
    });
  });

  it("says the page didn't settle where nothing matched in time", async () => {
    const { page } = pageAnswering({ result: { result: { value: false } } });

    expect(await settled(page, "main.ready", 500)).toBe(false);
  });

  it("throws what else went wrong in the page", async () => {
    const { page } = pageAnswering({
      result: {
        result: {},
        exceptionDetails: {
          text: "Uncaught (in promise)",
          exception: { description: "TypeError: document.fonts is undefined" },
        },
      },
    });

    await expect(settled(page, "main.ready", 500)).rejects.toThrow(
      "TypeError: document.fonts is undefined",
    );
  });
});

describe("takenUpBoard", () => {
  /** A board drawn with Phaser, named as no game names its own. */
  const PITCH = {
    name: "pitch",
    element: "app-pitch",
    drawnAt: "data-pitch",
  };

  /** Where the scene drew the pitch on the page, in CSS px. */
  const DRAWN = { left: 40, top: 60, width: 520, height: 600 };

  /** The page of a run taken up, paused at its score, its pitch drawn. */
  const TAKEN_UP: PhaserPageState = {
    state: "ready",
    outcome: "paused",
    score: "1,250",
    board: DRAWN,
  };

  /**
   * Returns a page of a fake browser that settles, and describes itself as
   * given, and the browser.
   */
  function pageShowing(shown: Partial<PhaserPageState>): {
    page: Page;
    browser: FakeBrowser;
  } {
    return pageAnswering((command) => {
      const expression = String(command.params["expression"]);
      const value = expression.includes("function describePhaserPage")
        ? { ...TAKEN_UP, ...shown }
        : true;
      return { result: { result: { value } } };
    });
  }

  it("returns where the board lies once its run is taken up, paused at its score", async () => {
    const { page } = pageShowing({});

    expect(await takenUpBoard(page, PITCH, "1,250")).toEqual(DRAWN);
  });

  it("waits for the canvas to settle, then describes the page, by the board's element and attribute", async () => {
    const { page, browser } = pageShowing({});

    await takenUpBoard(page, PITCH, "1,250");

    const expressions = browser.sent
      .filter(({ method }) => method === "Runtime.evaluate")
      .map(({ params }) => String(params["expression"]));
    expect(expressions).toEqual([
      expect.stringContaining(
        `(...${JSON.stringify([PHASER_CANVAS_SETTLED, 20_000])})`,
      ) as unknown,
      expect.stringMatching(
        new RegExp(
          `function readRect[^]*function describePhaserPage[^]*${escaped(JSON.stringify([PITCH]))}`,
        ),
      ) as unknown,
    ]);
  });

  it.each<[string, Partial<PhaserPageState>, string]>([
    ["didn't draw", { state: "failed" }, "the pitch did not draw"],
    ["isn't paused", { outcome: "playing" }, "the run was not taken up"],
    ["reads another score", { score: "0" }, "the score reads 0"],
    ["doesn't say where it lies", { board: null }, "the pitch is missing"],
  ])(
    "says why it can't be shot where the board %s",
    async (_, shown, problem) => {
      const { page } = pageShowing(shown);

      expect(await takenUpBoard(page, PITCH, "1,250")).toEqual({
        problem,
      });
    },
  );
});

describe("keepShot", () => {
  it("writes the site's images of a shot, the thumbnail cropped, and says what it shows and how large each is", async () => {
    const images = join(folder, "kept");
    const printer = recordingPrinter();

    const code = await keepShot(
      { png: await capture(), thumbRegion: BOARD, says: "Took up the run." },
      images,
      printer,
    );

    const [red] = await topMiddle(join(images, "thumb.webp"));
    expect({ code, out: printer.out, err: printer.err, red }).toEqual({
      code: 0,
      out: [
        "Took up the run.",
        expect.stringMatching(/^thumb\.webp: \d+ KB$/) as unknown,
        expect.stringMatching(/^preview\.webp: \d+ KB$/) as unknown,
      ],
      err: [],
      red: expect.any(Number) as unknown,
    });
    expect(red).toBeLessThan(50);
  });

  it("says why a shot was missed, writes nothing, and fails", async () => {
    const images = join(folder, "missed");
    const printer = recordingPrinter();

    const code = await keepShot(
      { problem: "the board did not draw" },
      images,
      printer,
    );

    await expect(access(images)).rejects.toThrow();
    expect({ code, out: printer.out, err: printer.err }).toEqual({
      code: 1,
      out: [],
      err: ["Not captured: the board did not draw."],
    });
  });
});

/** Starts a server on a spare port of 127.0.0.1, and returns its address. */
async function listening(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${String(typeof address === "object" && address ? address.port : 0)}/`;
}

/** Stops a server, dropping the connections it never answered. */
async function stopped(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

describe("runScreenshotScript", () => {
  const server = createServer((_, response) => {
    response.end("The game");
  });
  // Takes each request and never answers it.
  const silent = createServer(() => {});
  let url = "";
  let silentUrl = "";

  beforeAll(async () => {
    [url, silentUrl] = await Promise.all([
      listening(server),
      listening(silent),
    ]);
  });

  afterAll(async () => {
    await Promise.all([stopped(server), stopped(silent)]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Returns a script for a game, whose capture keeps what it is asked for and returns a code. */
  function script(
    changes: Partial<ScreenshotScript> = {},
    asked: ScreenshotRequest[] = [],
    code = 0,
  ): ScreenshotScript {
    return {
      game: "Snake",
      root: join(folder, "snake"),
      port: 9003,
      capture: (_devtools, request, { print }) => {
        asked.push(request);
        print("Took up the run.");
        return Promise.resolve(code);
      },
      ...changes,
    };
  }

  /** Returns a stand-in for Chrome that keeps the options it was started with. */
  function fakeChrome(started: ChromeOptions[] = []): typeof withChrome {
    return async (options, use) => {
      started.push(options);
      return use(new DevToolsConnection(new FakeBrowser({})));
    };
  }

  /** Runs a script on a command line, and returns its code, what it printed and the Chromes it started. */
  async function ran(
    args: readonly string[],
    of: ScreenshotScript = script(),
  ): Promise<{
    code: number;
    out: readonly string[];
    err: readonly string[];
    started: ChromeOptions[];
  }> {
    const started: ChromeOptions[] = [];
    const printer = recordingPrinter();
    const code = await runScreenshotScript(of, {
      args,
      runChrome: fakeChrome(started),
      ...printer,
    });
    return { code, out: printer.out, err: printer.err, started };
  }

  it("starts the Chrome the command line names, its profile named for the game's folder, and returns what the capture returns", async () => {
    const result = await ran(
      ["--url", url, "--chrome", "/opt/chrome"],
      script({}, [], 1),
    );

    expect(result).toEqual({
      code: 1,
      out: ["Took up the run."],
      err: [],
      started: [
        { chrome: "/opt/chrome", name: basename(join(folder, "snake")) },
      ],
    });
  });

  it("hands the capture the server's address, and no names", async () => {
    const asked: ScreenshotRequest[] = [];

    await ran(["--url", url], script({}, asked));

    expect(asked).toEqual([{ url, names: [] }]);
  });

  it("hands the names after the options to a script that takes them", async () => {
    const asked: ScreenshotRequest[] = [];

    await ran(
      ["--url", url, "klondike", "spider"],
      script({ nameLabel: "game id" }, asked),
    );

    expect(asked).toEqual([{ url, names: ["klondike", "spider"] }]);
  });

  it("prints its usage for --help, the game's own server its default, and starts no Chrome", async () => {
    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [
        `Usage: yarn capture:screenshots [options]

Captures the screenshots the site shows of Snake from a running server.

  --url <url>      The server (default: http://localhost:9003/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`,
      ],
      err: [],
      started: [],
    });
  });

  it("breaks what its usage says it captures into lines of 78 columns at most", async () => {
    const { out } = await ran(["--help"], script({ game: "Asteroid Breaker" }));

    expect(out[0]?.split("\n").slice(2, 4)).toEqual([
      "Captures the screenshots the site shows of Asteroid Breaker from a running",
      "server.",
    ]);
  });

  it("says in its usage what a script that takes names captures, and the names it takes", async () => {
    const about =
      "Captures each game's rules-page screenshot from the running dev server, or only the games named.";

    const { out } = await ran(["-h"], script({ nameLabel: "game id", about }));

    expect(out[0]?.split("\n").slice(0, 4)).toEqual([
      "Usage: yarn capture:screenshots [options] [game id ...]",
      "",
      "Captures each game's rules-page screenshot from the running dev server, or",
      "only the games named.",
    ]);
  });

  it.each([
    [["--port", "9003"], "Unknown option '--port'"],
    [["--url"], "Option '--url <value>' argument missing"],
    [["klondike"], "Unexpected argument 'klondike'"],
    [
      ["--url", "localhost:9003"],
      `--url takes an http or https address, not "localhost:9003".`,
    ],
  ])(
    "prints what is wrong with %j, a blank line and the usage as an error, and exits with 2, before Chrome starts",
    async (args, problem) => {
      const { code, out, err, started } = await ran(args);

      expect({ code, out, started }).toEqual({ code: 2, out: [], started: [] });
      expect(err.join("\n")).toMatch(
        new RegExp(
          `^${escaped(problem)}[^]*\\n\\nUsage: yarn capture:screenshots`,
        ),
      );
    },
  );

  it("exits with 1 when nothing answers at the server, saying so, before Chrome starts", async () => {
    expect(await ran(["--url", "http://127.0.0.1:9/"])).toEqual({
      code: 1,
      out: [],
      err: [
        "Nothing answers at http://127.0.0.1:9/; start the game with yarn dev.",
      ],
      started: [],
    });
  });

  it("gives up on a server that doesn't answer within five seconds, before Chrome starts", async () => {
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    const waited: number[] = [];
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      waited.push(ms);
      return timeout(10);
    });

    const result = await ran(["--url", silentUrl]);

    expect({ result, waited }).toEqual({
      result: {
        code: 1,
        out: [],
        err: [`Nothing answers at ${silentUrl}; start the game with yarn dev.`],
        started: [],
      },
      waited: [5000],
    });
  });

  it("asks the game's own server by default", async () => {
    const { err } = await ran([], script({ port: 9 }));

    expect(err).toEqual([
      "Nothing answers at http://localhost:9/; start the game with yarn dev.",
    ]);
  });
});
