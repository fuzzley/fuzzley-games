// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
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
    const header = fixture.nativeElement.querySelector("app-header-bar");
    const drawer = fixture.nativeElement.querySelector("app-settings-drawer");
    const victory = fixture.nativeElement.querySelector("app-victory-overlay");
    const confirmation = fixture.nativeElement.querySelector(
      "app-confirmation-dialog",
    );

    expect(header).not.toBeNull();
    expect(drawer).not.toBeNull();
    expect(victory).not.toBeNull();
    expect(confirmation).not.toBeNull();
  });

  it("toggles showSettings based on child output emissions", () => {
    expect(component.showSettings).toBe(false);

    // Get HeaderBarComponent debug element and trigger openSettings output
    const headerDe = fixture.debugElement.query(
      By.directive(HeaderBarComponent),
    );
    headerDe.triggerEventHandler("openSettings", null);
    fixture.detectChanges();
    expect(component.showSettings).toBe(true);

    // Get SettingsDrawerComponent debug element and trigger close output
    const drawerDe = fixture.debugElement.query(
      By.directive(SettingsDrawerComponent),
    );
    drawerDe.triggerEventHandler("close", null);
    fixture.detectChanges();
    expect(component.showSettings).toBe(false);
  });
});
