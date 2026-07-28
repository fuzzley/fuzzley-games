// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { GameMenuService } from "@/ui/app/service/game_menu.service";

describe("GameMenuService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts collapsed, so a first visit is a dealt board rather than a menu", () => {
    const menu = new GameMenuService();

    expect(menu.isExpanded()).toBe(false);
  });

  it("expands when toggled", () => {
    const menu = new GameMenuService();

    menu.toggle();

    expect(menu.isExpanded()).toBe(true);
  });

  it("collapses when toggled again", () => {
    const menu = new GameMenuService();
    menu.toggle();

    menu.toggle();

    expect(menu.isExpanded()).toBe(false);
  });

  it("remembers being left open", () => {
    new GameMenuService().setExpanded(true);

    expect(new GameMenuService().isExpanded()).toBe(true);
  });

  it("remembers being left closed", () => {
    new GameMenuService().setExpanded(true);
    new GameMenuService().setExpanded(false);

    expect(new GameMenuService().isExpanded()).toBe(false);
  });

  it("ignores a set that changes nothing", () => {
    const menu = new GameMenuService();

    menu.setExpanded(false);

    expect(localStorage.getItem("fsolitaire-menu-expanded")).toBeNull();
  });

  it("falls back to collapsed for unreadable storage", () => {
    localStorage.setItem("fsolitaire-menu-expanded", "not a boolean");

    expect(new GameMenuService().isExpanded()).toBe(false);
  });
});
