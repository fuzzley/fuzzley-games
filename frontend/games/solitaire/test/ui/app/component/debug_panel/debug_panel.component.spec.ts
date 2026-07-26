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
import { query, queryAll, queryText } from "@test/support/dom";

describe("DebugPanelComponent", () => {
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
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  it("renders the debug panel", () => {
    expect(query(fixture, ".debug-panel")).not.toBeNull();
  });

  it("labels the debug panel", () => {
    expect(queryText(fixture, ".debug-label")).toContain("Debug Options");
  });

  it("toggles almost-win debug mode to true when Almost Win button is clicked", () => {
    const setAlmostWinSpy = vi.spyOn(session, "setAlmostWin");

    queryAll(fixture, ".segmented-control button")[1].click(); // Almost Win

    expect(setAlmostWinSpy).toHaveBeenCalledWith(true);
  });

  it("toggles almost-win debug mode to false when Normal button is clicked", () => {
    const setAlmostWinSpy = vi.spyOn(session, "setAlmostWin");

    queryAll(fixture, ".segmented-control button")[0].click(); // Normal

    expect(setAlmostWinSpy).toHaveBeenCalledWith(false);
  });
});
