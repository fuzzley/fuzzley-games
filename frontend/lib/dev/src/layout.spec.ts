import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  type ChromeOptions,
  DevToolsConnection,
  type withChrome,
} from "./chrome.ts";
import {
  type LayoutCheck,
  type LayoutProblem,
  type LayoutScript,
  SHAPES,
  TURNS,
  checkLayout,
  checkTurns,
  runLayoutScript,
  shapesAt,
  turnsAt,
} from "./layout.ts";
import { type Command, FakeBrowser } from "./testing/fake_browser.ts";

/** Words only the game's inspection holds, for the fake browser to spot. */
const OWN = "the game's own inspection";

/**
 * A check whose inspection the fake browser can tell from the rest, by the
 * words in its source.
 */
const CHECK: LayoutCheck = {
  url: "http://localhost:4173/",
  ready: "main",
  inspect: () => ["the game's own inspection"],
};

/** The first shape alone, for a spec that needs only one. */
const ROOMY = SHAPES.slice(0, 1);

/** Words only the check of the game bar holds. */
const BAR = "fz-game-bar button";

/**
 * Returns a fake browser whose pages find nothing wrong but what the game's
 * inspection finds, and the check of its bar, and which report some events
 * once they navigate.
 */
function browserFinding(
  found: readonly string[],
  ...events: readonly object[]
): FakeBrowser {
  return browserFindingIn({ own: found }, ...events);
}

/**
 * Returns a fake browser whose pages find what the game's inspection and the
 * check of its bar each find, and nothing else wrong.
 */
function browserFindingIn(
  found: { readonly own?: readonly string[]; readonly bar?: readonly string[] },
  ...events: readonly object[]
): FakeBrowser {
  const browser: FakeBrowser = new FakeBrowser({
    "Page.navigate": () => {
      for (const event of events) browser.emit({ sessionId: "page", ...event });
      return { result: {} };
    },
    "Runtime.evaluate": (command: Command) => {
      const expression = String(command.params["expression"]);
      const value = expression.includes(OWN)
        ? (found.own ?? [])
        : expression.includes(BAR)
          ? (found.bar ?? [])
          : [];
      return { result: { result: { value } } };
    },
  });
  return browser;
}

/** Returns the widths a page was set to, in order. */
function widthsSet(browser: FakeBrowser): unknown[] {
  return browser.sent
    .filter(({ method }) => method === "Emulation.setDeviceMetricsOverride")
    .map(({ params }) => params["width"]);
}

