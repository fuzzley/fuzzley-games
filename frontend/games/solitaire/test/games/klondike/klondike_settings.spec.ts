import {
  DEFAULT_DRAW_COUNT,
  KlondikeSettings,
} from "@/games/klondike/klondike_settings";

describe("KlondikeSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts at the default draw count", () => {
    const settings = new KlondikeSettings();

    expect(settings.drawCount).toBe(DEFAULT_DRAW_COUNT);
  });

  it("takes the draw count it is constructed with", () => {
    const settings = new KlondikeSettings(1);

    expect(settings.drawCount).toBe(1);
  });

  it("reports the draw count it was last set to", () => {
    const settings = new KlondikeSettings();

    settings.setDrawCount(1);

    expect(settings.drawCount).toBe(1);
  });

  it("persists nothing, leaving storage to the catalog that owns it", () => {
    const settings = new KlondikeSettings();

    settings.setDrawCount(1);

    expect(localStorage.length).toBe(0);
  });

  it("keeps no opinion about how the table looks, which is not a Klondike rule", () => {
    const settings = new KlondikeSettings();

    expect(Object.keys(settings)).not.toContain("cardBackStyle");
  });
});
