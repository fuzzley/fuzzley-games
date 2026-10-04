// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/presentation";
import {
  DEFAULT_CARD_DECK,
  DEFAULT_COMPACT_CARD_DECK,
} from "@/engine/render/card_deck";
import { COMPACT_MAX_WIDTH_PX } from "@/ui/app/service/viewport.service";
import {
  installFakeViewport,
  type FakeViewport,
} from "@test/support/ui/viewport";

/**
 * Returns a service built through the injector, which its field initializer
 * and its effect both need.
 */
function buildSettings(): PresentationSettingsService {
  TestBed.configureTestingModule({});
  return TestBed.inject(PresentationSettingsService);
}

/** Returns what is currently in the service's own storage key. */
function stored(): Record<string, unknown> | null {
  const raw = localStorage.getItem("fsolitaire-presentation");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

describe("PresentationSettingsService", () => {
  let viewport: FakeViewport | null = null;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    viewport?.restore();
    viewport = null;
  });

  /** Makes the window narrow enough that the board compacts. */
  function onAPhone(): void {
    viewport = installFakeViewport(COMPACT_MAX_WIDTH_PX - 200);
  }

  describe("loading", () => {
    it("starts on the defaults when nothing is stored", () => {
      const settings = buildSettings();

      expect(settings.cardBackStyle()).toBe("card-back-blue");
      expect(settings.backgroundColor()).toBe(DEFAULT_BACKGROUND_COLOR);
    });

    it("loads what it stored", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ cardBackStyle: "card-back-red", theme: "blue" }),
      );

      const settings = buildSettings();

      expect(settings.cardBackStyle()).toBe("card-back-red");
      expect(settings.theme()).toBe("blue");
    });

    it("paints the table in the chosen felt's colour", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ theme: "purple" }),
      );

      expect(buildSettings().backgroundColor()).toBe("#3c096c");
    });

    it("keeps a felt an earlier build stored only as its colour", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ backgroundColor: "#3c096c" }),
      );

      expect(buildSettings().theme()).toBe("purple");
    });

    it("falls back to the default felt for a colour no felt has", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ backgroundColor: "#123456" }),
      );

      expect(buildSettings().theme()).toBe("green");
    });

    it("falls back to the default felt for one this build does not have", () => {
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ theme: "tartan" }),
      );

      expect(buildSettings().theme()).toBe("green");
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

    it("starts a phone on the phone's deck when nothing is stored", () => {
      onAPhone();

      expect(buildSettings().cardDeck()).toBe(DEFAULT_COMPACT_CARD_DECK);
    });

    it("starts a phone on the phone's deck when no deck was ever chosen", () => {
      onAPhone();
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ theme: "blue" }),
      );

      expect(buildSettings().cardDeck()).toBe(DEFAULT_COMPACT_CARD_DECK);
    });

    it("keeps the deck a player chose, even on a phone", () => {
      onAPhone();
      localStorage.setItem(
        "fsolitaire-presentation",
        JSON.stringify({ cardDeck: "classic" }),
      );

      expect(buildSettings().cardDeck()).toBe("classic");
    });

    it("keeps the phone's deck on a later visit in a wider window", () => {
      onAPhone();
      buildSettings();
      TestBed.flushEffects();

      viewport?.setWidth(COMPACT_MAX_WIDTH_PX + 200);
      TestBed.resetTestingModule();
      const later = buildSettings();

      // The first visit stored the default like a choice.
      expect(later.cardDeck()).toBe(DEFAULT_COMPACT_CARD_DECK);
    });
  });

  describe("saving", () => {
    it("saves a change to its own storage key", () => {
      const settings = buildSettings();

      settings.setCardBackStyle("card-back-red");
      settings.setTheme("purple");
      settings.setCardDeck("classic");
      TestBed.flushEffects();

      expect(stored()).toEqual({
        cardBackStyle: "card-back-red",
        theme: "purple",
        cardDeck: "classic",
      });
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

      settings.setTheme("purple");
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

      settings.setTheme("purple");
      TestBed.flushEffects();

      expect(seen).not.toContain("#3c096c");
    });
  });

  describe("what the board says about the deck", () => {
    it("holds the deck being fetched while it is on its way", () => {
      const settings = buildSettings();

      settings.setCardDeck("classic");
      settings.reportCardDeckStatus({ kind: "loading", deckId: "classic" });

      expect(settings.pendingCardDeck()).toBe("classic");
    });

    it("stops waiting once the board draws it", () => {
      const settings = buildSettings();
      settings.reportCardDeckStatus({ kind: "loading", deckId: "classic" });

      settings.reportCardDeckStatus({ kind: "drawn", deckId: "classic" });

      expect(settings.pendingCardDeck()).toBe(null);
    });

    it("puts the choice back when a deck cannot be fetched", () => {
      const settings = buildSettings();
      settings.reportCardDeckStatus({
        kind: "drawn",
        deckId: DEFAULT_CARD_DECK,
      });
      settings.setCardDeck("classic");

      settings.reportCardDeckStatus({ kind: "unavailable", deckId: "classic" });

      // Otherwise the drawer goes on showing a deck the board never drew — and
      // persists it, so the next visit starts by failing to load it again.
      expect(settings.cardDeck()).toBe(DEFAULT_CARD_DECK);
    });

    it("says which deck could not be fetched and what is on the table", () => {
      const settings = buildSettings();
      settings.reportCardDeckStatus({
        kind: "drawn",
        deckId: DEFAULT_CARD_DECK,
      });

      settings.reportCardDeckStatus({ kind: "unavailable", deckId: "classic" });

      expect(settings.cardDeckProblem()).toBe(
        "Couldn't load Classic — still using Corner Pips.",
      );
    });

    it("has nothing to explain before anything has gone wrong", () => {
      expect(buildSettings().cardDeckProblem()).toBe(null);
    });

    it("drops the complaint when another deck is chosen", () => {
      const settings = buildSettings();
      settings.reportCardDeckStatus({ kind: "unavailable", deckId: "classic" });

      settings.setCardDeck("all-corner-pips");

      // Yesterday's failure has nothing to say about today's choice.
      expect(settings.cardDeckProblem()).toBe(null);
    });
  });
});