describe("checkLayout", () => {
  it("opens the game at every shape", async () => {
    const browser = browserFinding([]);

    await checkLayout(new DevToolsConnection(browser), CHECK);

    expect(widthsSet(browser)).toEqual(
      SHAPES.map((shape) => shape.viewport.width),
    );
  });

  it("opens the game at a small phone, upright and on its side", () => {
    expect(SHAPES.map((shape) => shape.name)).toEqual(
      expect.arrayContaining(["small phone portrait", "small phone landscape"]),
    );
  });

  it("reports a control of the game bar that runs out of the window", async () => {
    const devtools = new DevToolsConnection(
      browserFindingIn({
        bar: ["The bar's More actions runs out of the window."],
      }),
    );

    const problems = await checkLayout(devtools, CHECK, ROOMY);

    expect(problems).toEqual([
      {
        shape: "roomy",
        problem: "The bar's More actions runs out of the window.",
      },
    ]);
  });

  it("runs what comes before the page's own scripts, where a check has it", async () => {
    const browser = browserFinding([]);

    const before = (): void => {
      localStorage.setItem("a", "b");
    };

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, before },
      ROOMY,
    );

    expect(
      browser.sent
        .filter(
          ({ method }) => method === "Page.addScriptToEvaluateOnNewDocument",
        )
        .map(({ params }) => String(params["source"])),
    ).toEqual([expect.stringContaining("localStorage.setItem")]);
  });

  it("runs nothing before the page's own scripts where a check doesn't ask", async () => {
    const browser = browserFinding([]);

    await checkLayout(new DevToolsConnection(browser), CHECK, ROOMY);

    expect(
      browser.sent.some(
        ({ method }) => method === "Page.addScriptToEvaluateOnNewDocument",
      ),
    ).toBe(false);
  });

  it("finds nothing wrong where nothing is", async () => {
    const devtools = new DevToolsConnection(browserFinding([]));

    expect(await checkLayout(devtools, CHECK)).toEqual([]);
  });

  it("reports what the game's inspection finds, by shape", async () => {
    const devtools = new DevToolsConnection(
      browserFinding(["The board isn't square."]),
    );

    const problems = await checkLayout(devtools, CHECK, ROOMY);

    expect(problems).toEqual([
      { shape: "roomy", problem: "The board isn't square." },
    ]);
  });

  it("reports what the page says is an error, and nothing else it says", async () => {
    const devtools = new DevToolsConnection(
      browserFinding(
        [],
        {
          method: "Runtime.exceptionThrown",
          params: {
            exceptionDetails: {
              text: "Uncaught",
              exception: { description: "Error: no board" },
            },
          },
        },
        {
          method: "Runtime.exceptionThrown",
          params: { exceptionDetails: { text: "Uncaught (in promise)" } },
        },
        {
          method: "Runtime.consoleAPICalled",
          params: { type: "error", args: [{ value: "Bad" }, { value: 2 }] },
        },
        {
          method: "Runtime.consoleAPICalled",
          params: { type: "error", args: [{ description: "Error: odd" }] },
        },
        {
          method: "Runtime.consoleAPICalled",
          params: { type: "log", args: [{ value: "Fine" }] },
        },
        {
          method: "Log.entryAdded",
          params: { entry: { level: "error", text: "Refused to load" } },
        },
        {
          method: "Log.entryAdded",
          params: { entry: { level: "warning", text: "Slow" } },
        },
      ),
    );

    const problems = await checkLayout(devtools, CHECK, ROOMY);

    expect(problems.map(({ problem }) => problem)).toEqual([
      "Uncaught: Error: no board",
      "Uncaught: Uncaught (in promise)",
      "console.error: Bad 2",
      "console.error: Error: odd",
      "Refused to load",
    ]);
  });
});

