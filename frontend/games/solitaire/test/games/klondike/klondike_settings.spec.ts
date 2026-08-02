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

  /*
   * The reason this is an object at all rather than a constructor argument: the
   * zones closure keeps reading it, so a change made after the game was built
   * still reaches the board.
   */
  it("reports the draw count it was last set to", () => {
    const settings = new KlondikeSettings();

    settings.setDrawCount(1);

    expect(settings.drawCount).toBe(1);
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
    const settings = new KlondikeSettings();

    settings.setDrawCount(1);

    expect(localStorage.length).toBe(0);
  });

  it("keeps no opinion about how the table looks, which is not a Klondike rule", () => {
    const settings = new KlondikeSettings();

    expect(Object.keys(settings)).not.toContain("cardBackStyle");
  });
});
