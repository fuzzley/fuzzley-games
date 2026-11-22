import { TestBed } from "@angular/core/testing";
import { packState } from "@fz/game-ui/bug_report";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import {
  SnakeBugReports,
  provideSnakeBugReports,
} from "../bug_report/snake_bug_reports";
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

  it("shows the speed in use as chosen", async () => {
    await renderSettings();

    expect(screen.getByRole("radio", { name: /^Normal/ })).toBeChecked();
  });

  it("starts a run at the speed chosen, which it keeps", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Fast/ }));

    expect(TestBed.inject(GameService).run().speed).toBe("fast");
    expect(settings().speed).toBe("fast");
  });

  it("asks before a new speed throws away the run under way", async () => {
    const { user } = await renderSettings();
    TestBed.inject(GameService).turn("up");

    await user.click(screen.getByRole("radio", { name: /^Slow/ }));

    expect(TestBed.inject(ConfirmService).prompt().title).toBe(
      "Start a new Slow game?",
    );
  });

  it("starts no run at the speed in use", async () => {
    const { user } = await renderSettings();
    const run = TestBed.inject(GameService).run();

    await user.click(screen.getByRole("radio", { name: /^Normal/ }));

    expect(TestBed.inject(GameService).run()).toBe(run);
  });

  it("makes the snake step rather than glide", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Step/ }));

    expect(settings().movement).toBe("step");
    expect(screen.getByRole("radio", { name: /^Step/ })).toBeChecked();
  });

  it("shows the arrows always, where the player asks", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Always/ }));

    expect(settings().arrows).toBe("always");
  });

  it("says the arrows show on a phone or a tablet by default", async () => {
    await renderSettings();

    expect(
      screen.getByRole("radio", { name: /^On a touch screen/ }),
    ).toHaveAccessibleName(/On a phone or a tablet./);
  });

  it("turns the sound off", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Play sounds" }));

    expect(settings().sound).toBe(false);
  });

  it("offers the palettes", async () => {
    await renderSettings();

    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Midnight blue/ })).toBeVisible();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  describe("a bug report", () => {
    installCompressionStreams();

    /** Has the game take bug reports, and offer its debug menu or not. */
    function takeReports(debugMenu: boolean): void {
      TestBed.configureTestingModule({
        providers: [
          provideSnakeBugReports(),
          { provide: DEBUG_MENU, useValue: debugMenu },
        ],
      });
    }

    it("is offered as the game takes reports", async () => {
      takeReports(false);

      await renderSettings();

      expect(
        screen.getByRole("button", { name: "Report a bug" }),
      ).toBeInTheDocument();
    });

    it("asks for a reported state to load where the game offers its debug menu", async () => {
      takeReports(true);

      await renderSettings();

      expect(
        screen.getByRole("textbox", { name: "Load game state" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/^Your settings change to the ones in the report\./),
      ).toBeInTheDocument();
    });

    it("asks for none where the game doesn't offer its debug menu", async () => {
      takeReports(false);

      await renderSettings();

      expect(
        screen.queryByRole("textbox", { name: "Load game state" }),
      ).not.toBeInTheDocument();
    });

    it("asks to close once a reported state is loaded", async () => {
      takeReports(true);
      const { user, closed } = await renderSettings();
      const state = TestBed.inject(SnakeBugReports).capture().value;

      await user.click(
        screen.getByRole("textbox", { name: "Load game state" }),
      );
      await user.paste(await packState("sn1", state));
      await user.click(screen.getByRole("button", { name: "Load" }));

      await vi.waitFor(() => {
        expect(closed).toHaveBeenCalledOnce();
      });
    });
  });
});
