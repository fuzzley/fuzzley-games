import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { PRESETS } from "../../rules/difficulty";
import { playOn } from "../../testing/game";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BarComponent } from "./bar.component";

const IN_PLAY = ["*..", "...", "..*"];

/** What a spec gets back from rendering the bar. */
interface RenderedBar {
  readonly user: UserEvent;
  readonly openHelp: ReturnType<typeof vi.fn>;
  readonly openSettings: ReturnType<typeof vi.fn>;
}

/** Renders the bar over a game in play, and listens to what it asks for. */
async function renderBar(): Promise<RenderedBar> {
  const openHelp = vi.fn();
  const openSettings = vi.fn();
  const { fixture } = await render(BarComponent, {
    on: { openHelp, openSettings },
  });
  playOn(IN_PLAY, { livesLeft: 2, seconds: 133, difficulty: "hard" });
  await fixture.whenStable();
  return { user: userEvent.setup(), openHelp, openSettings };
}

/** Returns the value a figure in the bar gives, by its term. */
function figure(term: string): string {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  const value = name?.nextElementSibling;
  if (!(value instanceof HTMLElement)) throw new Error(`No value for ${term}`);
  return value.textContent.replace(/\s+/g, " ").trim();
}

/** Returns the badge that shows the difficulty and offers the others. */
function difficultyBadge(): HTMLElement {
  return screen.getByRole("button", { name: "Difficulty: Hard" });
}

/** Chooses a difficulty from the badge's menu. */
async function chooseDifficulty(user: UserEvent, name: string): Promise<void> {
  await user.click(difficultyBadge());
  await user.click(
    screen.getByRole("menuitemradio", { name: new RegExp(`^${name}`) }),
  );
}

describe("BarComponent", () => {
  let viewport: FakeViewport | null = null;

  afterEach(() => {
    viewport?.restore();
    viewport = null;
  });

  describe("on a roomy screen", () => {
    it("names the page with one heading", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Minesweeper" }),
      ).toBeInTheDocument();
    });

    it("shows the difficulty of the game on the board", async () => {
      await renderBar();

      expect(difficultyBadge()).toHaveTextContent("Hard");
    });

    it("offers the difficulties from the badge, each with its field", async () => {
      const { user } = await renderBar();
      TestBed.inject(SettingsService).update({
        custom: { rows: 8, cols: 12, mines: 20 },
      });

      await user.click(difficultyBadge());

      expect(
        screen.getAllByRole("menuitemradio").map((item) => item.textContent),
      ).toEqual([
        expect.stringContaining("9 × 9, 10 mines"),
        expect.stringContaining("16 × 16, 40 mines"),
        expect.stringContaining("16 × 30, 99 mines"),
        expect.stringContaining("8 × 12, 20 mines"),
      ]);
    });

    it("checks the board's difficulty", async () => {
      const { user } = await renderBar();

      await user.click(difficultyBadge());

      expect(
        screen.getByRole("menuitemradio", { checked: true }),
      ).toHaveAccessibleName(/^Hard/);
    });

    it("names the difficulty chosen before it loses the game under way", async () => {
      const { user } = await renderBar();

      await chooseDifficulty(user, "Easy");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Easy game?",
      );
    });

    it("keeps the game when the player backs out", async () => {
      const { user } = await renderBar();
      await chooseDifficulty(user, "Easy");

      TestBed.inject(ConfirmService).cancel();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(TestBed.inject(GameService).difficulty()).toBe("hard");
    });

    it("deals a field of the difficulty chosen when the player goes ahead", async () => {
      const { user } = await renderBar();
      await chooseDifficulty(user, "Easy");

      TestBed.inject(ConfirmService).accept();

      expect(
        await screen.findByRole("button", { name: "Difficulty: Easy" }),
      ).toBeInTheDocument();
      expect(TestBed.inject(GameService).field().size).toEqual(
        PRESETS.easy.size,
      );
    });

    it("deals the custom field the settings keep", async () => {
      const custom = { rows: 8, cols: 12, mines: 20 };
      const { user } = await renderBar();
      TestBed.inject(SettingsService).update({ custom });
      await chooseDifficulty(user, "Custom");

      TestBed.inject(ConfirmService).accept();

      expect(
        await screen.findByRole("button", { name: "Difficulty: Custom" }),
      ).toBeInTheDocument();
      expect(TestBed.inject(GameService).field().size).toEqual(custom);
    });

    it("shows the mines left", async () => {
      await renderBar();

      expect(figure("Mines")).toBe("2");
    });

    it("says the lives left in words, beside the hearts", async () => {
      await renderBar();

      expect(figure("Lives")).toBe("2 of 3 lives");
    });

    it("shows the time", async () => {
      await renderBar();

      expect(figure("Time")).toBe("2:13");
    });

    it("turns Flag mode on and off, and says which", async () => {
      const { user } = await renderBar();
      const flagMode = screen.getByRole("button", { name: "Flag mode" });

      await user.click(flagMode);

      expect(flagMode).toHaveAttribute("aria-pressed", "true");
      expect(TestBed.inject(GameService).flagMode()).toBe(true);
    });

    it("asks before Restart loses the game under way", async () => {
      const { user } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Restart" }));

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("asks before New Game loses the game under way", async () => {
      const { user } = await renderBar();

      await user.click(screen.getByRole("button", { name: "New Game" }));

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("asks for How to play", async () => {
      const { user, openHelp } = await renderBar();

      await user.click(screen.getByRole("button", { name: "How to play" }));

      expect(openHelp).toHaveBeenCalledOnce();
    });

    it("asks for the settings", async () => {
      const { user, openSettings } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Settings" }));

      expect(openSettings).toHaveBeenCalledOnce();
    });
  });

  describe("on a phone", () => {
    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    /** Opens the overflow menu and returns its items' names. */
    async function openMenu(user: UserEvent): Promise<string[]> {
      await user.click(screen.getByRole("button", { name: "More actions" }));
      const menu = await screen.findByRole("menu");
      return within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent.trim());
    }

    it("leaves the difficulty out, for the figures' room", async () => {
      await renderBar();

      expect(
        screen.queryByRole("button", { name: /^Difficulty/ }),
      ).not.toBeInTheDocument();
    });

    it("keeps the heading for a screen reader", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Minesweeper" }),
      ).toHaveClass("fz-visually-hidden");
    });

    it("moves Restart, How to play and Settings into the menu", async () => {
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items).toEqual(["Restart", "How to play", "Settings"]);
    });

    it("asks for How to play from the menu", async () => {
      const { user, openHelp } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "How to play" }));

      expect(openHelp).toHaveBeenCalledOnce();
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      viewport?.setSize(340, 700);
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });
  });
});
