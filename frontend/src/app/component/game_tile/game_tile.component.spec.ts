import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { describe, it, expect, beforeEach } from "vitest";
import { findGame } from "../../provider/game_catalog";
import { GameTileComponent } from "./game_tile.component";

describe("GameTileComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameTileComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render(slug: string): HTMLElement {
    const fixture = TestBed.createComponent(GameTileComponent);
    fixture.componentRef.setInput("game", findGame(slug)!);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it("links a game the site hosts to its page", () => {
    const el = render("klondike");

    expect(el.querySelector("a.tile")?.getAttribute("href")).toBe(
      "/games/klondike",
    );
    expect(el.querySelector(".badge")).toBeNull();
  });

  it("shows a game still to come with no link, and says so", () => {
    const el = render("minesweeper");

    expect(el.querySelector("a")).toBeNull();
    expect(el.querySelector(".tile.soon .badge")?.textContent?.trim()).toBe(
      "Coming soon",
    );
  });
});
