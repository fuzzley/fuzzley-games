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
} from "@test/support/game_model_mock";
import { clickElement, query, queryText } from "@test/support/dom";

describe("VictoryOverlayComponent", () => {
  let fixture: ComponentFixture<VictoryOverlayComponent>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;
  let session: GameSessionService;

  beforeEach(async () => {
    mockGameModel = createMockGameModel({ score: 500, moves: 45 });

    await TestBed.configureTestingModule({
      imports: [VictoryOverlayComponent],
      providers: [
        GameSessionService,
        {
          provide: GameCatalogService,
          useValue: asCatalog(createMockCatalog(mockGameModel)),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VictoryOverlayComponent);
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  it("does not render the victory overlay by default (game not won)", () => {
    session.isGameWon.set(false);
    fixture.detectChanges();

    expect(query(fixture, ".victory-overlay")).toBeNull();
  });

  it("renders the victory overlay when game is won", () => {
    session.isGameWon.set(true);
    fixture.detectChanges();

    expect(query(fixture, ".victory-overlay")).not.toBeNull();
  });

  it("renders the stats inside the victory card", () => {
    session.isGameWon.set(true);
    fixture.detectChanges();

    const stat = (position: number) =>
      queryText(
        fixture,
        `.victory-stats .v-stat:nth-child(${position}) .v-val`,
      );
    expect(stat(1)).toBe("500");
    expect(stat(2)).toBe("00:00");
    expect(stat(3)).toBe("45");
  });

  it("triggers startNewGame() when Play Again button is clicked", () => {
    session.isGameWon.set(true);
    fixture.detectChanges();
    const newGameSpy = vi.spyOn(session, "startNewGame");

    clickElement(fixture, "button");

    expect(newGameSpy).toHaveBeenCalled();
  });
});
