// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { GameMenuComponent } from "@/ui/app/component/game_menu/game_menu.component";
import { GameMenuService } from "@/ui/app/service/game_menu.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import {
  clickElement,
  query,
  queryAll,
  queryRequired,
} from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";

describe("GameMenuComponent", () => {
  let fixture: ComponentFixture<GameMenuComponent>;
  let harness: UiHarness;
  let menu: GameMenuService;

  beforeEach(async () => {
    localStorage.clear();
    harness = await configureUiTestBed(GameMenuComponent);

    menu = TestBed.inject(GameMenuService);
    fixture = TestBed.createComponent(GameMenuComponent);
    fixture.detectChanges();
  });

  /** The buttons listing the games on offer. */
  function gameItems(): HTMLElement[] {
    return queryAll(fixture, ".game-item");
  }

  /** Expands the rail and renders it. */
  function expand(): void {
    menu.setExpanded(true);
    fixture.detectChanges();
  }

  describe("the list of games", () => {
    it("offers every game in the catalog", () => {
      expect(gameItems().length).toBe(harness.catalog.catalog.games.length);
    });

    it("marks the game on the table as the current one", () => {
      expect(gameItems()[0].getAttribute("aria-current")).toBe("page");
    });

    it("leaves aria-current off the others entirely, rather than 'false'", () => {
      expect(gameItems()[1].hasAttribute("aria-current")).toBe(false);
    });

    it("names each game even while the rail is collapsed", () => {
      // The initial is all that is visible, but the button still has to say
      // which game it picks.
      expect(gameItems()[0].textContent).toContain("Klondike");
    });

    it("labels the rail, so it is not an unnamed navigation landmark", () => {
      expect(queryRequired(fixture, "nav").getAttribute("aria-label")).toBe(
        "Games",
      );
    });
  });

  describe("choosing a game", () => {
    it("puts the chosen game on the table", async () => {
      gameItems()[1].click();
      await flushMicrotasks();

      expect(harness.catalog.select).toHaveBeenCalledWith("freecell");
    });

    it("ignores the game already in play, which would deal a new one", async () => {
      gameItems()[0].click();
      await flushMicrotasks();

      expect(harness.catalog.select).not.toHaveBeenCalled();
    });

    it("leaves the rail open when it sits beside the board", async () => {
      expand();

      gameItems()[1].click();
      await flushMicrotasks();
      fixture.detectChanges();

      // Nothing is covered on a wide screen, so nothing needs dismissing.
      expect(menu.isExpanded()).toBe(true);
    });
  });

  describe("expanding and collapsing", () => {
    it("starts collapsed, so a first-time player sees a board", () => {
      expect(menu.isExpanded()).toBe(false);
      expect(query(fixture, ".game-menu")?.classList).not.toContain("expanded");
    });

    it("expands when the toggle is clicked", () => {
      clickElement(fixture, ".menu-toggle");
      fixture.detectChanges();

      expect(menu.isExpanded()).toBe(true);
    });

    it("collapses again when the toggle is clicked a second time", () => {
      expand();

      clickElement(fixture, ".menu-toggle");
      fixture.detectChanges();

      expect(menu.isExpanded()).toBe(false);
    });

    it("reports its state on the toggle, for anyone not looking at it", () => {
      expand();

      expect(
        queryRequired(fixture, ".menu-toggle").getAttribute("aria-expanded"),
      ).toBe("true");
    });

    it("offers a dismissable backdrop only while it is open", () => {
      expect(query(fixture, ".menu-backdrop")).toBeNull();

      expand();

      expect(query(fixture, ".menu-backdrop")).not.toBeNull();
    });

    it("closes when that backdrop is clicked", () => {
      expand();

      clickElement(fixture, ".menu-backdrop");
      fixture.detectChanges();

      expect(menu.isExpanded()).toBe(false);
    });

    it("makes the backdrop a real button, not an unreachable div", () => {
      expand();

      const backdrop = queryRequired(fixture, ".menu-backdrop");
      expect(backdrop.tagName).toBe("BUTTON");
      expect(backdrop.getAttribute("aria-label")).toBe("Close game menu");
    });
  });
});
