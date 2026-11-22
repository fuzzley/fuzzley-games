// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { DebugPanelComponent } from "@/ui/app/component/debug_panel/debug_panel.component";
import { packState } from "@fz/game-ui/bug_report";
import { DEBUG_MENU, DEV_BUILD } from "@fz/game-ui/debug_menu";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { POSITION_TAG } from "@/ui/app/model/game_position";
import { configureUiTestBed, type UiHarness } from "@test/support/ui/testbed";
import { within } from "@testing-library/dom";
import { query, queryAll, queryText, rootElement } from "@test/support/dom";
import { flushMicrotasks } from "@test/support/async";

describe("DebugPanelComponent", () => {
  let fixture: ComponentFixture<DebugPanelComponent>;
  let harness: UiHarness;

  beforeEach(async () => {
    harness = await configureUiTestBed(DebugPanelComponent);

    fixture = TestBed.createComponent(DebugPanelComponent);
    fixture.detectChanges();
  });

  /** Returns the panel's choice buttons. */
  function choices(): HTMLElement[] {
    return queryAll(fixture, ".segment");
  }

  it("renders the debug panel", () => {
    expect(query(fixture, ".debug-panel")).not.toBeNull();
  });

  it("labels the panel as a group, rather than with a stray <label>", () => {
    const panel = query(fixture, ".debug-panel");

    expect(panel?.getAttribute("role")).toBe("group");
    expect(queryText(fixture, ".debug-label")).toContain("Debug options");
  });

  it("shows only debug rules, not the ones a player picks", () => {
    expect(choices().map((button) => button.textContent.trim())).toEqual([
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

  describe("loading a bug report's game", () => {
    installCompressionStreams();

    /** Pastes text into the loader and presses Load. */
    function load(text: string): void {
      const panel = within(rootElement(fixture));
      const field = panel.getByRole("textbox", { name: "Load game state" });
      if (!(field instanceof HTMLTextAreaElement)) {
        throw new Error("The loader's field is no text area.");
      }
      field.value = text;
      panel.getByRole("button", { name: "Load" }).click();
    }

    /** Returns a report's game state for the mock game. */
    function reported(): Promise<string> {
      return packState(POSITION_TAG, {
        gameId: "klondike",
        options: { drawCount: 3, almostWin: 0 },
        snapshot: harness.model.snapshot(),
      });
    }

    it("says under the field that the report's rules become yours", () => {
      expect(
        within(rootElement(fixture)).getByText(
          "Your rules for the reported game change to match the report.",
        ),
      ).toBeTruthy();
    });

    it("puts the pasted game on the table", async () => {
      const text = await reported();

      load(text);

      await vi.waitFor(() => {
        expect(harness.model.restore).toHaveBeenCalledOnce();
      });
    });

    it("says when the game is loaded, so the drawer can close", async () => {
      const text = await reported();
      const loaded = vi.fn();
      fixture.componentInstance.loaded.subscribe(loaded);

      load(text);

      await vi.waitFor(() => {
        expect(loaded).toHaveBeenCalledOnce();
      });
    });

    it("says why pasted text could not be loaded", async () => {
      load("hello");

      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(
          within(rootElement(fixture)).getByRole("status").textContent,
        ).toBe("There is no game state in that text.");
      });
    });
  });
});

describe("DebugPanelComponent outside a development build", () => {
  let fixture: ComponentFixture<DebugPanelComponent>;

  beforeEach(async () => {
    await configureUiTestBed(DebugPanelComponent);
    TestBed.overrideProvider(DEV_BUILD, { useValue: false });
    TestBed.overrideProvider(DEBUG_MENU, { useValue: true });
    fixture = TestBed.createComponent(DebugPanelComponent);
    fixture.detectChanges();
  });

  it("offers no debug rule, which nothing would turn off again", () => {
    expect(queryAll(fixture, "app-option-group")).toEqual([]);
  });

  it("still loads a report's game, as on the site at ?debug", () => {
    expect(
      within(rootElement(fixture)).getByRole("textbox", {
        name: "Load game state",
      }),
    ).toBeTruthy();
  });
});
