// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { VictoryOverlayComponent } from "@/ui/app/component/victory_overlay/victory_overlay.component";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import {
  createMockGameModel,
  createMockCatalog,
  asCatalog,
  type MockGameModel,
} from "@test/support/game_model_mock";
import { clickElement, queryRequired, queryText } from "@test/support/dom";
import { isDialogOpen, pressEscape } from "@test/support/dialog";

describe("VictoryOverlayComponent", () => {
  let fixture: ComponentFixture<VictoryOverlayComponent>;
  let model: MockGameModel;
  let session: GameSessionService;
  let winGame: () => void;

  beforeEach(async () => {
    model = createMockGameModel({ score: 500, moves: 45 });
    // Captured from the model's own listener registration, so the win arrives
    // the way a real one does rather than by setting the flag directly.
    model.on = vi.fn((event: string, callback: () => void) => {
      if (event === "game-won") winGame = callback;
    });

    await TestBed.configureTestingModule({
      imports: [VictoryOverlayComponent],
      providers: [
        GameSessionService,
        {
          provide: GameCatalogService,
          useValue: asCatalog(createMockCatalog(model)),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VictoryOverlayComponent);
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  /** Wins the game the way the engine reports it, and renders the result. */
  function win(): void {
    winGame();
    fixture.detectChanges();
  }

  it("stays closed while the game is still being played", () => {
    expect(isDialogOpen(fixture)).toBe(false);
  });

  it("opens once the game is won", () => {
    win();

    expect(isDialogOpen(fixture)).toBe(true);
  });

  it("reports the final score, time and moves", () => {
    win();

    const stat = (position: number) =>
      queryText(
        fixture,
        `.victory-stats .v-stat:nth-child(${position}) .v-val`,
      );
    expect([stat(1), stat(2), stat(3)]).toEqual(["500", "00:00", "45"]);
  });

  it("names each figure, so the numbers are not read out bare", () => {
    win();

    expect(
      queryText(fixture, ".victory-stats .v-stat:nth-child(1) .v-lbl"),
    ).toBe("Score");
  });

  it("deals a new game when Play Again is clicked", () => {
    win();

    clickElement(fixture, ".btn-gradient");

    expect(model.startNewGame).toHaveBeenCalledOnce();
  });

  it("refuses to close on Escape, since a finished board has nothing behind it", () => {
    win();

    pressEscape();
    fixture.detectChanges();

    expect(session.isGameWon()).toBe(true);
    expect(isDialogOpen(fixture)).toBe(true);
  });

  it("refuses to close when the backdrop is clicked", () => {
    win();

    queryRequired<HTMLDialogElement>(fixture, "dialog").click();
    fixture.detectChanges();

    expect(isDialogOpen(fixture)).toBe(true);
  });
});
