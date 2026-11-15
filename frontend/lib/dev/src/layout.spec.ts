import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { setTimeout } from "node:timers/promises";
import {
  type ChromeOptions,
  DevToolsConnection,
  type withChrome,
} from "./chrome.ts";
import {
  type BoardBox,
  type LayoutCheck,
  type LayoutProblem,
  type LayoutScript,
  type PhaserBoard,
  PHASER_CHECKED_AT,
  SHAPES,
  SMALLEST,
  TURNS,
  checkLayout,
  checkPhaserLayout,
  checkTurns,
  runLayoutScript,
  shapesAt,
  whenAllSettle,
} from "./layout.ts";
import {
  type BoardInspection,
  readNamedRects,
  readRect,
} from "./board_page.ts";
import { recordingPrinter } from "./script.ts";
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

/** Words only the check of the game bar holds: its name. */
const BAR = "function barOutOfWindow";

/** A board drawn with Phaser, as a check describes it. */
const BOARD: PhaserBoard = {
  name: "field",
  element: "app-board",
  drawnAt: "data-field",
  across: 26,
  down: 30,
  placeholder: ".placeholder .field",
  ring: ".ring",
  card: ".card",
};

/** Where a board lies, as the page finds it. */
const BOX: BoardBox = { left: 40, top: 60, width: 260, height: 300, unit: 10 };

/** Words only the inspection of a board drawn with Phaser holds: its name. */
const BOARD_INSPECTION = "function inspectPhaserBoard";

/** Words only the wait for the page to draw holds: its name. */
const SETTLE = "function settle(";

/** Words only the inspection of a board's deck holds: its name. */
const DECK_INSPECTION = "function inspectPhaserDeck";

/** A board with a deck beside it, as a check describes it. */
const DECKED: PhaserBoard = {
  ...BOARD,
  deck: { drawnAt: "data-deck", zones: ["stick"], least: 112 },
};

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
 * Returns a fake browser whose pages find what the game's inspection, the
 * check of its bar and the inspections of its board and its deck each find,
 * and nothing else wrong, once they have drawn, as they do unless `drawn`
 * says otherwise, and which refuses to lay a page out at `refusedWidth`,
 * and lays one out late at `slowWidth`, where they name one.
 */
function browserFindingIn(
  found: {
    readonly own?: readonly string[];
    readonly bar?: readonly string[];
    readonly board?: BoardInspection;
    readonly deck?: readonly string[];
    readonly drawn?: boolean;
    readonly refusedWidth?: number;
    readonly slowWidth?: number;
  },
  ...events: readonly object[]
): FakeBrowser {
  const browser: FakeBrowser = new FakeBrowser({
    "Emulation.setDeviceMetricsOverride": (command: Command) => {
      const width = command.params["width"];
      if (width === found.refusedWidth) return { error: "No such width." };
      if (width === found.slowWidth) {
        return setTimeout(5).then(() => ({ result: {} }));
      }
      return { result: {} };
    },
    "Page.navigate": (command: Command) => {
      for (const event of events) {
        browser.emit({ sessionId: command.sessionId, ...event });
      }
      return { result: {} };
    },
    "Runtime.evaluate": (command: Command) => {
      const expression = String(command.params["expression"]);
      const answers: readonly (readonly [string, unknown])[] = [
        [SETTLE, found.drawn ?? true],
        [OWN, found.own ?? []],
        [BAR, found.bar ?? []],
        [BOARD_INSPECTION, found.board ?? { problems: [] }],
        [DECK_INSPECTION, found.deck ?? []],
      ];
      const value =
        answers.find(([words]) => expression.includes(words))?.[1] ?? [];
      return { result: { result: { value } } };
    },
  });
  return browser;
}

/** Returns the scripts a page was sent to run that hold some words. */
function evaluatedWith(browser: FakeBrowser, words: string): string[] {
  return browser.sent
    .filter(({ method }) => method === "Runtime.evaluate")
    .map(({ params }) => String(params["expression"]))
    .filter((expression) => expression.includes(words));
}

/** Returns the scripts a page was sent to run before its own, in order. */
function sentBeforeLoad(browser: FakeBrowser): string[] {
  return browser.sent
    .filter(({ method }) => method === "Page.addScriptToEvaluateOnNewDocument")
    .map(({ params }) => String(params["source"]));
}

