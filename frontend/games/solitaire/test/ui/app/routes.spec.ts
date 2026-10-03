// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { provideAppRouter } from "@/ui/app/routes";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import { GameLifecycleService } from "@/ui/app/service/game_lifecycle.service";

// The routed component hosts a Phaser canvas, whose module init does not
// survive jsdom.
vi.mock("@/engine/render/phaser/phaser_host", () => ({
  PhaserHost: class {
    show() {
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
  readonly router: Router;
  readonly catalog: GameCatalogService;
  readonly lifecycle: GameLifecycleService;
  readonly confirmation: ConfirmationService;
}

/** Returns the application's router and services, on Klondike's route. */
async function onKlondike(): Promise<Harness> {
  TestBed.configureTestingModule({ providers: [provideAppRouter()] });
  // The testing harness renders an outlet, without which Angular skips a
  // route's leave guard altogether.
  await RouterTestingHarness.create("/klondike");
  return {
    router: TestBed.inject(Router),
    catalog: TestBed.inject(GameCatalogService),
    lifecycle: TestBed.inject(GameLifecycleService),
    confirmation: TestBed.inject(ConfirmationService),
  };
}

/** Draws from the stock, which puts the Klondike game on the table under way. */
function playAMove(harness: Harness): void {
  const game = harness.catalog.session().game;
  if (!(game instanceof KlondikeGame)) {
    throw new Error("Expected Klondike on the table.");
  }
  game.drawCardsFromStock();
  TestBed.flushEffects();
}

describe("routes", () => {
  beforeEach(() => {
    location.hash = "";
  });

  describe("leaving a game by URL", () => {
    it("switches without asking when nothing is under way", async () => {
      const harness = await onKlondike();

      await harness.router.navigateByUrl("/spider");

      expect(harness.catalog.selectedId()).toBe("spider");
      expect(harness.confirmation.isOpen()).toBe(false);
    });

    it("asks before throwing away a game under way", async () => {
      const harness = await onKlondike();
      playAMove(harness);

      void harness.router.navigateByUrl("/spider");
      await vi.waitFor(() => {
        expect(harness.confirmation.isOpen()).toBe(true);
      });

      expect(harness.catalog.selectedId()).toBe("klondike");
    });

    it("keeps the game when the player declines", async () => {
      const harness = await onKlondike();
      playAMove(harness);
      const navigation = harness.router.navigateByUrl("/spider");
      await vi.waitFor(() => {
        expect(harness.confirmation.isOpen()).toBe(true);
      });

      harness.confirmation.cancel();

      expect(await navigation).toBe(false);
      expect(harness.catalog.selectedId()).toBe("klondike");
    });

    it("switches once the player accepts", async () => {
      const harness = await onKlondike();
      playAMove(harness);
      const navigation = harness.router.navigateByUrl("/spider");
      await vi.waitFor(() => {
        expect(harness.confirmation.isOpen()).toBe(true);
      });

      harness.confirmation.accept();

      expect(await navigation).toBe(true);
      expect(harness.catalog.selectedId()).toBe("spider");
    });

    it("asks once when the game browser switches games", async () => {
      const harness = await onKlondike();
      playAMove(harness);
      const switching = harness.lifecycle.playGame("spider", {}, "Spider");
      harness.confirmation.accept();
      await switching;

      await vi.waitFor(() => {
        expect(harness.router.url).toBe("/spider");
      });

      expect(harness.confirmation.isOpen()).toBe(false);
    });
  });
});
