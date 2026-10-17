import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { describe, it, expect, beforeEach } from "vitest";
import { HomeComponent } from "./home.component";

describe("HomeComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render(q?: string) {
    const fixture = TestBed.createComponent(HomeComponent);
    if (q !== undefined) fixture.componentRef.setInput("q", q);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const headings = () =>
      Array.from(el.querySelectorAll("h2")).map((h) => h.textContent?.trim());
    const names = () =>
      Array.from(el.querySelectorAll(".tile .name")).map((n) =>
        n.firstChild?.textContent?.trim(),
      );
    return { el, headings, names };
  }

  it("shows every category with a link to see all of it", () => {
    const { el, headings } = render();
    expect(headings()).toEqual(["Solitaire", "Classics"]);
    expect(
      Array.from(el.querySelectorAll(".see-all")).map((a) =>
        a.getAttribute("href"),
      ),
    ).toEqual(["/category/solitaire", "/category/classics"]);
  });

  it("keeps only the sections with matches when searching", () => {
    const { el, headings, names } = render("whitehead");
    expect(headings()).toEqual(["Solitaire"]);
    expect(names()).toEqual(["Klondike"]);
    expect(el.querySelector(".count")?.textContent?.trim()).toBe(
      "1 of 44 games",
    );
  });

  it("offers a way back when nothing matches", () => {
    const { el, headings } = render("chess");
    expect(headings()).toEqual([]);
    expect(el.querySelector(".empty-title")?.textContent).toContain(
      "No games match “chess”",
    );
    expect(el.querySelector(".empty a")?.getAttribute("href")).toBe("/");
  });
});
