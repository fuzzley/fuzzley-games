import { TestBed } from "@angular/core/testing";
import { THEME_STORAGE_KEY } from "../provider/themes";
import { ThemeService } from "./theme.service";

describe("ThemeService", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset["theme"] = "pastel";
  });

  it("starts from the palette index.html already chose", () => {
    expect(TestBed.inject(ThemeService).current()).toBe("pastel");
  });

  it("falls back to Classic felt when the page has no valid palette", () => {
    document.documentElement.dataset["theme"] = "neon";
    expect(TestBed.inject(ThemeService).current()).toBe("classic");
  });

  it("applies and remembers a chosen palette", () => {
    const theme = TestBed.inject(ThemeService);
    theme.select("midnight");
    TestBed.tick();
    expect(document.documentElement.dataset["theme"]).toBe("midnight");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("midnight");
  });
});
