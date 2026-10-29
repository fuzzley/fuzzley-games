import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { playOn } from "../../testing/game";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BarComponent } from "./bar.component";

/** What a spec gets back from rendering the bar. */
interface RenderedBar {
  readonly user: UserEvent;
  readonly openHelp: ReturnType<typeof vi.fn>;
  readonly openSettings: ReturnType<typeof vi.fn>;
}

/** Renders the bar over a Hard game 2:13 in, and listens to what it asks for. */
async function renderBar(): Promise<RenderedBar> {
  const openHelp = vi.fn();
  const openSettings = vi.fn();
  const { fixture } = await render(BarComponent, {
    on: { openHelp, openSettings },
  });
  playOn({ level: "hard", seconds: 133 });
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
  return value.textContent.trim();
}

/** Returns the badge that shows the level and offers the others. */
function levelBadge(): HTMLElement {
  return screen.getByRole("button", { name: "Level: Hard" });
}

/** Chooses a level from the badge's menu. */
async function chooseLevel(user: UserEvent, name: string): Promise<void> {
  await user.click(levelBadge());
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
        screen.getByRole("heading", { level: 1, name: "Sudoku" }),
      ).toBeInTheDocument();
    });

    it("shows the level of the game on the board", async () => {
      await renderBar();

      expect(levelBadge()).toHaveTextContent("Hard");
    });

    it("offers the levels from the badge, the board's checked", async () => {
      const { user } = await renderBar();

      await user.click(levelBadge());

      expect(
        screen.getByRole("menuitemradio", { checked: true }),
      ).toHaveAccessibleName(/^Hard/);
    });

    it("names the level chosen before it loses the game under way", async () => {
      const { user } = await renderBar();

      await chooseLevel(user, "Medium");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Medium game?",
      );
    });

    it("keeps the game at its level when the player backs out", async () => {
      const { user } = await renderBar();
      await chooseLevel(user, "Medium");

      TestBed.inject(ConfirmService).cancel();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(TestBed.inject(GameService).level()).toBe("hard");
    });

    it("deals at the level chosen, and keeps it, when the player goes ahead", async () => {
      const { user } = await renderBar();
      await chooseLevel(user, "Medium");

      TestBed.inject(ConfirmService).accept();

      expect(
        await screen.findByRole("button", { name: "Level: Medium" }),
      ).toBeInTheDocument();
      expect(TestBed.inject(SettingsService).settings().level).toBe("medium");
    });

    it("shows the time", async () => {
      await renderBar();

      expect(figure("Time")).toBe("2:13");
    });

    it("fills in the notes", async () => {
      const { user } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Fill in notes" }));

      expect(TestBed.inject(GameService).grid().history).toHaveLength(1);
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
      const menu = await screen.findByRole("menu", { name: "More actions" });
      return within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent.trim());
    }

    it("keeps the heading for a screen reader", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Sudoku" }),
      ).toHaveClass("fz-visually-hidden");
    });

    it("keeps the level in the bar, out of the menu", async () => {
      await renderBar();

      expect(levelBadge()).toBeVisible();
    });

    it("moves Fill in notes, Restart, How to play and Settings into the menu", async () => {
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items).toEqual([
        "Fill in notes",
        "Restart",
        "How to play",
        "Settings",
      ]);
    });

    it("fills in the notes from the menu", async () => {
      const { user } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Fill in notes" }));

      expect(TestBed.inject(GameService).grid().history).toHaveLength(1);
    });

    it("restarts from the menu, asking first", async () => {
      const { user } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Restart" }));

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("asks for How to play from the menu", async () => {
      const { user, openHelp } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "How to play" }));

      expect(openHelp).toHaveBeenCalledOnce();
    });

    it("asks for the settings from the menu", async () => {
      const { user, openSettings } = await renderBar();
      await openMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Settings" }));

      expect(openSettings).toHaveBeenCalledOnce();
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      viewport?.setSize(340, 700);
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });

    it("moves the link home into the menu on a rail too short for it", async () => {
      viewport?.setSize(568, 320);
      const { user } = await renderBar();

      const items = await openMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });
  });
});
