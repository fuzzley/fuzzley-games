// @vitest-environment jsdom
import { THEME_STORAGE_KEY } from "@fz/style/themes";
import {
  type PhaserPageState,
  describePhaserPage,
  readRect,
} from "./board_page.ts";
import { DevToolsConnection, Page } from "./chrome.ts";
import { preparePage } from "./screenshot_page.ts";
import { setUpPage } from "./screenshots.ts";
import { FakeBrowser } from "./testing/fake_browser.ts";

/** Where the specs keep the palette, as the games keep it under their own key. */
const THEME_KEY = "spec-theme";

describe("preparePage", () => {
  const random = Math.random;

  afterEach(() => {
    localStorage.clear();
    Math.random = random;
  });

  it("stores the palette under the key it is given", () => {
    preparePage({ theme: "casino" }, THEME_KEY);

    expect(localStorage.getItem(THEME_KEY)).toBe("casino");
  });

  it("stores each entry as it is given", () => {
    preparePage(
      { stored: { "spec-game": '{"score":12}', "spec-stats": "{}" } },
      THEME_KEY,
    );

    expect([
      localStorage.getItem("spec-game"),
      localStorage.getItem("spec-stats"),
      localStorage.getItem(THEME_KEY),
    ]).toEqual(['{"score":12}', "{}", null]);
  });

  it("merges fields into what is stored under a key, keeping the rest", () => {
    localStorage.setItem("spec-game", '{"seconds":3,"moves":[1,2]}');

    preparePage({ merged: { "spec-game": { seconds: 84 } } }, THEME_KEY);

    expect(localStorage.getItem("spec-game")).toBe(
      '{"seconds":84,"moves":[1,2]}',
    );
  });

  it("merges nothing into a key with nothing stored", () => {
    preparePage({ merged: { "spec-game": { seconds: 84 } } }, THEME_KEY);

    expect(localStorage.getItem("spec-game")).toBeNull();
  });

  it("seeds Math.random as the games seed theirs, so each load deals the same", () => {
    preparePage({ seed: 7 }, THEME_KEY);

    expect([Math.random(), Math.random(), Math.random()]).toEqual([
      0.011704753153026104, 0.06195825757458806, 0.97690763277933,
    ]);
  });

  it("leaves Math.random alone without a seed", () => {
    preparePage({}, THEME_KEY);

    expect(Math.random).toBe(random);
  });
});

describe("preparePage, as setUpPage sends it", () => {
  const random = Math.random;

  afterEach(() => {
    localStorage.clear();
    Math.random = random;
  });

  /** Returns the source setUpPage has a page run before its own scripts. */
  async function sentSource(
    setup: Parameters<typeof setUpPage>[1],
  ): Promise<string> {
    const browser = new FakeBrowser();
    await setUpPage(new Page(new DevToolsConnection(browser), "page"), setup);
    return String(
      browser.last("Page.addScriptToEvaluateOnNewDocument")?.params["source"],
    );
  }

  // Run as the page runs it, from its source alone, so it fails if the
  // function reaches for anything outside itself.
  it("runs on its own in the page, setting it up as asked", async () => {
    localStorage.setItem("spec-game", '{"seconds":3,"moves":[1,2]}');
    const source = await sentSource({
      theme: "casino",
      stored: { "spec-stats": "{}" },
      merged: { "spec-game": { seconds: 84 } },
      seed: 7,
    });

    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the page runs it as source too.
    const run = new Function(source) as () => void;
    run();

    expect({
      theme: localStorage.getItem(THEME_STORAGE_KEY),
      stats: localStorage.getItem("spec-stats"),
      game: localStorage.getItem("spec-game"),
      random: Math.random(),
    }).toEqual({
      theme: "casino",
      stats: "{}",
      game: '{"seconds":84,"moves":[1,2]}',
      random: 0.011704753153026104,
    });
  });
});

/** Where the specs' board says the scene drew it on the canvas. */
const BOARD = { element: "app-board", drawnAt: "data-field" };

/**
 * Lays out a page of a game drawn with Phaser: its board, the canvas in it
 * at a place on the page, and the game bar's score.
 */
function layOut(): void {
  document.body.innerHTML = `
    <dl><dt>Lives</dt><dd>3</dd><dt> Score </dt><dd> 1,250 </dd></dl>
    <app-board data-outcome="paused" data-field="20 30 400 300">
      <fz-phaser-canvas data-state="ready"><canvas></canvas></fz-phaser-canvas>
    </app-board>`;
  const canvas = document.querySelector("canvas")!;
  canvas.getBoundingClientRect = () => new DOMRect(100, 50, 640, 480);
}

/** What the page {@link layOut} lays out shows. */
const LAID_OUT: PhaserPageState = {
  state: "ready",
  outcome: "paused",
  score: "1,250",
  board: { left: 120, top: 80, width: 400, height: 300 },
};

describe("describePhaserPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  /** Returns what the page shows, once the wait for the placeholder is over. */
  async function described(): Promise<PhaserPageState> {
    const shown = describePhaserPage(BOARD);
    await vi.advanceTimersByTimeAsync(800);
    return shown;
  }

  it("says the canvas's state, the board's outcome, the score and where the scene drew the board on the page", async () => {
    layOut();

    expect(await described()).toEqual(LAID_OUT);
  });

  it("looks at the page once the wait it is given is over", async () => {
    const shown = describePhaserPage(BOARD, { waitMs: 1500 });
    await vi.advanceTimersByTimeAsync(1000);

    layOut();
    await vi.advanceTimersByTimeAsync(500);

    expect(await shown).toEqual(LAID_OUT);
  });

  it("says none of it for a page without the board", async () => {
    expect(await described()).toEqual({
      state: "",
      outcome: "",
      score: "",
      board: null,
    });
  });

  it("says no board where the board doesn't say where the scene drew it", async () => {
    layOut();
    document.querySelector("app-board")!.removeAttribute("data-field");

    expect((await described()).board).toBeNull();
  });
});

describe("describePhaserPage, as a capture sends it, beside readRect()", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  /**
   * Returns the expression a capture has the page run for describePhaserPage,
   * sent with the reader it calls.
   */
  async function sentExpression(
    ...args: Parameters<typeof describePhaserPage>
  ): Promise<string> {
    const browser = new FakeBrowser();
    const page = new Page(new DevToolsConnection(browser), "page");
    await page.evaluateWith([readRect], describePhaserPage, ...args);
    return String(browser.last("Runtime.evaluate")?.params["expression"]);
  }

  // Run as the page runs it, from its source alone, so it fails if the
  // function reaches for anything outside itself but the reader sent with it.
  it("runs on its own in the page, saying what the page shows once its wait is over", async () => {
    layOut();
    const expression = await sentExpression(BOARD);
    vi.useFakeTimers();

    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the page runs it as source too.
    const run = new Function(`return ${expression}`) as () => Promise<unknown>;
    const shown = run();
    await vi.advanceTimersByTimeAsync(800);

    expect(await shown).toEqual(LAID_OUT);
  });
});
