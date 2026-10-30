import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { SPEC_LEVEL, provideSpecLevels } from "../../testing/play";
import { GameService } from "../play/game.service";
import { SettingsComponent } from "./settings.component";
import { SETTINGS_KEY, SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the settings, open, over the specs' levels. */
async function renderSettings(): Promise<RenderedSettings> {
  const closed = vi.fn();
  await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: provideSpecLevels(),
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

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });
});
