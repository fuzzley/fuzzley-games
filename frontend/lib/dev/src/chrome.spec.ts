import {
  type ChromeSearch,
  DevToolsConnection,
  type Page,
  findChrome,
  withPage,
} from "./chrome.ts";
import { FakeBrowser, VIEWPORT } from "./testing/fake_browser.ts";

/** Opens a page on a fake browser and hands it to `use`. */
async function onPage<T>(
  browser: FakeBrowser,
  use: (page: Page) => Promise<T>,
): Promise<T> {
  return withPage(new DevToolsConnection(browser), VIEWPORT, use);
}

describe("DevToolsConnection", () => {
  it("resolves a command with its reply", async () => {
    const browser = new FakeBrowser({
      "Browser.getVersion": { result: { product: "Chrome/150" } },
    });
    const devtools = new DevToolsConnection(browser);

    const version = await devtools.send("Browser.getVersion");

    expect(version).toEqual({ product: "Chrome/150" });
  });

  it("numbers each command, so each reply finds its own", async () => {
    const browser = new FakeBrowser();
    const devtools = new DevToolsConnection(browser);

    await Promise.all([devtools.send("A.one"), devtools.send("A.two")]);

    expect(browser.sent.map((command) => command.id)).toEqual([1, 2]);
  });

  it("rejects a command DevTools refuses", async () => {
    const browser = new FakeBrowser({
      "Page.navigate": { error: "Cannot navigate to invalid URL" },
    });
    const devtools = new DevToolsConnection(browser);

    await expect(
      devtools.send("Page.navigate", { url: "nowhere" }, "page"),
    ).rejects.toThrow("Cannot navigate to invalid URL");
  });

  it("resolves the next event of a kind from a page", async () => {
    const browser = new FakeBrowser();
    const devtools = new DevToolsConnection(browser);
    const loaded = devtools.next("Page.loadEventFired", "page");

    browser.emit({ method: "Page.loadEventFired", sessionId: "other" });
    browser.emit({
      method: "Page.loadEventFired",
      sessionId: "page",
      params: { timestamp: 2 },
    });

    expect(await loaded).toEqual({ timestamp: 2 });
  });

  it("calls a listener with every event of a kind from a page, until stopped", () => {
    const browser = new FakeBrowser();
    const devtools = new DevToolsConnection(browser);
    const heard: unknown[] = [];
    const stop = devtools.on("Log.entryAdded", "page", (params) => {
      heard.push(params);
    });

    browser.emit({ method: "Log.entryAdded", sessionId: "page", params: 1 });
    browser.emit({ method: "Log.entryAdded", sessionId: "other", params: 2 });
    browser.emit({ method: "Log.entryAdded", sessionId: "page", params: 3 });
    stop();
    browser.emit({ method: "Log.entryAdded", sessionId: "page", params: 4 });

    expect(heard).toEqual([1, 3]);
  });

  it("closes its socket", () => {
    const browser = new FakeBrowser();
    const devtools = new DevToolsConnection(browser);

    devtools.close();

    expect(browser.closed).toBe(true);
  });
});

describe("withPage", () => {
  it("opens the page at the viewport, in a context of its own", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, () => Promise.resolve());

    expect(browser.last("Target.createTarget")?.params).toEqual({
      url: "about:blank",
      browserContextId: "ctx",
    });
    expect(browser.last("Emulation.setDeviceMetricsOverride")?.params).toEqual({
      ...VIEWPORT,
      mobile: false,
    });
  });

  it("returns what the page was used for", async () => {
    const browser = new FakeBrowser();

    const result = await onPage(browser, () => Promise.resolve("done"));

    expect(result).toBe("done");
  });

  it("closes the context even when the page's use fails", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, () => Promise.reject(new Error("broken"))).catch(
      () => undefined,
    );

    expect(browser.last("Target.disposeBrowserContext")?.params).toEqual({
      browserContextId: "ctx",
    });
  });
});

