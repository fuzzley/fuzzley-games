import { TestBed } from "@angular/core/testing";
import { describe, it, expect, beforeEach } from "vitest";
import { ThemeService } from "../../service/theme.service";
import { ThemeMenuComponent } from "./theme_menu.component";

describe("ThemeMenuComponent", () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.dataset["theme"] = "classic";
    await TestBed.configureTestingModule({
      imports: [ThemeMenuComponent],
    }).compileComponents();
  });

  it("opens the list, switches palette and closes again", () => {
    const fixture = TestBed.createComponent(ThemeMenuComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const panel = el.querySelector<HTMLElement>(".panel")!;
    expect(panel.hidden).toBe(true);

    el.querySelector<HTMLButtonElement>(".trigger")!.click();
    fixture.detectChanges();
    expect(panel.hidden).toBe(false);

    const casino = Array.from(
      el.querySelectorAll<HTMLButtonElement>(".option"),
    ).find((option) => option.textContent?.includes("Casino night"))!;
    casino.click();
    fixture.detectChanges();
    expect(TestBed.inject(ThemeService).current()).toBe("casino");
    expect(casino.getAttribute("aria-pressed")).toBe("true");
    expect(panel.hidden).toBe(true);
  });

  it("closes on Escape and hands focus back to its button", () => {
    const fixture = TestBed.createComponent(ThemeMenuComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector<HTMLButtonElement>(".trigger")!;

    trigger.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>(".option")!.focus();
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    fixture.detectChanges();

    expect(el.querySelector<HTMLElement>(".panel")!.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    fixture.nativeElement.remove();
  });
});
