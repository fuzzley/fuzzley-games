// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { GameMenuService } from "@/ui/app/service/game_menu.service";

/**
 * A menu service built through the injector, so DestroyRef resolves and the
 * media-query listener is released with the test's injector.
 */
function buildMenu(): GameMenuService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(GameMenuService);
}

describe("GameMenuService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts collapsed, so a first visit is a dealt board rather than a menu", () => {
    const menu = buildMenu();

    expect(menu.isExpanded()).toBe(false);
  });

  it("expands when toggled", () => {
    const menu = buildMenu();

    menu.toggle();

    expect(menu.isExpanded()).toBe(true);
  });

  it("collapses when toggled again", () => {
    const menu = buildMenu();
    menu.toggle();

    menu.toggle();

    expect(menu.isExpanded()).toBe(false);
  });

  it("remembers being left open", () => {
    buildMenu().setExpanded(true);

    expect(buildMenu().isExpanded()).toBe(true);
  });

  it("remembers being left closed", () => {
    buildMenu().setExpanded(true);
    buildMenu().setExpanded(false);

    expect(buildMenu().isExpanded()).toBe(false);
  });

  it("ignores a set that changes nothing", () => {
    const menu = buildMenu();

    menu.setExpanded(false);

    expect(localStorage.getItem("fsolitaire-menu-expanded")).toBeNull();
  });

  it("falls back to collapsed for unreadable storage", () => {
    localStorage.setItem("fsolitaire-menu-expanded", "not a boolean");

    expect(buildMenu().isExpanded()).toBe(false);
  });
});
