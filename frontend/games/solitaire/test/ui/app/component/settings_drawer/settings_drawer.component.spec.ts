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
import { clickElement, query, queryAll } from "@test/support/dom";

describe("SettingsDrawerComponent", () => {
  let component: SettingsDrawerComponent;
  let fixture: ComponentFixture<SettingsDrawerComponent>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;
  let session: GameSessionService;
  let themeService: ThemeService;

  beforeEach(async () => {
    mockGameModel = createMockGameModel();

    await TestBed.configureTestingModule({
      imports: [SettingsDrawerComponent],
      providers: [
        GameSessionService,
        ThemeService,
        {
          provide: GameCatalogService,
          useValue: asCatalog(createMockCatalog(mockGameModel)),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsDrawerComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  it("does not render the settings drawer if open input is false", () => {
    fixture.componentRef.setInput("open", false);
    fixture.detectChanges();

    expect(query(fixture, ".drawer")).toBeNull();
  });

  it("renders the settings drawer when open input is true", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    expect(query(fixture, ".drawer")).not.toBeNull();
  });

  it("emits close when the backdrop is clicked", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    let closeCount = 0;
    component.closed.subscribe(() => {
      closeCount++;
    });

    clickElement(fixture, ".drawer-backdrop");

    expect(closeCount).toBe(1);
  });

  it("emits close when the close button is clicked", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    let closeCount = 0;
    component.closed.subscribe(() => {
      closeCount++;
    });

    clickElement(fixture, ".btn-close");

    expect(closeCount).toBe(1);
  });

  it("triggers draw mode selection change in session", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
    const setDrawModeSpy = vi.spyOn(session, "setDrawMode");

    queryAll(fixture, ".segmented-control button")[0].click(); // Draw 1

    expect(setDrawModeSpy).toHaveBeenCalledWith(1);
  });

  it("triggers card back design selection change in session", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
    const setCardBackSpy = vi.spyOn(session, "setCardBack");

    clickElement(fixture, ".card-back-option.red-back");

    expect(setCardBackSpy).toHaveBeenCalledWith("card-back-red");
  });

  it("triggers table theme selection change in ThemeService", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
    const setThemeSpy = vi.spyOn(themeService, "setTheme");

    clickElement(fixture, ".theme-option[title='Royal Velvet']");

    expect(setThemeSpy).toHaveBeenCalledWith("purple");
  });
});
