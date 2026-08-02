import {
  DEFAULT_DRAW_COUNT,
  GameSettings,
} from "@/games/klondike/game_settings";

describe("GameSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts at the default draw count with debug aids off", () => {
    const settings = new GameSettings();

    expect(settings.drawCount).toBe(DEFAULT_DRAW_COUNT);
    expect(settings.debug.almostWin).toBe(false);
  });

  it("takes the rules it is constructed with", () => {
    const settings = new GameSettings(1, true);

    expect(settings.drawCount).toBe(1);
    expect(settings.debug.almostWin).toBe(true);
  });

  it("reports the draw count it was last set to", () => {
    const settings = new GameSettings();

    settings.setDrawCount(1);

    expect(settings.drawCount).toBe(1);
  });

  it("reports the almost-win choice it was last set to", () => {
    const settings = new GameSettings();

    settings.debug.setAlmostWin(true);

    expect(settings.debug.almostWin).toBe(true);
  });

  /*
   * The point of the split. GameCatalogService persists every game's chosen
   * options under `fsolitaire-game-options` and deals a fresh game when one
   * changes, so a second copy here would be a second source of truth. Worse,
   * the copy used to live under `fsolitaire-settings` — the key the
   * presentation settings migrate away from — and overwrote what that
   * migration reads.
   */
  it("persists nothing, leaving storage to the catalog that owns it", () => {
    const settings = new GameSettings();

    settings.setDrawCount(1);
    settings.debug.setAlmostWin(true);

    expect(localStorage.length).toBe(0);
  });

  it("keeps no opinion about how the table looks, which is not a Klondike rule", () => {
    const settings = new GameSettings();

    expect(Object.keys(settings)).not.toContain("cardBackStyle");
  });
});
