import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  type FakeViewport,
  barChoice,
  chooseInBar,
  installFakeViewport,
  openBarMenu,
} from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { figure } from "@fz/ui/testing";
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

describe("BarComponent", () => {
  describe("on a roomy screen", () => {
    it("names the page with one heading", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Sudoku" }),
      ).toBeInTheDocument();
    });

    it("shows the level of the game on the board", async () => {
      await renderBar();

      expect(barChoice("Level")).toHaveAccessibleName("Level: Hard");
    });

    it("offers the levels from the badge, the board's checked", async () => {
      const { user } = await renderBar();

      await user.click(barChoice("Level"));

      expect(
        screen.getByRole("menuitemradio", { checked: true }),
      ).toHaveAccessibleName(/^Hard/);
    });

    it("names the level chosen before it loses the game under way", async () => {
      const { user } = await renderBar();

      await chooseInBar(user, "Level", "Medium");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Medium game?",
      );
    });

    it("keeps the game at its level when the player backs out", async () => {
      const { user } = await renderBar();
      await chooseInBar(user, "Level", "Medium");

      TestBed.inject(ConfirmService).cancel();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(TestBed.inject(GameService).level()).toBe("hard");
    });

    it("deals at the level chosen, and keeps it, when the player goes ahead", async () => {
      const { user } = await renderBar();
      await chooseInBar(user, "Level", "Medium");

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

    it("asks before New game loses the game under way", async () => {
      const { user } = await renderBar();

      await user.click(screen.getByRole("button", { name: "New game" }));

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
    let viewport: FakeViewport;

    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    it("keeps the heading for a screen reader", async () => {
      await renderBar();

      expect(
        screen.getByRole("heading", { level: 1, name: "Sudoku" }),
      ).toHaveClass("fz-visually-hidden");
    });

    it("keeps the level in the bar, out of the menu", async () => {
      await renderBar();

      expect(barChoice("Level")).toBeVisible();
    });

    it("moves Fill in notes, Restart, How to play and Settings into the menu", async () => {
      const { user } = await renderBar();

      const items = await openBarMenu(user);

      expect(items).toEqual([
        "Fill in notes",
        "Restart",
        "How to play",
        "Settings",
      ]);
    });

    it("fills in the notes from the menu", async () => {
      const { user } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Fill in notes" }));

      expect(TestBed.inject(GameService).grid().history).toHaveLength(1);
    });

    it("restarts from the menu, asking first", async () => {
      const { user } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Restart" }));

      expect(TestBed.inject(ConfirmService).isOpen()).toBe(true);
    });

    it("asks for How to play from the menu", async () => {
      const { user, openHelp } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "How to play" }));

      expect(openHelp).toHaveBeenCalledOnce();
    });

    it("asks for the settings from the menu", async () => {
      const { user, openSettings } = await renderBar();
      await openBarMenu(user);

      await user.click(screen.getByRole("menuitem", { name: "Settings" }));

      expect(openSettings).toHaveBeenCalledOnce();
    });

    it("moves the link home into the menu where there is no room for it", async () => {
      viewport.setSize(340, 700);
      const { user } = await renderBar();

      const items = await openBarMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });

    it("moves the link home into the menu on a rail too short for it", async () => {
      viewport.setSize(568, 320);
      const { user } = await renderBar();

      const items = await openBarMenu(user);

      expect(items[0]).toBe("Fuzzley Games");
    });
  });
});
