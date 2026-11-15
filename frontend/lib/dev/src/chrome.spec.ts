import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { runInNewContext } from "node:vm";
import {
  type ChromeSearch,
  DevToolsConnection,
  type Page,
  findChrome,
  withChrome,
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

/** Returns the contexts a fake browser was told to dispose of, in order. */
function disposed(browser: FakeBrowser): unknown[] {
  return browser.sent
    .filter(({ method }) => method === "Target.disposeBrowserContext")
    .map(({ params }) => params["browserContextId"]);
}

/** Opens some pages on a connection at once, each used for nothing. */
async function openAtOnce(
  devtools: DevToolsConnection,
  count: number,
): Promise<void> {
  await Promise.all(
    Array.from({ length: count }, () =>
      withPage(devtools, VIEWPORT, () => Promise.resolve()),
    ),
  );
}

/** Returns twice a number: a helper a function run in a page calls. */
function double(n: number): number {
  return 2 * n;
}

/** Returns four times a number, through {@link double}: a helper that calls another. */
function quadruple(n: number): number {
  return double(double(n));
}

/** Returns four times the sum of two numbers, through {@link quadruple}. */
function quadrupleSum(a: number, b: number): number {
  return quadruple(a + b);
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

  it.each([0, 1.5])(
    "throws a RangeError for %s pages open at once",
    (pages) => {
      expect(() => new DevToolsConnection(new FakeBrowser(), pages)).toThrow(
        RangeError,
      );
    },
  );

  it.each([0, 1.5])(
    "refuses %s pages open at once before it opens a socket",
    async (pages) => {
      // Nothing listens at port 9, so a socket opened first would fail
      // otherwise than with a RangeError.
      await expect(
        DevToolsConnection.open("ws://127.0.0.1:9", pages),
      ).rejects.toThrow(RangeError);
    },
  );

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
      browserContextId: "ctx-1",
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
      browserContextId: "ctx-1",
    });
  });

  it("tells the page it has the focus, so a page opened beside it takes nothing from it", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, () => Promise.resolve());

    expect(browser.last("Emulation.setFocusEmulationEnabled")).toMatchObject({
      sessionId: "page-1",
      params: { enabled: true },
    });
  });

  it("closes the context each page opened, whichever closes first", async () => {
    const browser = new FakeBrowser();
    const devtools = new DevToolsConnection(browser, 2);

    await Promise.all([
      withPage(devtools, VIEWPORT, () => setTimeout(5)),
      withPage(devtools, VIEWPORT, () => Promise.resolve()),
    ]);

    expect(disposed(browser)).toEqual(["ctx-2", "ctx-1"]);
  });

  it("opens one page at a time on a connection that says no more", async () => {
    const browser = new FakeBrowser();

    await openAtOnce(new DevToolsConnection(browser), 3);

    expect(browser.mostContextsOpen()).toBe(1);
  });

  it("opens as many pages at once as its connection allows, and no more", async () => {
    const browser = new FakeBrowser();

    await openAtOnce(new DevToolsConnection(browser, 2), 5);

    expect(browser.mostContextsOpen()).toBe(2);
  });

  it("opens the pages that wait in the order they asked", async () => {
    const devtools = new DevToolsConnection(new FakeBrowser());
    const opened: number[] = [];

    await Promise.all(
      [0, 1, 2, 3].map((n) =>
        withPage(devtools, VIEWPORT, () => {
          opened.push(n);
          return Promise.resolve();
        }),
      ),
    );

    expect(opened).toEqual([0, 1, 2, 3]);
  });

  it("opens the next page once one's use fails", async () => {
    const devtools = new DevToolsConnection(new FakeBrowser());

    const [, next] = await Promise.allSettled([
      withPage(devtools, VIEWPORT, () => Promise.reject(new Error("broken"))),
      withPage(devtools, VIEWPORT, () => Promise.resolve("done")),
    ]);

    expect(next).toEqual({ status: "fulfilled", value: "done" });
  });

  it("has its connection open no more pages once it fails, where asked, before it hands its place on", async () => {
    const browser = new FakeBrowser();
    const devtools = new DevToolsConnection(browser);

    const [, next] = await Promise.allSettled([
      withPage(devtools, VIEWPORT, () => Promise.reject(new Error("broken")), {
        stopsOthersOnFailure: true,
      }),
      withPage(devtools, VIEWPORT, () => Promise.resolve("done")),
    ]);

    expect(next).toEqual({ status: "rejected", reason: new Error("broken") });
    expect(disposed(browser)).toEqual(["ctx-1"]);
  });

  it("has its connection open no more pages before it disposes of its context, as another may close meanwhile", async () => {
    const browser = new FakeBrowser({
      "Target.disposeBrowserContext": (command) =>
        command.params["browserContextId"] === "ctx-1"
          ? setTimeout(5).then(() => ({ result: {} }))
          : { result: {} },
    });
    const devtools = new DevToolsConnection(browser, 2);
    const stopping = { stopsOthersOnFailure: true };

    await Promise.allSettled([
      withPage(
        devtools,
        VIEWPORT,
        () => Promise.reject(new Error("broken")),
        stopping,
      ),
      withPage(devtools, VIEWPORT, () => Promise.resolve(), stopping),
      withPage(devtools, VIEWPORT, () => Promise.resolve(), stopping),
    ]);

    expect(disposed(browser)).toEqual(["ctx-1", "ctx-2"]);
  });

  it("holds its place till its context is disposed of", async () => {
    const browser = new FakeBrowser({
      "Target.disposeBrowserContext": () =>
        setTimeout(5).then(() => ({ result: {} })),
    });

    await openAtOnce(new DevToolsConnection(browser), 2);

    expect(browser.mostContextsOpen()).toBe(1);
  });

  it("refuses the pages waiting their turn once its connection opens no more, the page open going on", async () => {
    const devtools = new DevToolsConnection(new FakeBrowser());
    const open = withPage(devtools, VIEWPORT, () => setTimeout(5, "done"));
    const waiting = withPage(devtools, VIEWPORT, () => Promise.resolve());

    devtools.stopOpeningPages(new Error("A page failed."));

    await expect(waiting).rejects.toThrow("A page failed.");
    expect(await open).toBe("done");
  });

  it("refuses a page asked for after its connection opens no more, for the first reason it was given", async () => {
    const browser = new FakeBrowser();
    const devtools = new DevToolsConnection(browser);
    devtools.stopOpeningPages(new Error("The first failed."));
    devtools.stopOpeningPages(new Error("The second failed."));

    const opening = withPage(devtools, VIEWPORT, () => Promise.resolve());

    await expect(opening).rejects.toThrow("The first failed.");
    expect(browser.methods()).toEqual([]);
  });
});