describe("Page", () => {
  it("sends its commands to its own session", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, (page) => page.send("Page.bringToFront"));

    expect(browser.last("Page.bringToFront")?.sessionId).toBe("page");
  });

  it("navigates and waits for the page to load", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, (page) => page.navigate("http://localhost:9000/"));

    expect(browser.last("Page.navigate")?.params).toEqual({
      url: "http://localhost:9000/",
    });
  });

  it("reloads and waits for the page to load", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, (page) => page.reload());

    expect(browser.methods()).toContain("Page.reload");
  });

  it("runs a function in the page with its arguments", async () => {
    const browser = new FakeBrowser();
    const join = (a: number, b: string): string => `${a}${b}`;

    await onPage(browser, (page) => page.evaluate(join, 1, "x"));

    expect(browser.last("Runtime.evaluate")?.params).toEqual({
      expression: `(${String(join)})(...[1,"x"])`,
      awaitPromise: true,
      returnByValue: true,
    });
  });

  it("returns what a function run in the page resolves to", async () => {
    const browser = new FakeBrowser({
      "Runtime.evaluate": { result: { result: { value: 42 } } },
    });

    const value = await onPage(browser, (page) => page.evaluate(() => 42));

    expect(value).toBe(42);
  });

  it("throws what a function run in the page threw", async () => {
    const browser = new FakeBrowser({
      "Runtime.evaluate": {
        result: {
          result: {},
          exceptionDetails: {
            text: "Uncaught",
            exception: { description: "Error: no board" },
          },
        },
      },
    });

    const running = onPage(browser, (page) => page.evaluate(() => 0));

    await expect(running).rejects.toThrow("Error: no board");
  });

  it("says a function run in the page threw, when DevTools can't say what", async () => {
    const browser = new FakeBrowser({
      "Runtime.evaluate": {
        result: { result: {}, exceptionDetails: { text: "Uncaught" } },
      },
    });

    const running = onPage(browser, (page) => page.evaluate(() => 0));

    await expect(running).rejects.toThrow("Uncaught");
  });

  it("listens to its own page's events", async () => {
    const browser = new FakeBrowser();
    const heard: unknown[] = [];

    await onPage(browser, (page) => {
      page.on("Runtime.exceptionThrown", (params) => {
        heard.push(params);
      });
      browser.emit({
        method: "Runtime.exceptionThrown",
        sessionId: "page",
        params: { exceptionDetails: { text: "Uncaught" } },
      });
      return Promise.resolve();
    });

    expect(heard).toEqual([{ exceptionDetails: { text: "Uncaught" } }]);
  });

  it("runs a function before the page's own scripts", async () => {
    const browser = new FakeBrowser();

    const prepare = (seed: number): void => {
      console.log(seed);
    };

    await onPage(browser, (page) => page.beforeLoad(prepare, 7));

    expect(
      browser.last("Page.addScriptToEvaluateOnNewDocument")?.params,
    ).toEqual({ source: `(${String(prepare)})(...[7])` });
  });

  it("returns a screenshot as the PNG's bytes", async () => {
    const browser = new FakeBrowser({
      "Page.captureScreenshot": {
        result: { data: Buffer.from("png").toString("base64") },
      },
    });

    const png = await onPage(browser, (page) => page.screenshot());

    expect(png.toString()).toBe("png");
  });
});

describe("findChrome", () => {
  /** A search of a Linux machine with only Chromium installed. */
  const search: ChromeSearch = {
    env: {},
    platform: "linux",
    exists: (path) => Promise.resolve(path === "/usr/bin/chromium"),
  };

  it("takes the Chrome asked for", async () => {
    expect(await findChrome("/opt/chrome", search)).toBe("/opt/chrome");
  });

  it("takes the Chrome CHROME_PATH names", async () => {
    const named = { ...search, env: { CHROME_PATH: "/opt/beta" } };

    expect(await findChrome(undefined, named)).toBe("/opt/beta");
  });

  it("takes the first Chrome installed in a usual place", async () => {
    expect(await findChrome(undefined, search)).toBe("/usr/bin/chromium");
  });

  it("says when it finds none", async () => {
    const bare = { ...search, platform: "aix" as const };

    await expect(findChrome(undefined, bare)).rejects.toThrow(
      "Found no Chrome",
    );
  });
});
