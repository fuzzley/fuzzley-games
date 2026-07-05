import {
  GameSettings,
  DEFAULT_BACKGROUND_COLOR,
} from "@/game/model/game/game_settings";

describe("GameSettings Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with default values when localStorage is empty", () => {
    const settings = new GameSettings();
    expect(settings.drawCount).toBe(3);
    expect(settings.cardBackStyle).toBe("card-back-blue");
    expect(settings.backgroundColor).toBe(DEFAULT_BACKGROUND_COLOR);
    expect(settings.debug.almostWin).toBe(false);
  });

  it("should save settings to localStorage when changed", () => {
    const settings = new GameSettings();

    settings.drawCount$.next(1);
    settings.cardBackStyle$.next("card-back-red");
    settings.backgroundColor$.next("#3c096c");
    settings.debug.almostWin$.next(true);

    const stored = localStorage.getItem("fsolitaire-settings");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.drawCount).toBe(1);
    expect(parsed.cardBackStyle).toBe("card-back-red");
    expect(parsed.backgroundColor).toBe("#3c096c");
    expect(parsed.debug.almostWin).toBe(true);
  });

  it("should load settings from localStorage on creation", () => {
    const data = {
      drawCount: 1,
      cardBackStyle: "card-back-red",
      backgroundColor: "#1b4353",
      debug: { almostWin: true },
    };
    localStorage.setItem("fsolitaire-settings", JSON.stringify(data));

    const settings = new GameSettings();
    expect(settings.drawCount).toBe(1);
    expect(settings.cardBackStyle).toBe("card-back-red");
    expect(settings.backgroundColor).toBe("#1b4353");
    expect(settings.debug.almostWin).toBe(true);
  });

  it("should handle corrupted JSON in localStorage gracefully and fallback to defaults", () => {
    localStorage.setItem("fsolitaire-settings", "{invalid-json}");

    const settings = new GameSettings();
    expect(settings.drawCount).toBe(3);
    expect(settings.cardBackStyle).toBe("card-back-blue");
    expect(settings.backgroundColor).toBe(DEFAULT_BACKGROUND_COLOR);
  });

  it("should handle invalid values in localStorage and fallback to defaults", () => {
    const data = {
      drawCount: 5, // Invalid, should fallback to 3
      cardBackStyle: "card-back-yellow", // Invalid, should fallback to "card-back-blue"
      backgroundColor: "", // Invalid/empty, should fallback to default
      debug: { almostWin: "not-a-boolean" }, // Invalid, should fallback to false
    };
    localStorage.setItem("fsolitaire-settings", JSON.stringify(data));

    const settings = new GameSettings();
    expect(settings.drawCount).toBe(3);
    expect(settings.cardBackStyle).toBe("card-back-blue");
    expect(settings.backgroundColor).toBe(DEFAULT_BACKGROUND_COLOR);
    expect(settings.debug.almostWin).toBe(false);
  });
});
