// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { By, Title } from "@angular/platform-browser";
import { AppComponent } from "@/ui/app/component/app/app.component";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { GameBrowserService } from "@/ui/app/service/game_browser.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import { query, queryRequired } from "@test/support/dom";

// The shell renders the game canvas host, which would otherwise boot a real
// Phaser game against jsdom's unimplemented canvas.
vi.mock("@/engine/render/phaser/phaser_host", () => ({
  PhaserHost: class {
    show() {
      /* no-op */
    }
    destroy() {
      /* no-op */
    }
  },
}));

// The board catalog is the only thing here that names Phaser, whose module
// init does not survive jsdom.
vi.mock("@/ui/app/provider/board_catalog", () => ({
  makeBoardScene: () => ({}),
}));

describe("AppComponent Composition", () => {
  let fixture: ComponentFixture<AppComponent>;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(AppComponent);

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  /** Returns whether the settings drawer is showing. */
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
    expect(query(fixture, "app-game-browser")).not.toBeNull();
    expect(query(fixture, "app-settings-drawer")).not.toBeNull();
    expect(query(fixture, "app-victory-overlay")).not.toBeNull();
    expect(query(fixture, "app-confirmation-dialog")).not.toBeNull();
  });

  it("puts the board in a main landmark, so it can be navigated to", () => {
    expect(query(fixture, "main.board-area")).not.toBeNull();
  });

  it("names the game on the table in the page title", () => {
    expect(TestBed.inject(Title).getTitle()).toBe("Klondike · fSolitaire");
  });

  it("retitles the page when a different game is put on the table", () => {
    harness.catalog.select("freecell");
    fixture.detectChanges();

    expect(TestBed.inject(Title).getTitle()).toBe("FreeCell · fSolitaire");
  });

  it("tells the chrome on the document root which hand the player uses", () => {
    expect(document.documentElement.dataset["hand"]).toBe("right");
  });

  it("tells the chrome when the player changes hand", () => {
    harness.presentation.hand.set("left");
    TestBed.flushEffects();

    expect(document.documentElement.dataset["hand"]).toBe("left");
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

  it("opens the game browser on Ctrl and K from anywhere", () => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );

    expect(TestBed.inject(GameBrowserService).isOpen()).toBe(true);
  });
});
