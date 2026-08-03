// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/presentation";
import { DEFAULT_CARD_DECK } from "@/engine/render/card_deck";

/**
 * A service built through the injector.
 *
 * It reads storage in a field initializer and persists from an effect, both of
 * which need an injection context — so it is resolved rather than constructed.
 */
function buildSettings(): PresentationSettingsService {
  TestBed.configureTestingModule({});
  return TestBed.inject(PresentationSettingsService);
}

/** What is currently in the service's own storage key. */
function stored(): Record<string, unknown> | null {
  const raw = localStorage.getItem("fsolitaire-presentation");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

describe("PresentationSettingsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loading", () => {
    it("starts on the defaults when nothing is stored", () => {
      const settings = buildSettings();

      expect(settings.cardBackStyle()).toBe("card-back-blue");
      expect(settings.backgroundColor()).toBe(DEFAULT_BACKGROUND_COLOR);
    });

    it("loads what it stored", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({
          cardBackStyle: "card-back-red",
          backgroundColor: "#1b4353",
        }),
      );

      const settings = buildSettings();

      expect(settings.cardBackStyle()).toBe("card-back-red");
      expect(settings.backgroundColor()).toBe("#1b4353");
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

      expect(buildSettings().backgroundColor()).toBe("#1b4353");
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

      expect(buildSettings().backgroundColor()).toBe("#2b2d42");
    });

    it("falls back to defaults for corrupted storage", () => {
      localStorage.setItem("fsolitaire-presentation", "{ not json");

      expect(buildSettings().backgroundColor()).toBe(DEFAULT_BACKGROUND_COLOR);
    });

    it("falls back to defaults for an unknown card back", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ cardBackStyle: "card-back-yellow" }),
      );

      expect(buildSettings().cardBackStyle()).toBe("card-back-blue");
    });

    it("starts on the default deck when nothing is stored", () => {
      expect(buildSettings().cardDeck()).toBe(DEFAULT_CARD_DECK);
    });

    it("loads the deck it stored", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ cardDeck: "classic" }),
      );

      expect(buildSettings().cardDeck()).toBe("classic");
    });

    it("falls back to the default deck for settings written before it existed", () => {
      // A player who chose a felt colour before decks were offered has no deck
      // recorded, and should get the one everyone else starts on.
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ backgroundColor: "#1b4353" }),
      );

      expect(buildSettings().cardDeck()).toBe(DEFAULT_CARD_DECK);
    });

    it("falls back to the default deck for one this build does not have", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ cardDeck: "art-deco" }),
      );

      expect(buildSettings().cardDeck()).toBe(DEFAULT_CARD_DECK);
    });
  });

  describe("saving", () => {
    it("saves a change to its own storage key", () => {
      const settings = buildSettings();

      settings.setCardBackStyle("card-back-red");
      settings.setBackgroundColor("#3c096c");
      settings.setCardDeck("classic");
      TestBed.flushEffects();

      expect(stored()).toEqual({
        cardBackStyle: "card-back-red",
        backgroundColor: "#3c096c",
        cardDeck: "classic",
      });
    });

    it("migrates a legacy blob onto its own key", () => {
      localStorage.setItem(
        "fsolitaire-settings",
        JSON.stringify({ backgroundColor: "#1b4353" }),
      );

      buildSettings();
      TestBed.flushEffects();

      expect(stored()?.["backgroundColor"]).toBe("#1b4353");
    });
  });

  describe("as the board's presentation port", () => {
    it("reports the card back a board should draw", () => {
      const settings = buildSettings();

      settings.setCardBackStyle("card-back-red");

      expect(settings.cardBackKey()).toBe("card-back-red");
    });

    it("publishes the colour to whoever is following it", () => {
      const settings = buildSettings();
      const seen: string[] = [];
      settings.onBackgroundColor((color) => seen.push(color));

      settings.setBackgroundColor("#3c096c");
      TestBed.flushEffects();

      expect(seen.at(-1)).toBe("#3c096c");
    });

    it("delivers the current colour on subscription", () => {
      const settings = buildSettings();
      const seen: string[] = [];

      settings.onBackgroundColor((color) => seen.push(color));
      TestBed.flushEffects();

      expect(seen).toEqual([DEFAULT_BACKGROUND_COLOR]);
    });

    it("stops publishing once a follower unsubscribes", () => {
      const settings = buildSettings();
      const seen: string[] = [];
      const stop = settings.onBackgroundColor((color) => seen.push(color));
      stop();

      settings.setBackgroundColor("#3c096c");
      TestBed.flushEffects();

      expect(seen).not.toContain("#3c096c");
    });
  });
});
