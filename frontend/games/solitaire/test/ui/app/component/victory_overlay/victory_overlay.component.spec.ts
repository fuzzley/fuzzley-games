// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { VictoryOverlayComponent } from "@/ui/app/component/victory_overlay/victory_overlay.component";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { GAME_MODEL } from "@/ui/app/provider/game_model.provider";
import {
  createMockGameModel,
  asGameModel,
} from "@test/support/game_model_mock";

describe("VictoryOverlayComponent", () => {
  let component: VictoryOverlayComponent;
  let fixture: ComponentFixture<VictoryOverlayComponent>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;
  let session: GameSessionService;

  beforeEach(async () => {
    mockGameModel = createMockGameModel({ score: 500, moves: 45 });

    await TestBed.configureTestingModule({
      imports: [VictoryOverlayComponent],
      providers: [
        GameSessionService,
        { provide: GAME_MODEL, useValue: asGameModel(mockGameModel) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VictoryOverlayComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  it("does not render the victory overlay by default (game not won)", () => {
    session.isGameWon.set(false);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector(".victory-overlay");
    expect(overlay).toBeNull();
  });

  it("renders the victory overlay when game is won", () => {
    session.isGameWon.set(true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector(".victory-overlay");
    expect(overlay).not.toBeNull();
  });

  it("renders the stats inside the victory card", () => {
    session.isGameWon.set(true);
    fixture.detectChanges();

    const scoreVal = fixture.nativeElement
      .querySelector(".victory-stats .v-stat:nth-child(1) .v-val")
      .textContent.trim();
    const timerVal = fixture.nativeElement
      .querySelector(".victory-stats .v-stat:nth-child(2) .v-val")
      .textContent.trim();
    const movesVal = fixture.nativeElement
      .querySelector(".victory-stats .v-stat:nth-child(3) .v-val")
      .textContent.trim();

    expect(scoreVal).toBe("500");
    expect(timerVal).toBe("00:00");
    expect(movesVal).toBe("45");
  });

  it("triggers startNewGame() when Play Again button is clicked", () => {
    session.isGameWon.set(true);
    fixture.detectChanges();

    const newGameSpy = vi.spyOn(session, "startNewGame");
    const playAgainBtn = fixture.nativeElement.querySelector("button");
    playAgainBtn.click();

    expect(newGameSpy).toHaveBeenCalled();
  });
});
