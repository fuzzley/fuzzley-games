// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { GAME_MODEL } from "@/ui/app/provider/game_model.provider";
import {
  createMockGameModel,
  asGameModel,
} from "@test/support/game_model_mock";
import { clickElement, queryRequired, queryText } from "@test/support/dom";

describe("HeaderBarComponent", () => {
  let component: HeaderBarComponent;
  let fixture: ComponentFixture<HeaderBarComponent>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;
  let session: GameSessionService;

  beforeEach(async () => {
    mockGameModel = createMockGameModel({ score: 120, moves: 10 });

    await TestBed.configureTestingModule({
      imports: [HeaderBarComponent],
      providers: [
        GameSessionService,
        { provide: GAME_MODEL, useValue: asGameModel(mockGameModel) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderBarComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  it("renders metrics from the session", () => {
    expect(queryText(fixture, ".score-card .value")).toBe("120");
    expect(queryText(fixture, ".moves-card .value")).toBe("10");
    expect(queryText(fixture, ".timer-card .value")).toBe("00:00");
  });

  it("updates metrics dynamically when session state changes", () => {
    mockGameModel.state.score$.next(350);
    mockGameModel.state.moves$.next(25);
    fixture.detectChanges();

    expect(queryText(fixture, ".score-card .value")).toBe("350");
    expect(queryText(fixture, ".moves-card .value")).toBe("25");
  });

  it("triggers session.restartGame() when restart button is clicked", () => {
    const restartSpy = vi.spyOn(session, "restartGame");

    clickElement(fixture, "button[title*='Restart']");

    expect(restartSpy).toHaveBeenCalled();
  });

  it("triggers session.startNewGame() when new game button is clicked", () => {
    const newGameSpy = vi.spyOn(session, "startNewGame");

    clickElement(fixture, "button[title*='New Game']");

    expect(newGameSpy).toHaveBeenCalled();
  });

  it("disables the undo button with nothing to take back", () => {
    const undoButton = queryRequired(fixture, "button[title*='Undo']");

    expect((undoButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables the undo button once the model has history", () => {
    mockGameModel.state.undoDepth$.next(1);
    fixture.detectChanges();

    const undoButton = queryRequired(fixture, "button[title*='Undo']");
    expect((undoButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("triggers session.undo() when the undo button is clicked", () => {
    mockGameModel.state.undoDepth$.next(1);
    fixture.detectChanges();
    const undoSpy = vi.spyOn(session, "undo");

    clickElement(fixture, "button[title*='Undo']");

    expect(undoSpy).toHaveBeenCalled();
  });

  it("emits openSettings when settings button is clicked", () => {
    let emittedCount = 0;
    component.openSettings.subscribe(() => {
      emittedCount++;
    });

    clickElement(fixture, ".btn-settings");

    expect(emittedCount).toBe(1);
  });
});
