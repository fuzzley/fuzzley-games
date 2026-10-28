// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { By, Title } from "@angular/platform-browser";
import type { ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { AppComponent } from "@/ui/app/component/app/app.component";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { GameBrowserService } from "@/ui/app/service/game_browser.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import { query, queryRequired } from "@test/support/dom";

// The shell renders the game canvas host, which would otherwise boot a real
// Phaser game against jsdom's unimplemented canvas.
vi.mock("@fz/phaser/host", () => ({
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

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset["theme"];
    document.head.querySelector('meta[name="theme-color"]')?.remove();
  });

  /** Puts the palette on the page, as a player choosing it does. */
  function choosePalette(id: ThemeId): void {
    TestBed.inject(ThemeService).select(id);
    fixture.detectChanges();
  }

  /** Returns whether the settings drawer is showing. */
  function drawerIsOpen(): boolean {
    return queryRequired(
      fixture,
      "app-settings-drawer dialog",
      HTMLDialogElement,
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
    expect(query(fixture, "fz-confirm-dialog")).not.toBeNull();
  });

  it("puts the board in a main landmark, so it can be navigated to", () => {
    expect(query(fixture, "main.board-area")).not.toBeNull();
  });

  it("names the game on the table in the page title", () => {
    expect(TestBed.inject(Title).getTitle()).toBe(
      "Klondike · Solitaire Collection",
    );
  });

  it("retitles the page when a different game is put on the table", () => {
    harness.catalog.select("freecell");
    fixture.detectChanges();

    expect(TestBed.inject(Title).getTitle()).toBe(
      "FreeCell · Solitaire Collection",
    );
  });

  it("tells the chrome on the document root which side the stock is on", () => {
    // Auto, on a screen that is not a phone.
    expect(document.documentElement.dataset["stockSide"]).toBe("left");
  });

  it("tells the chrome when Auto moves the stock for a phone", () => {
    harness.presentation.formFactor.set("phone-landscape");
    TestBed.tick();

    expect(document.documentElement.dataset["stockSide"]).toBe("right");
  });

  it("tells the chrome when the player moves the stock", () => {
    harness.presentation.formFactor.set("phone-portrait");
    harness.presentation.stockSide.set("left");
    TestBed.tick();

    expect(document.documentElement.dataset["stockSide"]).toBe("left");
  });

  it("dresses the chrome in the palette in use, a light one too", () => {
    choosePalette("classic");

    const worn = (fixture.nativeElement as HTMLElement).closest("[data-theme]");

    expect(worn).toHaveProperty("dataset.theme", "classic");
  });

  it("paints the page behind the chrome with the felt", () => {
    harness.presentation.felt.set("purple");
    TestBed.tick();

    expect(
      document.documentElement.style.getPropertyValue("--table-felt"),
    ).toBe("#3c096c");
  });

  it("tints the browser's own toolbar with the felt", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      '<meta name="theme-color" content="#0f4d0e" />',
    );

    harness.presentation.felt.set("blue");
    TestBed.tick();

    expect(
      document
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute("content"),
    ).toBe("#1b4353");
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
