// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { HeaderBarComponent } from "@/ui/app/component/header_bar/header_bar.component";
import { GameDocumentationService } from "@/ui/app/service/game_documentation.service";
import { ConfirmationService } from "@/ui/app/service/confirmation.service";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import { clickElement, queryRequired, queryText } from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";

describe("HeaderBarComponent", () => {
  let fixture: ComponentFixture<HeaderBarComponent>;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(HeaderBarComponent, {
      score: 120,
      moves: 10,
    });

    fixture = TestBed.createComponent(HeaderBarComponent);
    fixture.detectChanges();
  });

  /** The undo button, whichever state it is in. */
  function undoButton(): HTMLButtonElement {
    return queryRequired<HTMLButtonElement>(fixture, "button[title*='Undo']");
  }

  it("carries the document's one heading, so it is not headingless at rest", () => {
    expect(queryText(fixture, "h1")).toBe("fSolitaire");
  });

  describe("the metrics", () => {
    it("reports what the game currently reads", () => {
      expect([
        queryText(fixture, ".score-card .value"),
        queryText(fixture, ".moves-card .value"),
        queryText(fixture, ".timer-card .value"),
      ]).toEqual(["120", "10", "00:00"]);
    });

    it("follows the game as it changes", () => {
      harness.model.state.score$.next(350);
      harness.model.state.moves$.next(25);
      fixture.detectChanges();

      expect([
        queryText(fixture, ".score-card .value"),
        queryText(fixture, ".moves-card .value"),
      ]).toEqual(["350", "25"]);
    });
  });

  describe("undo", () => {
    it("is disabled with nothing to take back", () => {
      expect(undoButton().disabled).toBe(true);
    });

    it("is enabled once the game has history", () => {
      harness.model.state.undoDepth$.next(1);
      fixture.detectChanges();

      expect(undoButton().disabled).toBe(false);
    });

    it("takes the move back on the game when clicked", () => {
      harness.model.state.undoDepth$.next(1);
      fixture.detectChanges();

      undoButton().click();

      expect(harness.model.undo).toHaveBeenCalledOnce();
    });
  });

  describe("the lifecycle actions", () => {
    // This fixture has ten moves on the board, so both of these are
    // destructive and ask before going ahead.

    it("asks before restarting, rather than throwing the game away", async () => {
      clickElement(fixture, "button[title*='Restart']");
      await flushMicrotasks();

      expect(TestBed.inject(ConfirmationService).isOpen()).toBe(true);
      expect(harness.model.restartGame).not.toHaveBeenCalled();
    });

    it("restarts once that prompt is accepted", async () => {
      clickElement(fixture, "button[title*='Restart']");
      await flushMicrotasks();

      TestBed.inject(ConfirmationService).accept();
      await flushMicrotasks();

      expect(harness.model.restartGame).toHaveBeenCalledOnce();
    });

    it("deals a new game once its prompt is accepted", async () => {
      clickElement(fixture, "button[title*='New Game']");
      await flushMicrotasks();

      TestBed.inject(ConfirmationService).accept();
      await flushMicrotasks();

      expect(harness.model.startNewGame).toHaveBeenCalledOnce();
    });

    it("opens the rules", () => {
      clickElement(fixture, "button[title*='How to Play']");

      expect(TestBed.inject(GameDocumentationService).isOpen()).toBe(true);
    });

    it("asks the shell to open settings", () => {
      const openSettings = vi.fn();
      fixture.componentInstance.openSettings.subscribe(openSettings);

      clickElement(fixture, ".btn-settings");

      expect(openSettings).toHaveBeenCalledOnce();
    });
  });
});
