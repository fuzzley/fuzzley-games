// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import { DEFAULT_BACKGROUND_COLOR } from "@/engine/render/presentation";
import {
  CardDeckId,
  DEFAULT_DESKTOP_CARD_DECK,
  MOBILE_CARD_DECK,
} from "@/engine/render/card_deck";
import { COMPACT_MAX_WIDTH_PX } from "@/ui/app/service/viewport.service";
import {
  installFakeViewport,
  type FakeViewport,
} from "@test/support/ui/viewport";

/** A window narrow enough that the board compacts, as on a phone. */
const PHONE_WIDTH = COMPACT_MAX_WIDTH_PX - 200;

/** A window wide enough that it does not. */
const WIDE_WIDTH = COMPACT_MAX_WIDTH_PX + 200;

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

/** Stores settings as a build would have saved them. */
function store(settings: Record<string, unknown>): void {
  localStorage.setItem("fsolitaire-presentation", JSON.stringify(settings));
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

  /** Sets the window to a width, which the service follows as it changes. */
  function windowAt(width: number): FakeViewport {
    viewport = installFakeViewport(width);
    return viewport;
  }

  describe("loading", () => {
    it("starts on the defaults when nothing is stored", () => {
      const settings = buildSettings();

      expect(settings.cardBackStyle()).toBe("card-back-blue");
      expect(settings.backgroundColor()).toBe(DEFAULT_BACKGROUND_COLOR);
    });

    it("loads what it stored", () => {
      store({ cardBackStyle: "card-back-red", theme: "blue" });

      const settings = buildSettings();

      expect(settings.cardBackStyle()).toBe("card-back-red");
      expect(settings.theme()).toBe("blue");
    });

    it("paints the table in the chosen felt's colour", () => {
      store({ theme: "purple" });

      expect(buildSettings().backgroundColor()).toBe("#3c096c");
    });

    it("keeps a felt an earlier build stored only as its colour", () => {
      store({ backgroundColor: "#3c096c" });

      expect(buildSettings().theme()).toBe("purple");
    });

    it("falls back to the default felt for a colour no felt has", () => {
      store({ backgroundColor: "#123456" });

      expect(buildSettings().theme()).toBe("green");
    });

    it("falls back to the default felt for one this build does not have", () => {
      store({ theme: "tartan" });

      expect(buildSettings().theme()).toBe("green");
    });

    it("falls back to defaults for corrupted storage", () => {
      localStorage.setItem("fsolitaire-presentation", "{ not json");

      expect(buildSettings().backgroundColor()).toBe(DEFAULT_BACKGROUND_COLOR);
    });

    it("falls back to defaults for an unknown card back", () => {
      store({ cardBackStyle: "card-back-yellow" });

      expect(buildSettings().cardBackStyle()).toBe("card-back-blue");
    });

    it("starts on auto and the default desktop deck when nothing is stored", () => {
      const settings = buildSettings();

      expect([settings.cardStyle(), settings.desktopCardDeck()]).toEqual([
        "auto",
        DEFAULT_DESKTOP_CARD_DECK,
      ]);
    });

    it("loads the card style and desktop deck it stored", () => {
      store({ cardStyle: "mobile", desktopCardDeck: "classic" });

      const settings = buildSettings();

      expect([settings.cardStyle(), settings.desktopCardDeck()]).toEqual([
        "mobile",
        "classic",
      ]);
    });

    it("keeps the deck an earlier build stored as the desktop deck", () => {
      // Before the card style, the one deck setting held a desktop deck.
      store({ cardDeck: "classic" });

      const settings = buildSettings();

      expect([settings.cardStyle(), settings.desktopCardDeck()]).toEqual([
        "auto",
        "classic",
      ]);
    });

    it("falls back to the default desktop deck for settings written before decks existed", () => {
      store({ backgroundColor: "#1b4353" });

      expect(buildSettings().desktopCardDeck()).toBe(DEFAULT_DESKTOP_CARD_DECK);
    });

    it("falls back to the defaults for a style or deck this build does not have", () => {
      store({ cardStyle: "sideways", desktopCardDeck: "art-deco" });

      const settings = buildSettings();

      expect([settings.cardStyle(), settings.desktopCardDeck()]).toEqual([
        "auto",
        DEFAULT_DESKTOP_CARD_DECK,
      ]);
    });

    it("does not take the mobile deck for a desktop deck", () => {
      store({ cardDeck: MOBILE_CARD_DECK.id });

      expect(buildSettings().desktopCardDeck()).toBe(DEFAULT_DESKTOP_CARD_DECK);
    });
  });

  describe("the deck the cards are drawn from", () => {
    it("is the desktop deck on a wide screen, in auto", () => {
      windowAt(WIDE_WIDTH);

      expect(buildSettings().cardDeck()).toBe(DEFAULT_DESKTOP_CARD_DECK);
    });

    it("is the mobile deck on a phone, in auto", () => {
      windowAt(PHONE_WIDTH);

      expect(buildSettings().cardDeck()).toBe(MOBILE_CARD_DECK.id);
    });

    it("is the mobile deck on a phone on its side, in auto", () => {
      viewport = installFakeViewport(844, 390);

      expect(buildSettings().cardDeck()).toBe(MOBILE_CARD_DECK.id);
    });

    it("follows the window across the breakpoint, in auto", () => {
      const view = windowAt(PHONE_WIDTH);
      const settings = buildSettings();

      view.setWidth(WIDE_WIDTH);

      expect(settings.cardDeck()).toBe(DEFAULT_DESKTOP_CARD_DECK);
    });

    it("tells the board each time the window crosses the breakpoint", () => {
      const view = windowAt(WIDE_WIDTH);
      const settings = buildSettings();
      const seen: CardDeckId[] = [];
      settings.onCardDeck((deckId) => seen.push(deckId));
      TestBed.flushEffects();

      view.setWidth(PHONE_WIDTH);
      TestBed.flushEffects();
      view.setWidth(WIDE_WIDTH);
      TestBed.flushEffects();

      expect(seen).toEqual([
        DEFAULT_DESKTOP_CARD_DECK,
        MOBILE_CARD_DECK.id,
        DEFAULT_DESKTOP_CARD_DECK,
      ]);
    });

    it("is the mobile deck on a wide screen once mobile cards are chosen", () => {
      windowAt(WIDE_WIDTH);
      const settings = buildSettings();

      settings.setCardStyle("mobile");

      expect(settings.cardDeck()).toBe(MOBILE_CARD_DECK.id);
    });

    it("is the desktop deck on a phone once desktop cards are chosen", () => {
      windowAt(PHONE_WIDTH);
      const settings = buildSettings();

      settings.setCardStyle("desktop");

      expect(settings.cardDeck()).toBe(DEFAULT_DESKTOP_CARD_DECK);
    });

    it("is the desktop deck chosen, whenever desktop cards are drawn", () => {
      const settings = buildSettings();

      settings.setDesktopCardDeck("classic");

      expect(settings.cardDeck()).toBe("classic");
    });

    it("is what the board is asked to draw", () => {
      const settings = buildSettings();

      settings.setCardStyle("mobile");

      expect(settings.cardDeckId()).toBe(MOBILE_CARD_DECK.id);
    });
  });

  describe("whether desktop cards are drawn", () => {
    it("says so on a wide screen, in auto", () => {
      windowAt(WIDE_WIDTH);

      expect(buildSettings().drawsDesktopCards()).toBe(true);
    });

    it("says not on a phone, in auto", () => {
      windowAt(PHONE_WIDTH);

      expect(buildSettings().drawsDesktopCards()).toBe(false);
    });

    it("says so on a phone once desktop cards are chosen", () => {
      windowAt(PHONE_WIDTH);
      const settings = buildSettings();

      settings.setCardStyle("desktop");

      expect(settings.drawsDesktopCards()).toBe(true);
    });

    it("says not on a wide screen once mobile cards are chosen", () => {
      windowAt(WIDE_WIDTH);
      const settings = buildSettings();

      settings.setCardStyle("mobile");

      expect(settings.drawsDesktopCards()).toBe(false);
    });
  });

  describe("saving", () => {
    it("saves a change to its own storage key", () => {
      const settings = buildSettings();

      settings.setCardBackStyle("card-back-red");
      settings.setTheme("purple");
      settings.setCardStyle("mobile");
      settings.setDesktopCardDeck("classic");
      TestBed.flushEffects();

      expect(stored()).toEqual({
        cardBackStyle: "card-back-red",
        theme: "purple",
        cardStyle: "mobile",
        desktopCardDeck: "classic",
        phonePiles: "bottom",
        hand: "right",
      });
    });

    it("gives a later visit back the choices it saved", () => {
      const settings = buildSettings();
      settings.setCardStyle("desktop");
      settings.setDesktopCardDeck("all-corner-pips");
      TestBed.flushEffects();
      TestBed.resetTestingModule();

      const later = buildSettings();

      expect([later.cardStyle(), later.desktopCardDeck()]).toEqual([
        "desktop",
        "all-corner-pips",
      ]);
    });

    it("rewrites what an earlier build stored in the new shape", () => {
      store({
        cardBackStyle: "card-back-red",
        theme: "blue",
        cardDeck: "classic",
      });
      buildSettings();

      TestBed.flushEffects();

      // The old key goes, so the deck is read from one place from now on.
      expect(stored()).toEqual({
        cardBackStyle: "card-back-red",
        theme: "blue",
        cardStyle: "auto",
        desktopCardDeck: "classic",
        phonePiles: "bottom",
        hand: "right",
      });
    });

    it("prefers the desktop deck it stored to an earlier build's deck", () => {
      store({ cardDeck: "classic", desktopCardDeck: "all-corner-pips" });

      expect(buildSettings().desktopCardDeck()).toBe("all-corner-pips");
    });

    it("stores auto rather than the deck auto chose", () => {
      windowAt(PHONE_WIDTH);
      buildSettings();

      TestBed.flushEffects();

      // So a later visit in a wider window gets desktop cards.
      expect(stored()).toMatchObject({
        cardStyle: "auto",
        desktopCardDeck: DEFAULT_DESKTOP_CARD_DECK,
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
    /**
     * Returns settings whose board has drawn the default desktop deck and
     * failed to fetch Classic once the player chose it.
     */
    function afterClassicFailed(): PresentationSettingsService {
      const settings = buildSettings();
      settings.reportCardDeckStatus({
        kind: "drawn",
        deckId: DEFAULT_DESKTOP_CARD_DECK,
      });
      settings.setDesktopCardDeck("classic");
      settings.reportCardDeckStatus({ kind: "unavailable", deckId: "classic" });
      return settings;
    }

    it("holds the deck being fetched while it is on its way", () => {
      const settings = buildSettings();

      settings.setDesktopCardDeck("classic");
      settings.reportCardDeckStatus({ kind: "loading", deckId: "classic" });

      expect(settings.pendingCardDeck()).toBe("classic");
    });

    it("stops waiting once the board draws it", () => {
      const settings = buildSettings();
      settings.reportCardDeckStatus({ kind: "loading", deckId: "classic" });

      settings.reportCardDeckStatus({ kind: "drawn", deckId: "classic" });

      expect(settings.pendingCardDeck()).toBe(null);
    });

    it("keeps the board on the deck it is drawing when another cannot be fetched", () => {
      expect(afterClassicFailed().cardDeck()).toBe(DEFAULT_DESKTOP_CARD_DECK);
    });

    it("keeps the player's choice when it cannot be fetched", () => {
      // Auto has no choice to put back, so no choice is put back.
      expect(afterClassicFailed().desktopCardDeck()).toBe("classic");
    });

    it("tries the deck again when it is chosen again", () => {
      const settings = afterClassicFailed();

      settings.setDesktopCardDeck("classic");

      expect(settings.cardDeck()).toBe("classic");
    });

    it("says which deck could not be fetched and what is on the table", () => {
      expect(afterClassicFailed().cardDeckProblem()).toBe(
        "Couldn't load Classic — still using Corner Pips.",
      );
    });

    it("has nothing to explain before anything has gone wrong", () => {
      expect(buildSettings().cardDeckProblem()).toBe(null);
    });

    it("drops the complaint when another deck is chosen", () => {
      const settings = afterClassicFailed();

      settings.setDesktopCardDeck("all-corner-pips");

      // Yesterday's failure has nothing to say about today's choice.
      expect(settings.cardDeckProblem()).toBe(null);
    });

    it("keeps desktop cards when the mobile deck cannot be fetched on a phone", () => {
      const view = windowAt(WIDE_WIDTH);
      const settings = buildSettings();
      settings.reportCardDeckStatus({
        kind: "drawn",
        deckId: DEFAULT_DESKTOP_CARD_DECK,
      });
      view.setWidth(PHONE_WIDTH);

      settings.reportCardDeckStatus({
        kind: "unavailable",
        deckId: MOBILE_CARD_DECK.id,
      });

      expect([settings.cardDeck(), settings.cardDeckProblem()]).toEqual([
        DEFAULT_DESKTOP_CARD_DECK,
        "Couldn't load Mobile — still using Corner Pips.",
      ]);
    });

    it("drops the complaint once auto no longer wants the deck that failed", () => {
      const view = windowAt(PHONE_WIDTH);
      const settings = buildSettings();
      settings.reportCardDeckStatus({
        kind: "unavailable",
        deckId: MOBILE_CARD_DECK.id,
      });

      view.setWidth(WIDE_WIDTH);

      expect(settings.cardDeckProblem()).toBe(null);
    });
  });

  describe("the board's arrangement", () => {
    it("puts an upright phone's piles at the bottom, for a right hand, by default", () => {
      expect(buildSettings().boardArrangement()).toEqual({
        phonePiles: "bottom",
        hand: "right",
      });
    });

    it("tells the board where the piles go once the player moves them", () => {
      const settings = buildSettings();

      settings.setPhonePiles("top");

      expect(settings.boardArrangement().phonePiles).toBe("top");
    });

    it("tells the board the hand once the player changes it", () => {
      const settings = buildSettings();

      settings.setHand("left");

      expect(settings.boardArrangement().hand).toBe("left");
    });

    it("saves both", () => {
      const settings = buildSettings();

      settings.setPhonePiles("top");
      settings.setHand("left");
      TestBed.flushEffects();

      expect(stored()).toMatchObject({ phonePiles: "top", hand: "left" });
    });

    it("loads what it saved", () => {
      store({ phonePiles: "top", hand: "left" });

      const settings = buildSettings();

      expect([settings.phonePiles(), settings.hand()]).toEqual(["top", "left"]);
    });

    it("falls back to the defaults for values it does not know", () => {
      store({ phonePiles: "sideways", hand: 3 });

      const settings = buildSettings();

      expect([settings.phonePiles(), settings.hand()]).toEqual([
        "bottom",
        "right",
      ]);
    });
  });
});
