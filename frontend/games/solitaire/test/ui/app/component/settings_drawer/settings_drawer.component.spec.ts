// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { ThemeService } from "@/ui/app/service/theme.service";
import { GAME_MODEL } from "@/ui/app/provider/game_model.provider";
import {
  createMockGameModel,
  asGameModel,
} from "@test/support/game_model_mock";

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
        { provide: GAME_MODEL, useValue: asGameModel(mockGameModel) },
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

    const drawer = fixture.nativeElement.querySelector(".drawer");
    expect(drawer).toBeNull();
  });

  it("renders the settings drawer when open input is true", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector(".drawer");
    expect(drawer).not.toBeNull();
  });

  it("emits close when the backdrop is clicked", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    let closeCount = 0;
    component.close.subscribe(() => {
      closeCount++;
    });

    const backdrop = fixture.nativeElement.querySelector(".drawer-backdrop");
    backdrop.click();

    expect(closeCount).toBe(1);
  });

  it("emits close when the close button is clicked", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    let closeCount = 0;
    component.close.subscribe(() => {
      closeCount++;
    });

    const closeBtn = fixture.nativeElement.querySelector(".btn-close");
    closeBtn.click();

    expect(closeCount).toBe(1);
  });

  it("triggers draw mode selection change in session", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    const setDrawModeSpy = vi.spyOn(session, "setDrawMode");
    const draw1Btn = fixture.nativeElement.querySelectorAll(
      ".segmented-control button",
    )[0]; // Draw 1
    draw1Btn.click();

    expect(setDrawModeSpy).toHaveBeenCalledWith(1);
  });

  it("triggers card back design selection change in session", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    const setCardBackSpy = vi.spyOn(session, "setCardBack");
    const redBackBtn = fixture.nativeElement.querySelector(
      ".card-back-option.red-back",
    );
    redBackBtn.click();

    expect(setCardBackSpy).toHaveBeenCalledWith("card-back-red");
  });

  it("triggers table theme selection change in ThemeService", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    const setThemeSpy = vi.spyOn(themeService, "setTheme");
    const purpleThemeBtn = fixture.nativeElement.querySelector(
      ".theme-option[title='Royal Velvet']",
    );
    purpleThemeBtn.click();

    expect(setThemeSpy).toHaveBeenCalledWith("purple");
  });
});
