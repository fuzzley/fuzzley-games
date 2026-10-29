import { DevToolsConnection } from "./chrome.ts";
import {
  type LayoutCheck,
  SHAPES,
  TURNS,
  checkLayout,
  checkTurns,
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
