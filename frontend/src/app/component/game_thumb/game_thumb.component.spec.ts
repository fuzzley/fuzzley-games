import { TestBed } from "@angular/core/testing";
import { describe, it, expect, beforeEach } from "vitest";
import { findGame } from "../../provider/game_catalog";
import { GameThumbComponent } from "./game_thumb.component";

describe("GameThumbComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameThumbComponent],
    }).compileComponents();
  });

  function render(slug: string): HTMLElement {
    const fixture = TestBed.createComponent(GameThumbComponent);
    fixture.componentRef.setInput("game", findGame(slug)!);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it("shows the screenshot of a game the site hosts", () => {
    const el = render("spider");

    expect(el.querySelector("img")?.getAttribute("src")).toBe(
      "/play/solitaire/docs/screenshots/spider/thumb.webp",
    );
    expect(el.querySelector("svg")).toBeNull();
  });

  it("draws a game still to come", () => {
    const el = render("sudoku");

    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelectorAll("svg line").length).toBeGreaterThan(0);
  });
});
