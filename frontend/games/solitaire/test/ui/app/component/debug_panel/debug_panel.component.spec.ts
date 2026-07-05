// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { DebugPanelComponent } from "@/ui/app/component/debug_panel/debug_panel.component";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { GAME_MODEL } from "@/ui/app/provider/game_model.provider";
import {
  createMockGameModel,
  asGameModel,
} from "@test/support/game_model_mock";

describe("DebugPanelComponent", () => {
  let component: DebugPanelComponent;
  let fixture: ComponentFixture<DebugPanelComponent>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;
  let session: GameSessionService;

  beforeEach(async () => {
    mockGameModel = createMockGameModel();

    await TestBed.configureTestingModule({
      imports: [DebugPanelComponent],
      providers: [
        GameSessionService,
        { provide: GAME_MODEL, useValue: asGameModel(mockGameModel) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DebugPanelComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  it("renders the debug panel options", () => {
    const debugPanel = fixture.nativeElement.querySelector(".debug-panel");
    expect(debugPanel).not.toBeNull();

    const title = fixture.nativeElement
      .querySelector(".debug-label")
      .textContent.trim();
    expect(title).toContain("Debug Options");
  });

  it("toggles almost-win debug mode to true when Almost Win button is clicked", () => {
    const setAlmostWinSpy = vi.spyOn(session, "setAlmostWin");
    const buttons = fixture.nativeElement.querySelectorAll(
      ".segmented-control button",
    );
    const almostWinBtn = buttons[1]; // Almost Win

    almostWinBtn.click();

    expect(setAlmostWinSpy).toHaveBeenCalledWith(true);
  });

  it("toggles almost-win debug mode to false when Normal button is clicked", () => {
    const setAlmostWinSpy = vi.spyOn(session, "setAlmostWin");
    const buttons = fixture.nativeElement.querySelectorAll(
      ".segmented-control button",
    );
    const normalBtn = buttons[0]; // Normal

    normalBtn.click();

    expect(setAlmostWinSpy).toHaveBeenCalledWith(false);
  });
});