describe("checkTurns", () => {
  it("opens the game where each turn starts, then turns it", async () => {
    const browser = browserFinding([]);

    await checkTurns(new DevToolsConnection(browser), CHECK);

    expect(widthsSet(browser)).toEqual(
      TURNS.flatMap((turn) => [turn.from.width, turn.to.width]),
    );
  });

  it("turns a phone upright to its side, and on its side upright", () => {
    expect(
      TURNS.map(({ from, to }) => [
        from.width < from.height,
        to.width < to.height,
      ]),
    ).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it("finds nothing wrong where nothing is", async () => {
    const devtools = new DevToolsConnection(browserFinding([]));

    expect(await checkTurns(devtools, CHECK)).toEqual([]);
  });

  it("reports what is wrong after the turn, by the turn", async () => {
    const devtools = new DevToolsConnection(
      browserFinding(["The board is drawn small."]),
    );

    const problems = await checkTurns(devtools, CHECK, TURNS.slice(0, 1));

    expect(problems).toEqual([
      {
        shape: "phone portrait, turned on its side",
        problem: "The board is drawn small.",
      },
    ]);
  });
});

describe("shapesAt", () => {
  it("sets each shape's pixel ratio, keeping its size", () => {
    const [roomy] = shapesAt(2, SHAPES);

    expect(roomy?.viewport).toEqual({
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
    });
  });
});

describe("turnsAt", () => {
  it("sets the pixel ratio a turn starts and ends at", () => {
    const [turn] = turnsAt(2, TURNS);

    expect([turn?.from.deviceScaleFactor, turn?.to.deviceScaleFactor]).toEqual([
      2, 2,
    ]);
  });
});

describe("runLayoutScript", () => {
  let root = "";
  let printed: string[] = [];
  let reported: string[] = [];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "fz-layout-"));
    printed = [];
    reported = [];
    vi.spyOn(console, "log").mockImplementation((words: string) => {
      printed.push(words);
    });
    vi.spyOn(console, "error").mockImplementation((words: string) => {
      reported.push(words);
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  /** Writes a build into the game's folder, its page saying `words`. */
  async function build(words: string): Promise<void> {
    await mkdir(join(root, "dist"));
    await writeFile(join(root, "dist/index.html"), `<p>${words}</p>`);
  }

  /** Returns a script for the game, whose checks find what is given. */
  function script(
    found: readonly LayoutProblem[] = [],
    check: LayoutScript["check"] = () => Promise.resolve([...found]),
  ): LayoutScript {
    return { game: "Game", root, check, holds: "at each shape" };
  }

  /**
   * Returns a stand-in for Chrome that hands the script a connection to a
   * fake browser, and keeps the options it was started with.
   */
  function fakeChrome(started: ChromeOptions[] = []): typeof withChrome {
    return async (options, use) => {
      started.push(options);
      return use(new DevToolsConnection(new FakeBrowser({})));
    };
  }

  /**
   * Returns checks that keep the address the build is served at, then find
   * nothing wrong, or throw `thrown`.
   */
  function keepingAddress(
    kept: string[],
    thrown?: Error,
  ): LayoutScript["check"] {
    return (_, url) => {
      kept.push(url);
      return thrown ? Promise.reject(thrown) : Promise.resolve([]);
    };
  }

  it("serves the build, and hands the game's checks its address", async () => {
    await build("The game, built");
    let served = "";
    const check = async (
      _: DevToolsConnection,
      url: string,
    ): Promise<LayoutProblem[]> => {
      served = await (await fetch(url)).text();
      return [];
    };

    await runLayoutScript(script([], check), {
      args: [],
      runChrome: fakeChrome(),
    });

    expect(served).toContain("The game, built");
  });

  it("stops serving the build once the checks are done", async () => {
    await build("The game");
    const kept: string[] = [];

    await runLayoutScript(script([], keepingAddress(kept)), {
      args: [],
      runChrome: fakeChrome(),
    });

    await expect(fetch(kept[0] ?? "")).rejects.toThrow("fetch failed");
  });

  it("throws what the checks throw, and stops serving the build", async () => {
    await build("The game");
    const kept: string[] = [];
    const check = keepingAddress(kept, new Error("Chrome went away."));

    const running = runLayoutScript(script([], check), {
      args: [],
      runChrome: fakeChrome(),
    });

    await expect(running).rejects.toThrow("Chrome went away.");
    await expect(fetch(kept[0] ?? "")).rejects.toThrow("fetch failed");
  });

  it("says the layout holds where nothing is wrong, and succeeds", async () => {
    await build("The game");

    const code = await runLayoutScript(script(), {
      args: [],
      runChrome: fakeChrome(),
    });

    expect({ code, printed }).toEqual({
      code: 0,
      printed: ["Game's layout holds at each shape."],
    });
  });

  it("prints what is wrong at each shape, and fails", async () => {
    await build("The game");
    const found = [{ shape: "roomy", problem: "The board is missing." }];

    const code = await runLayoutScript(script(found), {
      args: [],
      runChrome: fakeChrome(),
    });

    expect({ code, reported, printed }).toEqual({
      code: 1,
      reported: ["roomy: The board is missing."],
      printed: [],
    });
  });

  it("starts the Chrome the command line names, its profile named for the game's folder", async () => {
    await build("The game");
    const started: ChromeOptions[] = [];

    await runLayoutScript(script(), {
      args: ["--chrome", "/opt/chrome"],
      runChrome: fakeChrome(started),
    });

    expect(started).toEqual([{ chrome: "/opt/chrome", name: basename(root) }]);
  });

  it("prints its usage for --help, naming the game, and checks nothing", async () => {
    const started: ChromeOptions[] = [];

    const code = await runLayoutScript(script(), {
      args: ["--help"],
      runChrome: fakeChrome(started),
    });

    expect({ code, started }).toEqual({ code: 0, started: [] });
    expect(printed.join("\n")).toMatch(
      /^Usage: yarn check:layout.*\n\nChecks Game's layout[^]*--chrome <path>/,
    );
  });

  it("reports an option it doesn't know, with its usage, and fails, checking nothing", async () => {
    const started: ChromeOptions[] = [];

    const code = await runLayoutScript(script(), {
      args: ["--bogus"],
      runChrome: fakeChrome(started),
    });

    expect({ code, started }).toEqual({ code: 2, started: [] });
    expect(reported.join("\n")).toMatch(
      /^Unknown option '--bogus'[^]*Usage: yarn check:layout/,
    );
  });

  it("throws for a game with no build, saying to build it first", async () => {
    const running = runLayoutScript(script(), {
      args: [],
      runChrome: fakeChrome(),
    });

    await expect(running).rejects.toThrow(
      "Found no build to check; run yarn build first.",
    );
  });
});
