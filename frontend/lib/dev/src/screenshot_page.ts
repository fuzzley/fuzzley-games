// What a screenshot script runs in the page before the game starts, sent as
// its source, so it uses nothing from outside itself. What it reads of a page
// drawn with Phaser once it has drawn, `describePhaserPage()`, reads the
// board with `readRect()`, so it lives beside it in board_page.ts. Its spec
// runs both in jsdom.

/** Says how a page is set up before the game starts, as a player might have left it. */
export interface PageSetup {
  /** The palette the player chose. */
  readonly theme?: string;
  /** Entries stored as they are, by key, such as a game under way and its stats. */
  readonly stored?: Readonly<Record<string, string>>;
  /**
   * Fields merged into the JSON stored under a key, where something is, by
   * key, such as the clock of a game that saves itself as it goes, which a
   * reload takes up.
   */
  readonly merged?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Seeds `Math.random`, so a game that deals from it deals the same every time. */
  readonly seed?: number;
}

/**
 * Sets a page up as a screenshot asks, before its own scripts run, the
 * palette stored under the key the games read it from. It runs in the page.
 */
export function preparePage(setup: PageSetup, themeKey: string): void {
  if (setup.seed !== undefined) {
    // Mulberry32, as the games' own random numbers are.
    let state = setup.seed;
    Math.random = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
    };
  }
  if (setup.theme !== undefined) localStorage.setItem(themeKey, setup.theme);
  for (const [key, value] of Object.entries(setup.stored ?? {})) {
    localStorage.setItem(key, value);
  }
  for (const [key, fields] of Object.entries(setup.merged ?? {})) {
    const saved = localStorage.getItem(key);
    if (!saved) continue;
    const kept = JSON.parse(saved) as Record<string, unknown>;
    localStorage.setItem(key, JSON.stringify({ ...kept, ...fields }));
  }
}