/** Returns the widths a page was set to, in order. */
function widthsSet(browser: FakeBrowser): unknown[] {
  return browser.sent
    .filter(({ method }) => method === "Emulation.setDeviceMetricsOverride")
    .map(({ params }) => params["width"]);
}

/** Returns the width, height and pixel ratio a page was set to, in order. */
function viewportsSet(browser: FakeBrowser): unknown[][] {
  return browser.sent
    .filter(({ method }) => method === "Emulation.setDeviceMetricsOverride")
    .map(({ params }) => [
      params["width"],
      params["height"],
      params["deviceScaleFactor"],
    ]);
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

  it("throws where nothing matches the check's selector in time, saying so", async () => {
    const devtools = new DevToolsConnection(browserFindingIn({ drawn: false }));

    const checking = checkLayout(devtools, CHECK, ROOMY);

    await expect(checking).rejects.toThrow(
      new Error("Nothing matched main in 10000 ms."),
    );
  });

  it("waits for the check's selector as long as the check gives the page", async () => {
    const browser = browserFinding([]);

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, readyTimeoutMs: 60_000 },
      ROOMY,
    );

    expect(evaluatedWith(browser, SETTLE)).toEqual([
      expect.stringContaining(JSON.stringify(["main", 60_000])),
    ]);
  });

  it("throws where nothing matches the check's selector in the time it gives, saying so", async () => {
    const devtools = new DevToolsConnection(browserFindingIn({ drawn: false }));

    const checking = checkLayout(
      devtools,
      { ...CHECK, readyTimeoutMs: 60_000 },
      ROOMY,
    );

    await expect(checking).rejects.toThrow(
      new Error("Nothing matched main in 60000 ms."),
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

    expect(sentBeforeLoad(browser)).toEqual([`(${String(before)})(...[])`]);
  });

  it("hands what comes before the page's own scripts what the check gives it", async () => {
    const browser = browserFinding([]);
    const keep = (key: string, value: number): void => {
      localStorage.setItem(key, String(value));
    };

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, before: { run: keep, args: ["a", 2] } },
      ROOMY,
    );

    expect(sentBeforeLoad(browser)).toEqual([`(${String(keep)})(...["a",2])`]);
  });

  it("takes, as a type, only what comes before the page's own scripts takes", async () => {
    const browser = browserFinding([]);
    const keep = (key: string): void => {
      localStorage.setItem(key, "b");
    };

    await checkLayout(
      new DevToolsConnection(browser),
      // @ts-expect-error A number isn't the key it takes.
      { ...CHECK, before: { run: keep, args: [2] } },
      ROOMY,
    );

    // The type is the only guard: the page is sent what the check gives.
    expect(sentBeforeLoad(browser)).toEqual([`(${String(keep)})(...[2])`]);
  });

  it("runs nothing before the page's own scripts where a check doesn't ask", async () => {
    const browser = browserFinding([]);

    await checkLayout(new DevToolsConnection(browser), CHECK, ROOMY);

    expect(sentBeforeLoad(browser)).toEqual([]);
  });

  it("finds nothing wrong where nothing is", async () => {
    const devtools = new DevToolsConnection(browserFinding([]));

    expect(await checkLayout(devtools, CHECK)).toEqual([]);
  });

  it("opens as many shapes at once as its connection opens pages", async () => {
    const browser = browserFinding([]);

    await checkLayout(new DevToolsConnection(browser, 3), CHECK);

    expect(browser.mostContextsOpen()).toBe(3);
  });

  it("throws what failed where a page fails", async () => {
    const browser = browserFindingIn({
      refusedWidth: SHAPES[0]!.viewport.width,
    });

    const checked = checkLayout(new DevToolsConnection(browser, 3), CHECK);

    await expect(checked).rejects.toThrow("No such width.");
  });

  it("throws for a page that fails only once every page has closed", async () => {
    const browser = browserFindingIn({
      refusedWidth: SHAPES[0]!.viewport.width,
    });
    const devtools = new DevToolsConnection(browser, SHAPES.length);

    const openAsItThrew = await checkLayout(devtools, CHECK).then(
      () => "nothing failed",
      () => browser.contextsOpen(),
    );

    expect(openAsItThrew).toBe(0);
  });

  it("opens no more pages once one fails", async () => {
    const browser = browserFindingIn({
      refusedWidth: SHAPES[0]!.viewport.width,
    });

    await checkLayout(new DevToolsConnection(browser), CHECK).catch(
      () => undefined,
    );

    expect(
      browser.methods().filter((m) => m === "Target.createBrowserContext"),
    ).toHaveLength(1);
  });

  it("reports what is wrong in the shapes' order, though the first shape's page finishes last", async () => {
    const browser = browserFindingIn({
      own: ["Askew."],
      slowWidth: SHAPES[0]!.viewport.width,
    });
    const devtools = new DevToolsConnection(browser, 3);

    const problems = await checkLayout(devtools, CHECK);

    expect(problems.map((found) => found.shape)).toEqual(
      SHAPES.map((shape) => shape.name),
    );
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

  it("reports what is wrong with the check's board, before what the game's inspection finds", async () => {
    const devtools = new DevToolsConnection(
      browserFindingIn({
        board: { problems: ["The field runs out of the window."], box: BOX },
        own: ["The field's unit is 8 CSS px, under 10."],
      }),
    );

    const problems = await checkLayout(
      devtools,
      { ...CHECK, board: BOARD },
      ROOMY,
    );

    expect(problems.map(({ problem }) => problem)).toEqual([
      "The field runs out of the window.",
      "The field's unit is 8 CSS px, under 10.",
    ]);
  });

  it("inspects the check's board as the check describes it", async () => {
    const browser = browserFinding([]);

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, board: BOARD },
      ROOMY,
    );

    expect(evaluatedWith(browser, BOARD_INSPECTION)).toEqual([
      expect.stringContaining(JSON.stringify([BOARD])),
    ]);
  });

  it("inspects no board where the check has none", async () => {
    const browser = browserFinding([]);

    await checkLayout(new DevToolsConnection(browser), CHECK, ROOMY);

    expect(evaluatedWith(browser, BOARD_INSPECTION)).toEqual([]);
  });

  it("inspects the board's deck, with where the board lies, after the board", async () => {
    const devtools = new DevToolsConnection(
      browserFindingIn({
        board: { problems: ["The field runs out of the window."], box: BOX },
        deck: ["The deck's stick zone lies over the field."],
        own: ["The field's unit is 8 CSS px, under 10."],
      }),
    );

    const problems = await checkLayout(
      devtools,
      { ...CHECK, board: DECKED },
      ROOMY,
    );

    expect(problems.map(({ problem }) => problem)).toEqual([
      "The field runs out of the window.",
      "The deck's stick zone lies over the field.",
      "The field's unit is 8 CSS px, under 10.",
    ]);
  });

  it("hands the deck's inspection the board and where it lies", async () => {
    const browser = browserFindingIn({ board: { problems: [], box: BOX } });

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, board: DECKED },
      ROOMY,
    );

    expect(evaluatedWith(browser, DECK_INSPECTION)).toEqual([
      expect.stringContaining(JSON.stringify([DECKED, BOX])),
    ]);
  });

  it.each<[string, PhaserBoard, BoardInspection]>([
    ["the board has none", BOARD, { problems: [], box: BOX }],
    [
      "the board doesn't say where it lies",
      DECKED,
      { problems: ["app-board doesn't say where the field lies."] },
    ],
  ])("inspects no deck where %s", async (_, board, inspection) => {
    const browser = browserFindingIn({ board: inspection });

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, board },
      ROOMY,
    );

    expect(evaluatedWith(browser, DECK_INSPECTION)).toEqual([]);
  });

  it.each<[string, string, LayoutCheck]>([
    ["the board's", BOARD_INSPECTION, { ...CHECK, board: DECKED }],
    ["its deck's", DECK_INSPECTION, { ...CHECK, board: DECKED }],
    [
      "the game's own, handed where the board lies,",
      OWN,
      { ...CHECK, board: DECKED },
    ],
    [
      "the game's own, handed nothing where the check has no board,",
      OWN,
      CHECK,
    ],
  ])(
    "sends %s inspection into the page beside the readers of the rectangles a board writes",
    async (_, words, check) => {
      const browser = browserFindingIn({ board: { problems: [], box: BOX } });

      await checkLayout(new DevToolsConnection(browser), check, ROOMY);

      const sent = evaluatedWith(browser, words);
      expect(sent).toEqual([expect.stringContaining(String(readRect))]);
      expect(sent).toEqual([expect.stringContaining(String(readNamedRects))]);
    },
  );

  it("hands the game's inspection where the board lies", async () => {
    const browser = browserFindingIn({ board: { problems: [], box: BOX } });

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, board: BOARD },
      ROOMY,
    );

    expect(evaluatedWith(browser, OWN)).toEqual([
      expect.stringContaining(JSON.stringify([BOX])),
    ]);
  });

  it("hands the game's inspection nothing where the board doesn't say where it lies", async () => {
    const browser = browserFindingIn({
      board: { problems: ["app-board doesn't say where the field lies."] },
    });

    await checkLayout(
      new DevToolsConnection(browser),
      { ...CHECK, board: BOARD },
      ROOMY,
    );

    expect(evaluatedWith(browser, OWN)).toEqual([
      expect.stringMatching(/\(\.\.\.\[\]\)$/),
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

  it("turns as many windows at once as its connection opens pages", async () => {
    const browser = browserFinding([]);

    await checkTurns(new DevToolsConnection(browser, 2), CHECK);

    expect(browser.mostContextsOpen()).toBe(2);
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

describe("checkPhaserLayout", () => {
  it("opens the game at every shape and the smallest phone, then through every turn, all at twice the pixels", async () => {
    const browser = browserFinding([]);

    await checkPhaserLayout(new DevToolsConnection(browser), CHECK);

    expect(viewportsSet(browser)).toEqual([
      ...[...SHAPES, SMALLEST].map(({ viewport }) => [
        viewport.width,
        viewport.height,
        2,
      ]),
      ...TURNS.flatMap(({ from, to }) => [
        [from.width, from.height, 2],
        [to.width, to.height, 2],
      ]),
    ]);
  });

  it("reports what is wrong at each shape and after each turn, by the names it says it checks at", async () => {
    const devtools = new DevToolsConnection(
      browserFinding(["The board is drawn small."]),
    );

    const problems = await checkPhaserLayout(devtools, CHECK);

    expect(problems.map((found) => found.shape).join(", ")).toBe(
      PHASER_CHECKED_AT,
    );
  });

  it("checks its shapes and its turns side by side, every page at once where its connection opens that many", async () => {
    const browser = browserFinding([]);
    const pages = SHAPES.length + 1 + TURNS.length;

    await checkPhaserLayout(new DevToolsConnection(browser, pages), CHECK);

    expect(browser.mostContextsOpen()).toBe(pages);
  });

  it("opens no more pages at once than its connection opens", async () => {
    const browser = browserFinding([]);

    await checkPhaserLayout(new DevToolsConnection(browser, 4), CHECK);

    expect(browser.mostContextsOpen()).toBe(4);
  });

  it("reports the shapes before the turns, by the names it says it checks at, though the shapes finish last", async () => {
    const browser = browserFindingIn({
      own: ["The board is drawn small."],
      slowWidth: SHAPES[0]!.viewport.width,
    });
    const devtools = new DevToolsConnection(browser, 4);

    const problems = await checkPhaserLayout(devtools, CHECK);

    expect(problems.map((found) => found.shape).join(", ")).toBe(
      PHASER_CHECKED_AT,
    );
  });
});

describe("whenAllSettle", () => {
  it("returns what each check found, in their order", async () => {
    const slow = setTimeout(5, "slow");

    expect(await whenAllSettle([slow, Promise.resolve(2)])).toEqual([
      "slow",
      2,
    ]);
  });

  it("throws the first to fail in their order, not the first to fail", async () => {
    const late = setTimeout(5).then(() => {
      throw new Error("The first failed.");
    });
    const early = Promise.reject(new Error("The second failed."));

    await expect(whenAllSettle([late, early])).rejects.toThrow(
      "The first failed.",
    );
  });

  it("throws only once every check has settled", async () => {
    const settled: string[] = [];
    const failing = Promise.reject(new Error("Failed."));
    const slow = setTimeout(5).then(() => settled.push("the slow check"));

    await whenAllSettle([failing, slow]).catch(() => settled.push("thrown"));

    expect(settled).toEqual(["the slow check", "thrown"]);
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

describe("runLayoutScript", () => {
  let root = "";
  let printer = recordingPrinter();

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "fz-layout-"));
    printer = recordingPrinter();
  });

  afterEach(async () => {
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
      return use(
        new DevToolsConnection(new FakeBrowser({}), options.pagesAtOnce),
      );
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
      ...printer,
      runChrome: fakeChrome(),
    });

    expect(served).toContain("The game, built");
  });

  it("stops serving the build once the checks are done", async () => {
    await build("The game");
    const kept: string[] = [];

    await runLayoutScript(script([], keepingAddress(kept)), {
      args: [],
      ...printer,
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
      ...printer,
      runChrome: fakeChrome(),
    });

    await expect(running).rejects.toThrow("Chrome went away.");
    await expect(fetch(kept[0] ?? "")).rejects.toThrow("fetch failed");
  });

  it("says the layout holds where nothing is wrong, and succeeds", async () => {
    await build("The game");

    const code = await runLayoutScript(script(), {
      args: [],
      ...printer,
      runChrome: fakeChrome(),
    });

    expect({ code, out: printer.out }).toEqual({
      code: 0,
      out: ["Game's layout holds at each shape."],
    });
  });

  it("prints what is wrong at each shape, and fails", async () => {
    await build("The game");
    const found = [{ shape: "roomy", problem: "The board is missing." }];

    const code = await runLayoutScript(script(found), {
      args: [],
      ...printer,
      runChrome: fakeChrome(),
    });

    expect({ code, out: printer.out, err: printer.err }).toEqual({
      code: 1,
      out: [],
      err: ["roomy: The board is missing."],
    });
  });

  it("starts the Chrome the command line names, its profile named for the game's folder, four pages open at once", async () => {
    await build("The game");
    const started: ChromeOptions[] = [];

    await runLayoutScript(script(), {
      args: ["--chrome", "/opt/chrome"],
      env: {},
      ...printer,
      runChrome: fakeChrome(started),
    });

    expect(started).toEqual([
      { chrome: "/opt/chrome", name: basename(root), pagesAtOnce: 4 },
    ]);
  });

  it.each<[string, Record<string, string>, readonly string[], number]>([
    ["two on CI", { CI: "true" }, [], 2],
    ["four where CI isn't true", { CI: "false" }, [], 4],
    ["as many as --pages says", { CI: "true" }, ["--pages", "3"], 3],
  ])("opens %s at once", async (_, env, args, pages) => {
    await build("The game");
    const started: ChromeOptions[] = [];

    await runLayoutScript(script(), {
      args,
      env,
      ...printer,
      runChrome: fakeChrome(started),
    });

    expect(started.map((options) => options.pagesAtOnce)).toEqual([pages]);
  });

  it("refuses --pages that isn't a whole number from 1, with its usage, checking nothing", async () => {
    const started: ChromeOptions[] = [];

    const code = await runLayoutScript(script(), {
      args: ["--pages", "0"],
      ...printer,
      runChrome: fakeChrome(started),
    });

    expect({ code, started }).toEqual({ code: 2, started: [] });
    expect(printer.err.join("\n")).toMatch(
      /^--pages takes a whole number from 1, not "0"[^]*Usage: yarn check:layout/,
    );
  });

  it("prints its usage for --help, naming the game, and checks nothing", async () => {
    const started: ChromeOptions[] = [];

    const code = await runLayoutScript(script(), {
      args: ["--help"],
      ...printer,
      runChrome: fakeChrome(started),
    });

    expect({ code, started }).toEqual({ code: 0, started: [] });
    expect(printer.out.join("\n")).toMatch(
      /^Usage: yarn check:layout.*\n\nChecks Game's layout[^]*--chrome <path>[^]*--pages <n>/,
    );
  });

  it("reports an option it doesn't know, with its usage, and fails, checking nothing", async () => {
    const started: ChromeOptions[] = [];

    const code = await runLayoutScript(script(), {
      args: ["--bogus"],
      ...printer,
      runChrome: fakeChrome(started),
    });

    expect({ code, started }).toEqual({ code: 2, started: [] });
    expect(printer.err.join("\n")).toMatch(
      /^Unknown option '--bogus'[^]*Usage: yarn check:layout/,
    );
  });

  it("throws for a game with no build, saying to build it first", async () => {
    const running = runLayoutScript(script(), {
      args: [],
      ...printer,
      runChrome: fakeChrome(),
    });

    await expect(running).rejects.toThrow(
      "Found no build to check; run yarn build first.",
    );
  });
});
