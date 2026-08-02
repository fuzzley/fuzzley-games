// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { VictoryOverlayComponent } from "@/ui/app/component/victory_overlay/victory_overlay.component";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import { clickElement, queryText } from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";
import { clickBackdrop, isDialogOpen, pressEscape } from "@test/support/dialog";

describe("VictoryOverlayComponent", () => {
  let fixture: ComponentFixture<VictoryOverlayComponent>;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(VictoryOverlayComponent, {
      score: 500,
      moves: 45,
    });

    fixture = TestBed.createComponent(VictoryOverlayComponent);
    fixture.detectChanges();
  });

  /** Wins the game the way the engine reports it, and renders the result. */
  function win(): void {
    harness.model.emit("game-won");
    fixture.detectChanges();
  }

  it("stays closed while the game is still being played", () => {
    expect(isDialogOpen(fixture)).toBe(false);
  });

  it("opens once the game is won", () => {
    win();

    expect(isDialogOpen(fixture)).toBe(true);
  });

  it("reports the final score, time and moves", () => {
    win();

    const stat = (position: number) =>
      queryText(
        fixture,
        `.victory-stats .v-stat:nth-child(${position}) .v-val`,
      );
    expect([stat(1), stat(2), stat(3)]).toEqual(["500", "00:00", "45"]);
  });

  it("names each figure, so the numbers are not read out bare", () => {
    win();

    expect(
      queryText(fixture, ".victory-stats .v-stat:nth-child(1) .v-lbl"),
    ).toBe("Score");
  });

  it("deals a new game when Play Again is clicked", async () => {
    win();

    clickElement(fixture, ".btn-warning");
    await flushMicrotasks();

    expect(harness.model.startNewGame).toHaveBeenCalledOnce();
  });

  it("refuses to close on Escape, since a finished board has nothing behind it", () => {
    win();

    pressEscape();
    fixture.detectChanges();

    expect(isDialogOpen(fixture)).toBe(true);
  });

  it("refuses to close when the backdrop is clicked", () => {
    win();

    clickBackdrop(fixture);
    fixture.detectChanges();

    expect(isDialogOpen(fixture)).toBe(true);
  });
});
