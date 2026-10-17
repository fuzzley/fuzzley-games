import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { describe, it, expect, beforeEach } from "vitest";
import { GamePageComponent } from "./game_page.component";

describe("GamePageComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render(slug: string): HTMLElement {
    const fixture = TestBed.createComponent(GamePageComponent);
    fixture.componentRef.setInput("slug", slug);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it("opens a game the site hosts full-page, at its build's address", () => {
    const el = render("bakers-dozen");
    const introPlay = el.querySelector<HTMLAnchorElement>("a.play-cta");
    const stagePlay = el.querySelector<HTMLAnchorElement>("a.stage.play");

    expect(introPlay?.getAttribute("href")).toBe(
      "/play/solitaire/#/bakersdozen",
    );
    expect(introPlay?.textContent?.trim()).toBe("Play Baker’s Dozen");
    expect(stagePlay?.getAttribute("href")).toBe(
      "/play/solitaire/#/bakersdozen",
    );
    expect(stagePlay?.textContent?.trim()).toBe("Play Baker’s Dozen");
    expect(stagePlay?.querySelector("img")?.getAttribute("src")).toBe(
      "/play/solitaire/docs/screenshots/bakersdozen/preview.webp",
    );
  });

  it("says a game is coming soon, with no way to play it", () => {
    const el = render("reversi");

    expect(el.querySelector("h1 .badge")?.textContent?.trim()).toBe(
      "Coming soon",
    );
    expect(el.querySelector("a.play")).toBeNull();
  });

  it("says when there's no game at the address", () => {
    const el = render("hearts");

    expect(el.querySelector("h1")?.textContent).toContain(
      "There’s no game at this address.",
    );
  });
});
