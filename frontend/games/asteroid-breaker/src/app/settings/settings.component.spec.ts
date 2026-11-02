import { TestBed } from "@angular/core/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { provideSpecWaves } from "../../testing/play";
import { TUNED, tuningLines } from "../../view/debug_tuning";
import { GameService } from "../play/game.service";
import { DEBUG_MENU } from "../tokens";
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

/** Moves a slider to a value, as a finger or the arrow keys would. */
function slide(name: string, value: number): void {
  fireEvent.input(screen.getByRole("slider", { name }), {
    target: { value: String(value) },
  });
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

  it("offers no debug menu in a build for players", async () => {
    await renderSettings();

    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  // user-event's setup() puts a clipboard of its own on the page.
  describe("the debug menu", () => {
    it("starts each slider at tuning.ts's number, saying it in its unit", async () => {
      await renderSettings({ debugMenu: true });

      const thrust = screen.getByRole("slider", { name: "Thrust" });
      expect(thrust).toHaveValue(String(TUNED.thrust));
      expect(thrust).toHaveAttribute("aria-valuetext", "24 u/s²");
    });

    it("tunes the field in play as a slider moves", async () => {
      const { game } = await renderSettings({ debugMenu: true });

      slide("Rocks' speed", 1.5);

      expect(game.tuning().rockSpeed).toBe(1.5);
      expect(
        screen.getByRole("slider", { name: "Rocks' speed" }),
      ).toHaveAttribute("aria-valuetext", "×1.50");
    });

    it("lets shots leave without the ship's speed at its checkbox", async () => {
      const { user, game } = await renderSettings({ debugMenu: true });

      await user.click(
        screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
      );

      expect(game.tuning().carryShip).toBe(false);
    });

    it("puts every number back to tuning.ts's at Reset the numbers", async () => {
      const { user, game } = await renderSettings({ debugMenu: true });
      slide("Thrust", 40);
      slide("A shot every", 90);

      await user.click(
        screen.getByRole("button", { name: "Reset the numbers" }),
      );

      expect(game.tuning()).toEqual(TUNED);
    });

    it("puts the numbers on the clipboard as tuning.ts's lines at Copy the numbers, and says so", async () => {
      const { user, game } = await renderSettings({ debugMenu: true });
      slide("Top speed", 18);

      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      expect(await navigator.clipboard.readText()).toBe(
        tuningLines(game.tuning()),
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Copied the numbers.",
      );
    });

    it("says nothing of the last copy once a number moves, as the clipboard holds the old ones", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      slide("Thrust", 30);

      expect(screen.getByRole("status")).toHaveTextContent(/^$/);
    });

    it("says nothing of the last copy once the shots' switch changes", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      await user.click(
        screen.getByRole("checkbox", { name: "Shots carry the ship's speed" }),
      );

      expect(screen.getByRole("status")).toHaveTextContent(/^$/);
    });

    it("says nothing of the last copy once the numbers are reset", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      slide("Thrust", 30);
      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      await user.click(
        screen.getByRole("button", { name: "Reset the numbers" }),
      );

      expect(screen.getByRole("status")).toHaveTextContent(/^$/);
    });

    it("shows the lines where the browser keeps the clipboard shut", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      Reflect.deleteProperty(navigator, "clipboard");

      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        "The browser kept the clipboard shut",
      );
      expect(screen.getByText(/^export const THRUST = 24;/)).toBeVisible();
    });

    it("shows the lines again at another Copy the browser keeps from the clipboard, once they are shut", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      Reflect.deleteProperty(navigator, "clipboard");
      const copy = screen.getByRole("button", { name: "Copy the numbers" });
      await user.click(copy);
      await user.click(
        screen.getByText("The lines of", { selector: "summary" }),
      );

      await user.click(copy);

      expect(screen.getByText(/^export const THRUST = 24;/)).toBeVisible();
    });

    it("keeps the lines shown where the clipboard was shut as a number moves, as they follow it", async () => {
      const { user } = await renderSettings({ debugMenu: true });
      Reflect.deleteProperty(navigator, "clipboard");
      await user.click(
        screen.getByRole("button", { name: "Copy the numbers" }),
      );

      slide("Thrust", 30);

      expect(screen.getByText(/^export const THRUST = 30;/)).toBeVisible();
    });
  });
});
