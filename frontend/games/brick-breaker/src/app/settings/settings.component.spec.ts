import type { Provider } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { MemoryStorage, provideMemoryStorage } from "@fz/ui/testing";
import { SPEC_LEVEL, provideSpecLevels } from "../../testing/play";
import { GameService } from "../play/game.service";
import { speedLines } from "./debug_tuning";
import { SettingsComponent } from "./settings.component";
import { SETTINGS_KEY, SettingsService } from "./settings.service";

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
});

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

/** Offers the debug menu whatever the build, so a spec of it holds in any. */
const DEBUG_MENU_OFFERED: Provider[] = [
  { provide: DEBUG_MENU, useValue: true },
];

/** Stores settings with the sound off, as a player's browser would keep them. */
function keepSoundOff(): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, sound: false }));
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

  describe("Custom's ball speed", () => {
    it("is not offered at another speed", async () => {
      await renderSettings();

      expect(
        screen.queryByRole("slider", { name: "Custom ball speed" }),
      ).not.toBeInTheDocument();
    });

    it("is offered at Normal's once a run starts at Custom", async () => {
      const { user } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Custom/ }));

      expect(
        screen.getByRole("slider", { name: "Custom ball speed" }),
      ).toHaveValue("100");
    });

    it("is at the percent the settings keep", async () => {
      storage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ version: 1, speed: "custom", customPercent: 150 }),
      );

      await renderSettings();

      expect(
        screen.getByRole("slider", { name: "Custom ball speed" }),
      ).toHaveValue("150");
    });

    it("is set as the slider says, and kept", async () => {
      const { game } = await renderSettings();
      await game.changeSpeed("custom");

      fireEvent.input(
        await screen.findByRole("slider", { name: "Custom ball speed" }),
        { target: { value: "150" } },
      );

      expect(TestBed.inject(SettingsService).settings().customPercent).toBe(
        150,
      );
    });

    it("says how fast it is, against Normal", async () => {
      const { game } = await renderSettings();
      await game.changeSpeed("custom");

      game.setCustomPercent(150);

      expect(
        await screen.findByRole("slider", { name: "Custom ball speed" }),
      ).toHaveAttribute("aria-valuetext", "150% of Normal");
    });

    it("shows how fast it is, against Normal", async () => {
      const { game } = await renderSettings();
      await game.changeSpeed("custom");

      game.setCustomPercent(150);

      expect(await screen.findByText("150% of Normal.")).toBeVisible();
    });

    it("is described without its value, which it reads out already", async () => {
      const { game } = await renderSettings();

      await game.changeSpeed("custom");

      expect(
        await screen.findByRole("slider", { name: "Custom ball speed" }),
      ).toHaveAccessibleDescription("The ball in play takes it at once.");
    });
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

  // user-event's setup() puts a clipboard of its own on the page.
  describe("where DEBUG_MENU offers the debug menu", () => {
    /** Moves the debug menu's slider to a scale, as a finger or the arrow keys would. */
    function slide(scale: number): void {
      fireEvent.input(screen.getByRole("slider", { name: "Ball speed" }), {
        target: { value: String(scale) },
      });
    }

    it("offers the ball's speed in the debug menu, at the speed's own", async () => {
      await renderSettings(DEBUG_MENU_OFFERED);

      expect(
        within(screen.getByRole("region", { name: "Debug" })).getByRole(
          "slider",
          { name: "Ball speed" },
        ),
      ).toHaveValue("1");
    });

    it("scales the ball's speed from ×0.5 to ×2, in steps of 0.05", async () => {
      await renderSettings(DEBUG_MENU_OFFERED);

      const slider = screen.getByRole("slider", { name: "Ball speed" });
      expect(
        ["min", "max", "step"].map((name) => slider.getAttribute(name)),
      ).toEqual(["0.5", "2", "0.05"]);
    });

    it("scales the ball's speed as the slider says", async () => {
      const { game } = await renderSettings(DEBUG_MENU_OFFERED);

      slide(1.5);

      expect(game.ballSpeedScale()).toBe(1.5);
    });

    it("names the scale it is at", async () => {
      const { game } = await renderSettings(DEBUG_MENU_OFFERED);

      game.setBallSpeedScale(1.5);

      expect(
        await screen.findByRole("slider", { name: "Ball speed" }),
      ).toHaveAttribute("aria-valuetext", "×1.50");
    });

    it("says what the scale comes to at the run's speed", async () => {
      const { game } = await renderSettings(DEBUG_MENU_OFFERED);

      game.setBallSpeedScale(1.5);

      expect(
        await screen.findByRole("slider", {
          name: "Ball speed",
          description:
            "At Normal, the ball serves at 37.5 and climbs to 56.3 units a second, before a level's pace and what a capsule does to it.",
        }),
      ).toBeInTheDocument();
    });

    it("says what the scale comes to at another speed, once a run starts at it", async () => {
      const { game } = await renderSettings(DEBUG_MENU_OFFERED);
      game.setBallSpeedScale(1.5);

      await game.changeSpeed("fast");

      expect(
        await screen.findByRole("slider", {
          name: "Ball speed",
          description:
            "At Fast, the ball serves at 45 and climbs to 67.5 units a second, before a level's pace and what a capsule does to it.",
        }),
      ).toBeInTheDocument();
    });

    it("says what the scale comes to at Custom, at the player's speed", async () => {
      const { game } = await renderSettings(DEBUG_MENU_OFFERED);
      game.setBallSpeedScale(1.5);
      await game.changeSpeed("custom");

      game.setCustomPercent(200);

      expect(
        await screen.findByRole("slider", {
          name: "Ball speed",
          description:
            "At Custom, the ball serves at 75 and climbs to 112.5 units a second, before a level's pace and what a capsule does to it.",
        }),
      ).toBeInTheDocument();
    });

    it("puts the ball's speed back to the speed's own at Reset the numbers", async () => {
      const { user, game } = await renderSettings(DEBUG_MENU_OFFERED);
      slide(1.5);

      await user.click(
        screen.getByRole("button", { name: "Reset the numbers" }),
      );

      expect(game.ballSpeedScale()).toBe(1);
    });

    it("copies the lines of speed.ts the scale would replace", async () => {
      const { user } = await renderSettings(DEBUG_MENU_OFFERED);
      slide(1.05);

      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      expect(await navigator.clipboard.readText()).toBe(speedLines(1.05));
    });
  });

  it("offers no debug menu where DEBUG_MENU says not to", async () => {
    await renderSettings([{ provide: DEBUG_MENU, useValue: false }]);

    expect(
      screen.queryByRole("region", { name: "Debug" }),
    ).not.toBeInTheDocument();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });
});
