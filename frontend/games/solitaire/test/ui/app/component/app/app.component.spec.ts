// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { AppComponent } from "@/ui/app/component/app/app.component";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { configureUiTestBed } from "@test/support/ui/testbed";
import { query, queryRequired } from "@test/support/dom";

// The shell renders the game canvas host, which would otherwise boot a real
// Phaser game against jsdom's unimplemented canvas.
vi.mock("@/engine/render/phaser/phaser_host", () => ({
  PhaserHost: class {
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
  makeBoardScene: () => ({}),
}));

describe("AppComponent Composition", () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await configureUiTestBed(AppComponent);

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  /** Whether the settings drawer is showing. */
  function drawerIsOpen(): boolean {
    return queryRequired<HTMLDialogElement>(
      fixture,
      "app-settings-drawer dialog",
    ).open;
  }

  /** Fires an output of one of the shell's children. */
  function emitFromChild(component: unknown, output: string): void {
    fixture.debugElement
      .query(By.directive(component as never))
      .triggerEventHandler(output, null);
    fixture.detectChanges();
  }

  it("renders the child components in the shell", () => {
    expect(query(fixture, "app-header-bar")).not.toBeNull();
    expect(query(fixture, "app-game-menu")).not.toBeNull();
    expect(query(fixture, "app-settings-drawer")).not.toBeNull();
    expect(query(fixture, "app-victory-overlay")).not.toBeNull();
    expect(query(fixture, "app-confirmation-dialog")).not.toBeNull();
  });

  it("keeps the settings drawer closed to begin with", () => {
    expect(drawerIsOpen()).toBe(false);
  });

  it("opens the settings drawer when the header bar asks for it", () => {
    emitFromChild(HeaderBarComponent, "openSettings");

    expect(drawerIsOpen()).toBe(true);
  });

  it("closes the settings drawer when it asks to be closed", () => {
    emitFromChild(HeaderBarComponent, "openSettings");

    emitFromChild(SettingsDrawerComponent, "closed");

    expect(drawerIsOpen()).toBe(false);
  });
});
