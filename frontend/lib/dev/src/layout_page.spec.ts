// @vitest-environment jsdom
import { DevToolsConnection, Page } from "./chrome.ts";
import { settled } from "./screenshots.ts";
import { FakeBrowser } from "./testing/fake_browser.ts";

/** Returns the expression `settled()` has the page run to wait for a selector. */
async function sentExpression(
  selector: string,
  timeoutMs: number,
): Promise<string> {
  const browser = new FakeBrowser();
  await settled(
    new Page(new DevToolsConnection(browser), "page"),
    selector,
    timeoutMs,
  );
  return String(browser.last("Runtime.evaluate")?.params["expression"]);
}

// settle() runs as the page runs it, from its source alone, so it fails if
// it reaches for anything outside itself, with the page's frames and clock
// faked and its fonts loaded.
describe("settle, as settled() sends it", () => {
  beforeEach(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  /**
   * Starts settle() in the page, from the source settled() sends, under the
   * page's faked frames and clock, and returns what it resolves to.
   */
  async function settling(
    selector: string,
    timeoutMs: number,
  ): Promise<{ readonly settles: Promise<unknown> }> {
    const expression = await sentExpression(selector, timeoutMs);
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "performance"] });
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the page runs it as source too.
    const run = new Function(`return ${expression}`) as () => Promise<unknown>;
    return { settles: run() };
  }

  it("resolves to true once the page matches the selector and has drawn twice more", async () => {
    const { settles } = await settling("main.ready", 500);
    await vi.advanceTimersByTimeAsync(100);

    document.body.innerHTML = '<main class="ready"></main>';
    await vi.advanceTimersByTimeAsync(100);

    expect(await settles).toBe(true);
  });

  it("resolves to false once its time has passed with nothing matched", async () => {
    document.body.innerHTML = "<main></main>";
    const { settles } = await settling("main.ready", 500);

    await vi.advanceTimersByTimeAsync(600);

    expect(await settles).toBe(false);
  });
});
