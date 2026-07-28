import { GameSettings } from "@/games/klondike/game_settings";

describe("GameSettings Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with default values when localStorage is empty", () => {
    const settings = new GameSettings();
    expect(settings.drawCount).toBe(3);
    expect(settings.debug.almostWin).toBe(false);
  });

  it("should save settings to localStorage when changed", () => {
    const settings = new GameSettings();

    settings.drawCount$.next(1);
    settings.debug.almostWin$.next(true);

    const stored = localStorage.getItem("fsolitaire-settings");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({
      drawCount: 1,
      debug: { almostWin: true },
    });
  });

  it("should load settings from localStorage on creation", () => {
    localStorage.setItem(
      "fsolitaire-settings",
      JSON.stringify({ drawCount: 1, debug: { almostWin: true } }),
    );

    const settings = new GameSettings();

    expect(settings.drawCount).toBe(1);
    expect(settings.debug.almostWin).toBe(true);
  });

  it("should handle corrupted JSON in localStorage gracefully and fallback to defaults", () => {
    localStorage.setItem("fsolitaire-settings", "{ not json");

    const settings = new GameSettings();

    expect(settings.drawCount).toBe(3);
    expect(settings.debug.almostWin).toBe(false);
  });

  it("should handle invalid values in localStorage and fallback to defaults", () => {
    localStorage.setItem(
      "fsolitaire-settings",
      // 5 is not a draw mode; almostWin must be a boolean.
      JSON.stringify({ drawCount: 5, debug: { almostWin: "yes" } }),
    );

    const settings = new GameSettings();

    expect(settings.drawCount).toBe(3);
    expect(settings.debug.almostWin).toBe(false);
  });

  it("keeps no opinion about how the table looks, which is not a Klondike rule", () => {
    const settings = new GameSettings();

    expect(Object.keys(settings)).not.toContain("cardBackStyle$");
  });
});
