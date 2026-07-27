// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { AppComponent } from "@/ui/app/component/app/app.component";
import { GAME_MODEL } from "@/ui/app/provider/game_model.provider";
import {
  createMockGameModel,
  asGameModel,
} from "@test/support/game_model_mock";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { query } from "@test/support/dom";

// The shell renders the game canvas host, which would otherwise boot a real
// Phaser game against jsdom's unimplemented canvas.
vi.mock("@/game/solitaire", () => ({
  Solitaire: class {
    start() {
      /* no-op */
    }
    destroy() {
      /* no-op */
    }
  },
}));

describe("AppComponent Composition", () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let mockGameModel: ReturnType<typeof createMockGameModel>;

  beforeEach(async () => {
    mockGameModel = createMockGameModel();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: GAME_MODEL, useValue: asGameModel(mockGameModel) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("renders the child components in the shell", () => {
    expect(query(fixture, "app-header-bar")).not.toBeNull();
    expect(query(fixture, "app-settings-drawer")).not.toBeNull();
    expect(query(fixture, "app-victory-overlay")).not.toBeNull();
    expect(query(fixture, "app-confirmation-dialog")).not.toBeNull();
  });

  it("toggles showSettings based on child output emissions", () => {
    expect(component.showSettings()).toBe(false);

    // Get HeaderBarComponent debug element and trigger openSettings output
    const headerDe = fixture.debugElement.query(
      By.directive(HeaderBarComponent),
    );
    headerDe.triggerEventHandler("openSettings", null);
    fixture.detectChanges();
    expect(component.showSettings()).toBe(true);

    // Get SettingsDrawerComponent debug element and trigger close output
    const drawerDe = fixture.debugElement.query(
      By.directive(SettingsDrawerComponent),
    );
    drawerDe.triggerEventHandler("close", null);
    fixture.detectChanges();
    expect(component.showSettings()).toBe(false);
  });
});
