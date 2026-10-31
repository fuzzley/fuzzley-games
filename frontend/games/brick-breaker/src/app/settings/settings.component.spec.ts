import type { Provider } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { SPEC_LEVEL, provideSpecLevels } from "../../testing/play";
import { GameService } from "../play/game.service";
import { DEBUG_MENU } from "../tokens";
import { SettingsComponent } from "./settings.component";
import { SETTINGS_KEY, SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the settings, open, over the specs' levels and the providers given. */
async function renderSettings(
  providers: Provider[] = [],
): Promise<RenderedSettings> {
  const closed = vi.fn();
  await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: [...provideSpecLevels(), ...providers],
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    closed,
  };
}

/** Stores settings with the sound off, as a player's browser would keep them. */
function keepSoundOff(): void {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ version: 1, sound: false }),
  );
}

describe("SettingsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(SettingsComponent, {
      inputs: { open: false },
      providers: provideSpecLevels(),
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the speed in use as chosen", async () => {
    await renderSettings();

    expect(screen.getByRole("radio", { name: /^Normal/ })).toBeChecked();
  });

  it("starts a run at the speed chosen", async () => {
    const { user, game } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Fast/ }));

    expect(game.run().speed).toBe("fast");
    expect(screen.getByRole("radio", { name: /^Fast/ })).toBeChecked();
  });

  it("asks before a new speed throws away the level in play", async () => {
    const { user, game } = await renderSettings();
    await game.startAt(SPEC_LEVEL.steel);
    game.launch();

    await user.click(screen.getByRole("radio", { name: /^Relaxed/ }));

    expect(TestBed.inject(ConfirmService).prompt().title).toBe(
      "Start a new Relaxed game?",
    );
  });

  it("starts no run at the speed in use", async () => {
    const { user, game } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Normal/ }));

    expect(game.runs()).toBe(0);
  });

  it("steers by dragging by default", async () => {
    await renderSettings();

    expect(screen.getByRole("radio", { name: /^Drag/ })).toBeChecked();
  });

  it("has the paddle follow the finger, where the player asks", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("radio", { name: /^Follow the finger/ }));

    expect(TestBed.inject(SettingsService).settings().touch).toBe("follow");
    expect(
      screen.getByRole("radio", { name: /^Follow the finger/ }),
    ).toBeChecked();
  });

  it("turns the sound off", async () => {
    const { user } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Play sounds" }));

    expect(TestBed.inject(SettingsService).settings().sound).toBe(false);
  });

  it("shows the sound off where the settings keep it off", async () => {
    keepSoundOff();

    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: "Play sounds" }),
    ).not.toBeChecked();
  });

  it("turns the sound back on", async () => {
    keepSoundOff();
    const { user } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Play sounds" }));

    expect(TestBed.inject(SettingsService).settings().sound).toBe(true);
  });

  it("offers the palettes", async () => {
    await renderSettings();

    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Midnight blue/ })).toBeVisible();
  });

  describe("in a development build", () => {
    it("offers the ball's speed at the speed's own", async () => {
      await renderSettings();

      expect(
        screen.getByRole("slider", { name: "Ball speed (debug)" }),
      ).toHaveValue("1");
    });

    it("scales the ball's speed as the slider says", async () => {
      const { game } = await renderSettings();

      fireEvent.input(
        screen.getByRole("slider", { name: "Ball speed (debug)" }),
        { target: { value: "1.5" } },
      );

      expect(game.ballSpeedScale()).toBe(1.5);
    });

    it("names the scale it is at", async () => {
      const { game } = await renderSettings();

      game.setBallSpeedScale(1.5);

      expect(
        await screen.findByRole("slider", { name: "Ball speed (debug)" }),
      ).toHaveAttribute("aria-valuetext", "×1.50");
    });

    it("says what the scale comes to at the run's speed", async () => {
      const { game } = await renderSettings();

      game.setBallSpeedScale(1.5);

      expect(
        await screen.findByRole("slider", {
          description:
            "×1.50: at Normal, the ball serves at 37.5 and climbs to 56.3 units a second, before a level's pace and what a capsule does to it.",
        }),
      ).toBeInTheDocument();
    });

    it("says what the scale comes to at another speed, once a run starts at it", async () => {
      const { game } = await renderSettings();
      game.setBallSpeedScale(1.5);

      await game.changeSpeed("fast");

      expect(
        await screen.findByRole("slider", {
          description:
            "×1.50: at Fast, the ball serves at 45 and climbs to 67.5 units a second, before a level's pace and what a capsule does to it.",
        }),
      ).toBeInTheDocument();
    });
  });

  it("offers no ball's speed in a production build", async () => {
    await renderSettings([{ provide: DEBUG_MENU, useValue: false }]);

    expect(
      screen.queryByRole("slider", { name: "Ball speed (debug)" }),
    ).not.toBeInTheDocument();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });
});
