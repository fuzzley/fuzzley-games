// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter, withHashLocation } from "@angular/router";
import { Location } from "@angular/common";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { GAME_CATALOG } from "@/ui/app/provider/game_catalog";
import { routes } from "@/ui/app/routes";

// The routed component hosts a Phaser canvas, whose module init does not
// survive jsdom. What the catalog does with the URL is the subject; booting a
// renderer to find out is not.
vi.mock("@/engine/render/phaser/phaser_host", () => ({
  PhaserHost: class {
    start() {
      /* no-op */
    }
    destroy() {
      /* no-op */
    }
  },
}));

vi.mock("@/ui/app/provider/board_catalog", () => ({
  makeBoardScene: () => ({}),
}));

interface Harness {
  catalog: GameCatalogService;
  router: Router;
  location: Location;
}

/** A catalog wired to the application's real route table. */
function buildCatalog(): Harness {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes, withHashLocation())],
  });

  return {
    catalog: TestBed.inject(GameCatalogService),
    router: TestBed.inject(Router),
    location: TestBed.inject(Location),
  };
}

describe("GameCatalogService", () => {
  beforeEach(() => {
    localStorage.clear();
    location.hash = "";
  });

  describe("choosing what to open on", () => {
    it("opens on the first game when nothing says otherwise", () => {
      expect(buildCatalog().catalog.initialGameId).toBe(GAME_CATALOG[0].id);
    });

    it("opens on the game last played", () => {
      localStorage.setItem("fsolitaire-game", "freecell");

      expect(buildCatalog().catalog.initialGameId).toBe("freecell");
    });

    it("ignores a stored game it no longer has", () => {
      localStorage.setItem("fsolitaire-game", "poker");

      expect(buildCatalog().catalog.initialGameId).toBe(GAME_CATALOG[0].id);
    });

    it("sends an empty URL to the game it opens on", async () => {
      localStorage.setItem("fsolitaire-game", "spider");
      const harness = buildCatalog();

      await harness.router.navigateByUrl("/");

      expect(harness.location.path()).toBe("/spider");
    });
  });

  describe("following the URL", () => {
    it("puts the game the URL names on the table", async () => {
      const harness = buildCatalog();

      await harness.router.navigateByUrl("/spider");

      expect(harness.catalog.selectedId()).toBe("spider");
    });

    it("lets the URL win over the game last played, so a link is honoured", async () => {
      localStorage.setItem("fsolitaire-game", "freecell");
      const harness = buildCatalog();

      await harness.router.navigateByUrl("/spider");

      expect(harness.catalog.selectedId()).toBe("spider");
    });

    it("sends a URL naming no game it has back to a playable board", async () => {
      const harness = buildCatalog();

      await harness.router.navigateByUrl("/poker");

      expect(harness.location.path()).toBe(`/${GAME_CATALOG[0].id}`);
      expect(harness.catalog.selectedId()).toBe(GAME_CATALOG[0].id);
    });

    it("deals the game it navigates to", async () => {
      const harness = buildCatalog();
      const before = harness.catalog.session();

      await harness.router.navigateByUrl("/spider");

      expect(harness.catalog.session()).not.toBe(before);
    });

    it("does not re-deal when the URL names the game already in play", async () => {
      const harness = buildCatalog();
      await harness.router.navigateByUrl("/klondike");
      const before = harness.catalog.session();

      await harness.router.navigateByUrl("/klondike");

      expect(harness.catalog.session()).toBe(before);
    });

    it("moves back to the previous game, so the back button works", async () => {
      const harness = buildCatalog();
      await harness.router.navigateByUrl("/klondike");
      await harness.router.navigateByUrl("/spider");

      harness.location.back();
      await harness.router.navigateByUrl(harness.location.path());

      expect(harness.catalog.selectedId()).toBe("klondike");
    });
  });

  describe("selecting", () => {
    it("puts the chosen game on the table straight away", () => {
      const harness = buildCatalog();

      harness.catalog.select("freecell");

      // Without waiting on the navigation: a player who clicked "FreeCell"
      // should not be looking at Klondike until a promise resolves.
      expect(harness.catalog.selectedId()).toBe("freecell");
    });

    it("deals it", () => {
      const harness = buildCatalog();
      const before = harness.catalog.session();

      harness.catalog.select("freecell");

      expect(harness.catalog.session()).not.toBe(before);
    });

    it("records it in the URL", async () => {
      const harness = buildCatalog();

      harness.catalog.select("spider");
      await harness.router.navigate(["spider"]);

      expect(harness.location.path()).toBe("/spider");
    });

    it("remembers it for next time", () => {
      const harness = buildCatalog();

      harness.catalog.select("spider");

      expect(localStorage.getItem("fsolitaire-game")).toBe("spider");
    });

    it("ignores the game already in play, which would throw it away", () => {
      const harness = buildCatalog();
      const before = harness.catalog.session();

      harness.catalog.select(harness.catalog.selectedId());

      expect(harness.catalog.session()).toBe(before);
    });

    it("ignores a game it does not have", () => {
      const harness = buildCatalog();

      harness.catalog.select("poker");

      expect(harness.catalog.selectedId()).toBe(GAME_CATALOG[0].id);
    });
  });
});
