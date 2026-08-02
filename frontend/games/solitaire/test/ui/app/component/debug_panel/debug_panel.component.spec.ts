// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { DebugPanelComponent } from "@/ui/app/component/debug_panel/debug_panel.component";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import { query, queryAll, queryText } from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";

describe("DebugPanelComponent", () => {
  let fixture: ComponentFixture<DebugPanelComponent>;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(DebugPanelComponent);

    fixture = TestBed.createComponent(DebugPanelComponent);
    fixture.detectChanges();
  });

  /** The panel's choice buttons. */
  function choices(): HTMLElement[] {
    return queryAll(fixture, ".segment-btn");
  }

  it("renders the debug panel", () => {
    expect(query(fixture, ".debug-panel")).not.toBeNull();
  });

  it("labels the panel as a group, rather than with a stray <label>", () => {
    const panel = query(fixture, ".debug-panel");

    expect(panel?.getAttribute("role")).toBe("group");
    expect(queryText(fixture, ".debug-label")).toContain("Debug Options");
  });

  it("shows only debug rules, not the ones a player picks", () => {
    expect(choices().map((button) => button.textContent?.trim())).toEqual([
      "Normal",
      "Almost Win",
    ]);
  });

  it("turns almost-win on when its button is clicked", async () => {
    choices()[1].click();
    await flushMicrotasks();

    expect(harness.catalog.setOption).toHaveBeenCalledWith("almostWin", 1);
  });

  it("marks the chosen mode as checked", () => {
    expect(choices()[0].getAttribute("aria-checked")).toBe("true");
  });
});
