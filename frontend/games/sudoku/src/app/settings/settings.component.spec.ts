import { TestBed } from "@angular/core/testing";
import { BUG_REPORT_SOURCE, packState } from "@fz/game-ui/bug_report";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, waitFor } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { playOn } from "../../testing/game";
import { rowsOf, solvedBut, squareAt } from "../../testing/grid_picture";
import { REPORT_TAG } from "../bug_report/reported_game";
import { SudokuReports } from "../bug_report/sudoku_reports";
import { GameService } from "../play/game.service";
import { SettingsComponent } from "./settings.component";
import { type Settings, SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the settings, open. */
async function renderSettings(): Promise<RenderedSettings> {
  const closed = vi.fn();
  await render(SettingsComponent, { inputs: { open: true }, on: { closed } });
  return { user: userEvent.setup(), closed };
}

/** Returns the settings in use. */
function settings(): Settings {
  return TestBed.inject(SettingsService).settings();
}

describe("SettingsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(SettingsComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the level in use as chosen", async () => {
    await renderSettings();

    expect(screen.getByRole("radio", { name: /^Easy/ })).toBeChecked();
  });

  it("says what each level asks of the player", async () => {
    await renderSettings();

    expect(
      // A browser puts a space between the lines, which jsdom, without the
      // stylesheet, doesn't.
      screen.getByRole("radio", { name: /^Hard\s*Triples and X-Wings$/ }),
    ).toBeInTheDocument();
  });

  it("deals a puzzle at the level chosen", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Expert/ }));

    expect(settings().level).toBe("expert");
    expect(TestBed.inject(GameService).level()).toBe("expert");
  });

  it("asks before a level loses the game under way", async () => {
    const { user } = await renderSettings();
    playOn();

    await user.click(screen.getByRole("radio", { name: /^Medium/ }));

    expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    expect(settings().level).toBe("easy");
  });

  it("leaves the game alone when the level in use is chosen again", async () => {
    const { user } = await renderSettings();
    const game = playOn();

    await user.click(screen.getByRole("radio", { name: /^Easy/ }));

    expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
    expect(game.inProgress()).toBe(true);
  });

  it("shows the assists as they stand", async () => {
    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: "Mark mistakes" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Auto-clear notes" }),
    ).toBeChecked();
  });

  it("turns on marking mistakes, without a new game", async () => {
    const { user } = await renderSettings();
    const game = playOn();

    await user.click(screen.getByRole("checkbox", { name: "Mark mistakes" }));

    expect(settings().markMistakes).toBe(true);
    expect(game.inProgress()).toBe(true);
  });

  it("turns off removing notes", async () => {
    const { user } = await renderSettings();

    await user.click(
      screen.getByRole("checkbox", { name: "Auto-clear notes" }),
    );

    expect(settings().clearNotes).toBe(false);
  });

  it("describes each assist", async () => {
    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: "Mark mistakes" }),
    ).toHaveAccessibleDescription(
      "Marks any digit that doesn't match the solution, not only repeats.",
    );
  });

  it("asks to close from its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  describe("in a game that takes bug reports", () => {
    installCompressionStreams();

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: BUG_REPORT_SOURCE, useExisting: SudokuReports },
          { provide: DEBUG_MENU, useValue: true },
        ],
      });
    });

    it("offers Report a bug", async () => {
      await renderSettings();

      expect(
        screen.getByRole("button", { name: "Report a bug" }),
      ).toBeInTheDocument();
    });

    it("offers to load a reported game where the debug menu shows", async () => {
      await renderSettings();

      expect(
        screen.getByRole("textbox", { name: "Load game state" }),
      ).toBeInTheDocument();
    });

    it("offers no loader on the site without ?debug", async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: DEBUG_MENU, useValue: false }],
      });

      await renderSettings();

      expect(
        screen.queryByRole("textbox", { name: "Load game state" }),
      ).not.toBeInTheDocument();
    });

    it("loads a reported game, and closes to show it", async () => {
      const { user, closed } = await renderSettings();
      const game = playOn();
      game.select(squareAt("r1c1"));
      game.enter(6);
      const packed = await packState(
        REPORT_TAG,
        TestBed.inject(SudokuReports).capture().value,
      );
      // A puzzle already solved, which the load takes over without asking.
      playOn({ digits: solvedBut() });
      await user.click(
        screen.getByRole("textbox", { name: "Load game state" }),
      );
      await user.paste(packed);

      await user.click(screen.getByRole("button", { name: "Load" }));

      await waitFor(() => {
        expect(closed).toHaveBeenCalledOnce();
      });
      expect(rowsOf(game.grid().digits)[0]).toBe("6..5..2..");
    });
  });
});
