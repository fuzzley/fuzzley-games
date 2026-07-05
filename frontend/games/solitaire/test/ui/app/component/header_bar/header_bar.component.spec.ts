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
    const scoreVal = fixture.nativeElement
      .querySelector(".score-card .value")
      .textContent.trim();
    const movesVal = fixture.nativeElement
      .querySelector(".moves-card .value")
      .textContent.trim();
    const timerVal = fixture.nativeElement
      .querySelector(".timer-card .value")
      .textContent.trim();

    expect(scoreVal).toBe("120");
    expect(movesVal).toBe("10");
    expect(timerVal).toBe("00:00");
  });

  it("updates metrics dynamically when session state changes", () => {
    mockGameModel.state.score$.next(350);
    mockGameModel.state.moves$.next(25);
    fixture.detectChanges();

    const scoreVal = fixture.nativeElement
      .querySelector(".score-card .value")
      .textContent.trim();
    const movesVal = fixture.nativeElement
      .querySelector(".moves-card .value")
      .textContent.trim();

    expect(scoreVal).toBe("350");
    expect(movesVal).toBe("25");
  });

  it("triggers session.restartGame() when restart button is clicked", () => {
    const restartSpy = vi.spyOn(session, "restartGame");
    const restartBtn = fixture.nativeElement.querySelector(
      "button[title*='Restart']",
    );
    restartBtn.click();

    expect(restartSpy).toHaveBeenCalled();
  });

  it("triggers session.startNewGame() when new game button is clicked", () => {
    const newGameSpy = vi.spyOn(session, "startNewGame");
    const newGameBtn = fixture.nativeElement.querySelector(
      "button[title*='New Game']",
    );
    newGameBtn.click();

    expect(newGameSpy).toHaveBeenCalled();
  });

  it("emits openSettings when settings button is clicked", () => {
    let emittedCount = 0;
    component.openSettings.subscribe(() => {
      emittedCount++;
    });

    const settingsBtn = fixture.nativeElement.querySelector(".btn-settings");
    settingsBtn.click();

    expect(emittedCount).toBe(1);
  });
});
