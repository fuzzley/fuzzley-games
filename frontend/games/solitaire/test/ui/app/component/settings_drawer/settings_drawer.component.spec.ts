// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { SettingsDrawerComponent } from "@/ui/app/component/settings_drawer/settings_drawer.component";
import { ThemeService } from "@/ui/app/service/theme.service";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import { clickElement, queryAll } from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";
import { clickBackdrop, isDialogOpen, pressEscape } from "@test/support/dialog";
import { CARD_DECKS } from "@/engine/render/card_deck";

describe("SettingsDrawerComponent", () => {
  let fixture: ComponentFixture<SettingsDrawerComponent>;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(SettingsDrawerComponent);

    fixture = TestBed.createComponent(SettingsDrawerComponent);
    fixture.detectChanges();
  });

  /** Opens the drawer and renders it. */
  function openDrawer(): void {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
  }

  /** Watches the drawer's close request. */
  function onClose(): ReturnType<typeof vi.fn> {
    const spy = vi.fn();
    fixture.componentInstance.closed.subscribe(spy);
    return spy;
  }

  /** The drawer's own rule buttons, excluding the debug panel's. */
  function ruleButtons(): HTMLElement[] {
    return queryAll(fixture, ".drawer-content > app-option-group .segment-btn");
  }

  describe("showing and hiding", () => {
    it("stays closed until asked to open", () => {
      expect(isDialogOpen(fixture)).toBe(false);
    });

    it("opens when the open input is set", () => {
      openDrawer();

      expect(isDialogOpen(fixture)).toBe(true);
    });

    it("asks to close when the close button is clicked", () => {
      openDrawer();
      const closed = onClose();

      clickElement(fixture, ".btn-close");

      expect(closed).toHaveBeenCalledOnce();
    });

    it("asks to close when the backdrop is clicked", () => {
      openDrawer();
      const closed = onClose();

      clickBackdrop(fixture);

      expect(closed).toHaveBeenCalledOnce();
    });

    it("asks to close on Escape", () => {
      openDrawer();
      const closed = onClose();

      pressEscape();

      expect(closed).toHaveBeenCalledOnce();
    });
  });

  describe("the game's rules", () => {
    it("renders whichever ones the game on the table offers", () => {
      openDrawer();

      expect(ruleButtons().map((button) => button.textContent?.trim())).toEqual(
        ["Draw 1", "Draw 3"],
      );
    });

    it("marks the chosen one as checked, not merely highlighted", () => {
      openDrawer();

      expect(ruleButtons()[1].getAttribute("aria-checked")).toBe("true");
    });

    it("changes the rule when another choice is clicked", async () => {
      openDrawer();

      ruleButtons()[0].click();
      await flushMicrotasks();

      expect(harness.catalog.setOption).toHaveBeenCalledWith("drawCount", 1);
    });
  });

  describe("the card back", () => {
    it("changes when one is picked", () => {
      openDrawer();

      clickElement(fixture, ".card-back-selector button:nth-child(2)");

      expect(harness.presentation.cardBackStyle()).toBe("card-back-red");
    });

    it("marks the chosen one as checked", () => {
      openDrawer();

      clickElement(fixture, ".card-back-selector button:nth-child(2)");
      fixture.detectChanges();

      expect(
        queryAll(fixture, ".card-back-selector button")[1].getAttribute(
          "aria-checked",
        ),
      ).toBe("true");
    });
  });

  describe("the card deck", () => {
    /** The deck buttons, in the order the catalog offers them. */
    function deckButtons(): Element[] {
      return queryAll(fixture, ".card-deck-selector button");
    }

    it("offers every deck in the catalog", () => {
      openDrawer();

      expect(deckButtons().length).toBe(CARD_DECKS.length);
    });

    it("changes when one is picked", () => {
      openDrawer();

      clickElement(fixture, ".card-deck-selector button:nth-child(1)");

      expect(harness.presentation.cardDeck()).toBe(CARD_DECKS[0].id);
    });

    it("marks the chosen one as checked", () => {
      openDrawer();

      clickElement(fixture, ".card-deck-selector button:nth-child(1)");
      fixture.detectChanges();

      expect(
        deckButtons().map((button) => button.getAttribute("aria-checked")),
      ).toEqual(["true", "false", "false"]);
    });

    it("shows the corner pip only on the decks that have one", () => {
      openDrawer();

      // The preview is what tells the decks apart in the drawer.
      const pipCounts = deckButtons().map(
        (button) => button.querySelectorAll(".card-deck-preview-pip").length,
      );

      expect(pipCounts).toEqual([0, 1, 1]);
    });
  });

  describe("the table theme", () => {
    it("changes when a swatch is picked", () => {
      openDrawer();

      clickElement(fixture, ".theme-option[aria-label='Royal Velvet']");

      expect(TestBed.inject(ThemeService).selectedTheme()).toBe("purple");
    });

    it("names each swatch, which is otherwise just a colour", () => {
      openDrawer();

      expect(
        queryAll(fixture, ".theme-option").map((button) =>
          button.getAttribute("aria-label"),
        ),
      ).toEqual([
        "Emerald Felt",
        "Deep Ocean",
        "Midnight Charcoal",
        "Royal Velvet",
      ]);
    });
  });

  it("opens the rules and closes itself out of the way", () => {
    openDrawer();
    const closed = onClose();

    clickElement(fixture, ".drawer-content .btn-secondary");

    expect(TestBed.inject(GameDocumentationService).isOpen()).toBe(true);
    expect(closed).toHaveBeenCalledOnce();
  });
});
