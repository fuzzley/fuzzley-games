// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { InjectionToken } from "@angular/core";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { AppComponent } from "@/ui/app/component/app/app.component";
import { GameCatalogService } from "@/ui/app/service/game_catalog.service";
import {
  createMockGameModel,
  createMockCatalog,
  asCatalog,
} from "@test/support/game_model_mock";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { query } from "@test/support/dom";

// The shell renders the game canvas host, which would otherwise boot a real
// Phaser game against jsdom's unimplemented canvas.
vi.mock("@/games/klondike/klondike", () => ({
  Klondike: class {
    start() {
      /* no-op */
    }
    destroy() {
      /* no-op */
    }
  },
}));

// The board catalog is the only thing here that names Phaser, whose module
// init does not survive jsdom. What this component does with a scene is the
// subject; building a real one is not.
vi.mock("@/ui/app/provider/board_catalog", () => ({
  GAME_BOARD_SCENE: new InjectionToken("GAME_BOARD_SCENE", {
    providedIn: "root",
    factory: () => ({}),
  }),
}));

describe("AppComponent Composition", () => {
  let fixture: ComponentFixture<AppComponent>;
  let mockGameModel: ReturnType<typeof createMockGameModel>;

  beforeEach(async () => {
    mockGameModel = createMockGameModel();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: GameCatalogService,
          useValue: asCatalog(createMockCatalog(mockGameModel)),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it("renders the child components in the shell", () => {
    expect(query(fixture, "app-header-bar")).not.toBeNull();
    expect(query(fixture, "app-settings-drawer")).not.toBeNull();
    expect(query(fixture, "app-victory-overlay")).not.toBeNull();
    expect(query(fixture, "app-confirmation-dialog")).not.toBeNull();
  });

  it("opens the settings drawer when header bar requests settings", () => {
    const headerDe = fixture.debugElement.query(
      By.directive(HeaderBarComponent),
    );

    headerDe.triggerEventHandler("openSettings", null);
    fixture.detectChanges();

    expect(query(fixture, ".drawer")).not.toBeNull();
  });

  it("closes the settings drawer when settings drawer emits closed", () => {
    const headerDe = fixture.debugElement.query(
      By.directive(HeaderBarComponent),
    );
    headerDe.triggerEventHandler("openSettings", null);
    fixture.detectChanges();
    const drawerDe = fixture.debugElement.query(
      By.directive(SettingsDrawerComponent),
    );

    drawerDe.triggerEventHandler("closed", null);
    fixture.detectChanges();

    expect(query(fixture, ".drawer")).toBeNull();
  });
});
