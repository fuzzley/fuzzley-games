import { DevToolsConnection } from "./chrome.ts";
import { type LayoutCheck, SHAPES, checkLayout } from "./layout.ts";
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

/**
 * Returns a fake browser whose pages find nothing wrong but what the game's
 * inspection finds, and which report some events once they navigate.
 */
function browserFinding(
  found: readonly string[],
  ...events: readonly object[]
): FakeBrowser {
  const browser: FakeBrowser = new FakeBrowser({
    "Page.navigate": () => {
      for (const event of events) browser.emit({ sessionId: "page", ...event });
      return { result: {} };
    },
    "Runtime.evaluate": (command: Command) => {
      const ownInspection = String(command.params["expression"]).includes(OWN);
      return { result: { result: { value: ownInspection ? found : [] } } };
    },
  });
  return browser;
}

describe("checkLayout", () => {
  it("opens the game at every shape", async () => {
    const browser = browserFinding([]);

    await checkLayout(new DevToolsConnection(browser), CHECK);

    expect(
      browser.sent
        .filter(({ method }) => method === "Emulation.setDeviceMetricsOverride")
        .map(({ params }) => params["width"]),
    ).toEqual(SHAPES.map((shape) => shape.viewport.width));
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
