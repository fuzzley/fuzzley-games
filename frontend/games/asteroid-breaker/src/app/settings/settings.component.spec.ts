import { TestBed } from "@angular/core/testing";
import { FRAME_MS } from "@fz/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { ConfirmService } from "@fz/ui/confirm";
import { fireEvent, render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { provideSpecWaves, shoot } from "../../testing/play";
import { TUNED, tuningLines } from "../../view/debug_tuning";
import { GameService } from "../play/game.service";
import { TUNING } from "../tokens";
import { SettingsComponent } from "./settings.component";
import { SettingsService } from "./settings.service";

/** What a spec gets back from rendering the settings. */
interface RenderedSettings {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly store: SettingsService;
  readonly closed: ReturnType<typeof vi.fn>;
}

/** Renders the settings, open, over the specs' waves, with the debug menu or without it. */
async function renderSettings({
  debugMenu = false,
} = {}): Promise<RenderedSettings> {
  const closed = vi.fn();
  await render(SettingsComponent, {
    inputs: { open: true },
    on: { closed },
    providers: [
      ...provideSpecWaves(),
      { provide: DEBUG_MENU, useValue: debugMenu },
    ],
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    store: TestBed.inject(SettingsService),
    closed,
  };
}

describe("SettingsComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(SettingsComponent, {
      inputs: { open: false },
      providers: provideSpecWaves(),
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks to close at its close button", async () => {
    const { user, closed } = await renderSettings();

    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(closed).toHaveBeenCalledOnce();
  });

  describe("the speed", () => {
    it("shows the speed in use as chosen", async () => {
      await renderSettings();

      expect(screen.getByRole("radio", { name: /^Normal/ })).toBeChecked();
    });

    it("starts a run at the speed chosen", async () => {
      const { user, game } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Fast/ }));

      expect(game.speed()).toBe("fast");
      expect(screen.getByRole("radio", { name: /^Fast/ })).toBeChecked();
    });

    it("asks before a new speed throws away the run under way", async () => {
      const { user, game } = await renderSettings();
      game.tick(FRAME_MS, shoot(game));

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
  });

  describe("the deck", () => {
    it("shows on a touch screen until another time is chosen", async () => {
      await renderSettings();

      expect(
        screen.getByRole("radio", { name: /^On a touch screen/ }),
      ).toBeChecked();
    });

    it("shows as chosen", async () => {
      const { user, store } = await renderSettings();

      await user.click(screen.getByRole("radio", { name: /^Always/ }));

      expect(store.settings().deck).toBe("always");
      expect(screen.getByRole("radio", { name: /^Always/ })).toBeChecked();
    });
  });

  it("puts the stick on the right at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(
      screen.getByRole("checkbox", { name: "Stick on the right" }),
    );

    expect(store.settings().stickOnRight).toBe(true);
  });

  it("has the ship fire by itself at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Fire by itself" }));

    expect(store.settings().fireByItself).toBe(true);
  });

  it("buzzes the phone until told otherwise", async () => {
    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: "Buzz the phone" }),
    ).toBeChecked();
  });

  it("turns the haptics off at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Buzz the phone" }));

    expect(store.settings().haptics).toBe(false);
  });

  it("plays sounds until told otherwise", async () => {
    await renderSettings();

    expect(screen.getByRole("checkbox", { name: "Play sounds" })).toBeChecked();
  });

  it("turns the sound off at its checkbox", async () => {
    const { user, store } = await renderSettings();

    await user.click(screen.getByRole("checkbox", { name: "Play sounds" }));

    expect(store.settings().sound).toBe(false);
  });

  it("offers the palettes", async () => {
    await renderSettings();

    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Midnight blue/ })).toBeVisible();
  });

  it("offers the debug menu in the drawer where DEBUG_MENU says so", async () => {
    await renderSettings({ debugMenu: true });

    expect(
      within(screen.getByRole("dialog")).getByRole("region", { name: "Debug" }),
    ).toBeVisible();
  });

  it("offers no debug menu in a build for players", async () => {
    await renderSettings();

    expect(
      screen.queryByRole("region", { name: "Debug" }),
    ).not.toBeInTheDocument();
  });

  // user-event's setup() puts a clipboard of its own on the page.
  describe("the debug menu", () => {
    /** Moves a slider to a value, as a finger or the arrow keys would. */
    function slide(name: string, value: number): void {
      fireEvent.input(screen.getByRole("slider", { name }), {
        target: { value: String(value) },
      });
    }

    it("starts each slider at tuning.ts's number, saying it in its unit", async () => {
      await renderSettings({ debugMenu: true });

      const thrust = screen.getByRole("slider", { name: "Thrust" });
      expect(thrust).toHaveValue(String(TUNED.thrust));
      expect(thrust).toHaveAttribute("aria-valuetext", "24 u/s²");
    });

    it("tunes the numbers as a slider moves", async () => {
      await renderSettings({ debugMenu: true });

      slide("Rocks' speed", 1.5);

      expect(TestBed.inject(TUNING).tuning().rockSpeed).toBe(1.5);
      expect(
        screen.getByRole("slider", { name: "Rocks' speed" }),
      ).toHaveAttribute("aria-valuetext", "×1.50");
    });

    it("lets shots leave without the ship's speed at its checkbox", async () => {
      const { user } = await renderSettings({ debugMenu: true });

      await user.click(
        screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
      );

      expect(TestBed.inject(TUNING).tuning().carryShip).toBe(false);
    });

    it("ticks the shots' box again at Reset the numbers", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      const carry = screen.getByRole("checkbox", {
        name: "Shots carry the ship's speed",
      });
      await user.click(carry);

      await user.click(
        screen.getByRole("button", { name: "Reset the numbers" }),
      );

      expect(carry).toBeChecked();
    });

    it("puts every number back to tuning.ts's at Reset the numbers", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      slide("Thrust", 40);
      await user.click(
        screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
      );

      await user.click(
        screen.getByRole("button", { name: "Reset the numbers" }),
      );

      expect(TestBed.inject(TUNING).tuning()).toEqual(TUNED);
    });

    it("copies the numbers as the lines of tuning.ts they would replace", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      slide("Top speed", 18);

      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      expect(await navigator.clipboard.readText()).toBe(
        tuningLines({ ...TUNED, topSpeed: 18 }),
      );
    });
  });
});