describe("DevToolsConnection.reservePage", () => {
  it("hands a page's place on once, however often it says it has closed", async () => {
    const devtools = new DevToolsConnection(new FakeBrowser());
    const closed = await devtools.reservePage();
    const opened: string[] = [];
    void devtools.reservePage().then(() => opened.push("second"));
    void devtools.reservePage().then(() => opened.push("third"));

    closed();
    closed();
    await setTimeout(0);

    expect(opened).toEqual(["second"]);
  });
});

describe("Page", () => {
  it("sends its commands to its own session", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, (page) => page.send("Page.bringToFront"));

    expect(browser.last("Page.bringToFront")?.sessionId).toBe("page-1");
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

  it("runs a function in the page beside the helpers it calls, each in reach of the others", async () => {
    const browser = new FakeBrowser();

    await onPage(browser, (page) =>
      page.evaluateWith([quadruple, double], quadrupleSum, 1, 2),
    );

    const sent = browser.last("Runtime.evaluate")?.params["expression"];
    expect(runInNewContext(String(sent))).toBe(12);
  });

  it.each<[string, (n: number) => number, string]>([
    ["no name", (n) => n, ""],
    ["a bound function's name", double.bind(undefined), "bound double"],
  ])(
    "throws, sending nothing, for a helper of %s, which it can't be called by",
    async (_, helper, name) => {
      const browser = new FakeBrowser();

      const running = onPage(browser, (page) =>
        page.evaluateWith([helper], double, 1),
      );

      await expect(running).rejects.toThrow(
        `"${name}" isn't one it can be called by`,
      );
      expect(browser.last("Runtime.evaluate")).toBeUndefined();
    },
  );

  it("throws, sending nothing, for two helpers of one name", async () => {
    const browser = new FakeBrowser();

    const running = onPage(browser, (page) =>
      page.evaluateWith([double, quadruple, double], quadrupleSum, 1, 2),
    );

    await expect(running).rejects.toThrow(
      "Two helpers sent to a page are named double.",
    );
    expect(browser.last("Runtime.evaluate")).toBeUndefined();
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
        sessionId: "page-1",
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

describe("withChrome", () => {
  // Node takes Chrome's first option for one of its own it doesn't know, and
  // exits at once, as a Chrome that can't start does.
  it("says when Chrome exits before it starts, rather than waiting out its limit", async () => {
    const started = withChrome(
      { chrome: process.execPath, name: "fz-dev-spec" },
      () => Promise.resolve(),
    );

    await expect(started).rejects.toThrow(
      /^Chrome exited \(\d+\) before it started\.$/,
    );
  });

  // A shell script stands for a Chrome the system kills as it starts.
  it.skipIf(process.platform === "win32")(
    "says when a signal ends Chrome before it starts",
    async () => {
      const folder = await mkdtemp(join(tmpdir(), "fz-dev-chrome-"));
      onTestFinished(() => rm(folder, { recursive: true, force: true }));
      const chrome = join(folder, "chrome");
      await writeFile(chrome, "#!/bin/sh\nkill -KILL $$\n", { mode: 0o755 });

      const started = withChrome({ chrome, name: "fz-dev-spec" }, () =>
        Promise.resolve(),
      );

      await expect(started).rejects.toThrow(
        "Chrome exited (SIGKILL) before it started.",
      );
    },
  );

  it("says when there is no such Chrome to run", async () => {
    const chrome = join(tmpdir(), "fz-dev-no-such-chrome");

    const started = withChrome({ chrome, name: "fz-dev-spec" }, () =>
      Promise.resolve(),
    );

    await expect(started).rejects.toThrow(/ENOENT/);
  });
});
