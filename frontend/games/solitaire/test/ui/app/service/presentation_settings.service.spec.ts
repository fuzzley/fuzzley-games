import { describe, it, expect, beforeEach } from "vitest";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/presentation";

describe("PresentationSettingsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts on the defaults when nothing is stored", () => {
    const settings = new PresentationSettingsService();

    expect(settings.cardBackStyle).toBe("card-back-blue");
    expect(settings.backgroundColor).toBe(DEFAULT_BACKGROUND_COLOR);
  });

  it("saves a change to its own storage key", () => {
    const settings = new PresentationSettingsService();

    settings.setCardBackStyle("card-back-red");
    settings.setBackgroundColor("#3c096c");

    expect(
      JSON.parse(localStorage.getItem("fsolitaire-presentation")!),
    ).toEqual({
      cardBackStyle: "card-back-red",
      backgroundColor: "#3c096c",
    });
  });

  it("loads what it stored", () => {
    localStorage.setItem(
      "fsolitaire-presentation",
      JSON.stringify({
        cardBackStyle: "card-back-red",
        backgroundColor: "#1b4353",
      }),
    );

    const settings = new PresentationSettingsService();

    expect(settings.cardBackStyle).toBe("card-back-red");
    expect(settings.backgroundColor).toBe("#1b4353");
  });

  it("falls back to the key these settings used to share with the game rules", () => {
    // A player who chose a felt colour before the split should keep it.
    localStorage.setItem(
      "fsolitaire-settings",
      JSON.stringify({
        drawCount: 1,
        cardBackStyle: "card-back-red",
        backgroundColor: "#1b4353",
        debug: { almostWin: false },
      }),
    );

    const settings = new PresentationSettingsService();

    expect(settings.backgroundColor).toBe("#1b4353");
  });

  it("prefers its own key over the legacy one", () => {
    localStorage.setItem(
      "fsolitaire-presentation",
      JSON.stringify({
        cardBackStyle: "card-back-blue",
        backgroundColor: "#2b2d42",
      }),
    );
    localStorage.setItem(
      "fsolitaire-settings",
      JSON.stringify({ backgroundColor: "#1b4353" }),
    );

    const settings = new PresentationSettingsService();

    expect(settings.backgroundColor).toBe("#2b2d42");
  });

  it("falls back to defaults for corrupted storage", () => {
    localStorage.setItem("fsolitaire-presentation", "{ not json");

    const settings = new PresentationSettingsService();

    expect(settings.backgroundColor).toBe(DEFAULT_BACKGROUND_COLOR);
  });

  it("falls back to defaults for an unknown card back", () => {
    localStorage.setItem(
      "fsolitaire-presentation",
      JSON.stringify({ cardBackStyle: "card-back-yellow" }),
    );

    const settings = new PresentationSettingsService();

    expect(settings.cardBackStyle).toBe("card-back-blue");
  });

  it("publishes the colour to whoever is following it", () => {
    const settings = new PresentationSettingsService();
    const seen: string[] = [];
    settings.onBackgroundColor((color) => seen.push(color));

    settings.setBackgroundColor("#3c096c");

    expect(seen.at(-1)).toBe("#3c096c");
  });

  it("stops publishing once a follower unsubscribes", () => {
    const settings = new PresentationSettingsService();
    const seen: string[] = [];
    const stop = settings.onBackgroundColor((color) => seen.push(color));
    stop();

    settings.setBackgroundColor("#3c096c");

    expect(seen).not.toContain("#3c096c");
  });

  it("reports the card back a board should draw", () => {
    const settings = new PresentationSettingsService();

    settings.setCardBackStyle("card-back-red");

    expect(settings.cardBackKey()).toBe("card-back-red");
  });
});
