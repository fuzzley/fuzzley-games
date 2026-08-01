// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { DebugPanelComponent } from "@/ui/app/component/debug_panel/debug_panel.component";
import { GameSessionService } from "@/ui/app/service/game_session.service";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import {
  createMockGameModel,
  createMockCatalog,
  asCatalog,
} from "@test/support/game_model_mock";
import { clickElement, query, queryAll, queryText } from "@test/support/dom";

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
        {
          provide: GameCatalogService,
          useValue: asCatalog(createMockCatalog(mockGameModel)),
        },
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

  it("turns almost-win on when its button is clicked", () => {
    clickElement(fixture, ".segmented-control button:nth-child(2)");

    expect(session.optionValues()["almostWin"]).toBe(1);
  });

  it("turns almost-win off when Normal is clicked", () => {
    clickElement(fixture, ".segmented-control button:nth-child(2)");
    fixture.detectChanges();

    clickElement(fixture, ".segmented-control button:nth-child(1)");

    expect(session.optionValues()["almostWin"]).toBe(0);
  });

  it("shows only debug rules, not the ones a player picks", () => {
    expect(
      queryAll(fixture, ".segmented-control button").map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(["Normal", "Almost Win"]);
  });
});
