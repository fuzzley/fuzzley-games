// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { GAME_CATALOG } from "@/ui/app/provider/game_catalog";

/** A catalog service built through the injector, so DestroyRef resolves. */
function buildCatalog(): GameCatalogService {
  TestBed.configureTestingModule({});
  return TestBed.inject(GameCatalogService);
}

describe("GameCatalogService", () => {
  beforeEach(() => {
    localStorage.clear();
    location.hash = "";
  });

  afterEach(() => {
    location.hash = "";
  });

  describe("choosing what to open on", () => {
    it("opens on the first game when nothing says otherwise", () => {
      expect(buildCatalog().selectedId()).toBe(GAME_CATALOG[0].id);
    });

    it("opens on the game the URL names", () => {
      location.hash = "spider";

      expect(buildCatalog().selectedId()).toBe("spider");
    });

    it("opens on the game last played", () => {
      localStorage.setItem("fsolitaire-game", "freecell");

      expect(buildCatalog().selectedId()).toBe("freecell");
    });

    it("lets the URL win over the game last played, so a link is honoured", () => {
      localStorage.setItem("fsolitaire-game", "freecell");
      location.hash = "spider";

      expect(buildCatalog().selectedId()).toBe("spider");
    });

    it("ignores a URL naming no game it has", () => {
      location.hash = "poker";

      expect(buildCatalog().selectedId()).toBe(GAME_CATALOG[0].id);
    });

    it("writes the game it opened on into the URL", () => {
      localStorage.setItem("fsolitaire-game", "spider");

      buildCatalog();

      expect(location.hash).toBe("#spider");
    });
  });

  describe("selecting", () => {
    it("puts the chosen game on the table", () => {
      const catalog = buildCatalog();

      catalog.select("freecell");

      expect(catalog.selectedId()).toBe("freecell");
    });

    it("deals it", () => {
      const catalog = buildCatalog();
      const before = catalog.session();

      catalog.select("freecell");

      expect(catalog.session()).not.toBe(before);
    });

    it("records it in the URL", () => {
      const catalog = buildCatalog();

      catalog.select("spider");

      expect(location.hash).toBe("#spider");
    });

    it("remembers it for next time", () => {
      const catalog = buildCatalog();

      catalog.select("spider");

      expect(localStorage.getItem("fsolitaire-game")).toBe("spider");
    });

    it("ignores the game already in play, which would throw it away", () => {
      const catalog = buildCatalog();
      const before = catalog.session();

      catalog.select(catalog.selectedId());

      expect(catalog.session()).toBe(before);
    });

    it("ignores a game it does not have", () => {
      const catalog = buildCatalog();

      catalog.select("poker");

      expect(catalog.selectedId()).toBe(GAME_CATALOG[0].id);
    });
  });

  describe("following the URL", () => {
    it("switches when the fragment changes, so the back button works", () => {
      const catalog = buildCatalog();

      location.hash = "spider";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      expect(catalog.selectedId()).toBe("spider");
    });

    it("ignores a fragment naming no game it has", () => {
      const catalog = buildCatalog();
      const before = catalog.selectedId();

      location.hash = "poker";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      expect(catalog.selectedId()).toBe(before);
    });

    it("does not re-deal when the fragment names the game already in play", () => {
      const catalog = buildCatalog();
      const before = catalog.session();

      window.dispatchEvent(new HashChangeEvent("hashchange"));

      expect(catalog.session()).toBe(before);
    });
  });
});
