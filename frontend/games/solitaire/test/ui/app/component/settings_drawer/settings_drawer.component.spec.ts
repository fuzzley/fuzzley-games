// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { ThemeService } from "@/ui/app/service/theme.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import {
  createMockGameModel,
  createMockCatalog,
  asCatalog,
} from "@test/support/game_model_mock";
import { clickElement, queryAll, queryRequired } from "@test/support/dom";
import { isDialogOpen, pressEscape } from "@test/support/dialog";

describe("SettingsDrawerComponent", () => {
  let fixture: ComponentFixture<SettingsDrawerComponent>;
  let session: GameSessionService;
  let themeService: ThemeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsDrawerComponent],
      providers: [
        GameSessionService,
        ThemeService,
        {
          provide: GameCatalogService,
          useValue: asCatalog(createMockCatalog(createMockGameModel())),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsDrawerComponent);
    session = TestBed.inject(GameSessionService);
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  /** Opens the drawer and renders it. */
  function openDrawer(): void {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
  }

  it("stays closed until asked to open", () => {
    expect(isDialogOpen(fixture)).toBe(false);
  });

  it("opens when the open input is set", () => {
    openDrawer();

    expect(isDialogOpen(fixture)).toBe(true);
  });

  it("asks to close when the close button is clicked", () => {
    openDrawer();
    const closeSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closeSpy);

    clickElement(fixture, ".btn-close");

    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("asks to close when the backdrop is clicked", () => {
    openDrawer();
    const closeSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closeSpy);

    queryRequired<HTMLDialogElement>(fixture, "dialog").click();

    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("asks to close on Escape", () => {
    openDrawer();
    const closeSpy = vi.fn();
    fixture.componentInstance.closed.subscribe(closeSpy);

    pressEscape();

    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("renders whichever rules the game on the table offers", () => {
    openDrawer();

    // Scoped to the drawer's own groups: the debug panel nests its options
    // inside .debug-panel and has its own spec.
    expect(
      queryAll(fixture, ".drawer-content > app-option-group .segment-btn").map(
        (button) => button.textContent?.trim(),
      ),
    ).toEqual(["Draw 1", "Draw 3"]);
  });

  it("marks the chosen rule as checked, not merely highlighted", () => {
    openDrawer();

    const drawThree = queryAll(
      fixture,
      ".drawer-content > app-option-group .segment-btn",
    )[1];
    expect(drawThree.getAttribute("aria-checked")).toBe("true");
  });

  it("changes a rule when one of its choices is clicked", () => {
    openDrawer();

    clickElement(
      fixture,
      ".drawer-content > app-option-group .segment-btn:nth-child(1)",
    );

    expect(session.optionValues()["drawCount"]).toBe(1);
  });

  it("changes the card back when one is picked", () => {
    openDrawer();

    clickElement(fixture, ".card-back-selector button:nth-child(2)");

    expect(session.cardBack()).toBe("card-back-red");
  });

  it("marks the chosen card back as checked", () => {
    openDrawer();

    clickElement(fixture, ".card-back-selector button:nth-child(2)");
    fixture.detectChanges();

    expect(
      queryAll(fixture, ".card-back-selector button")[1].getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("changes the table theme when a swatch is picked", () => {
    openDrawer();

    clickElement(fixture, ".theme-option[aria-label='Royal Velvet']");

    expect(themeService.selectedTheme()).toBe("purple");
  });

  it("names each theme swatch, which is otherwise just a colour", () => {
    openDrawer();

    expect(
      queryAll(fixture, ".theme-option").map((button) =>
        button.getAttribute("aria-label"),
      ),
    ).toEqual([
      "Emerald Felt",
      "Deep Ocean",
      "Midnight Charcoal",
      "Royal Velvet",
    ]);
  });
});
