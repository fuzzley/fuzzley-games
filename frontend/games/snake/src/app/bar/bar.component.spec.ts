import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ConfirmService } from "@fz/ui/confirm";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BarComponent } from "./bar.component";

/** What a spec gets back from rendering the bar. */
interface RenderedBar {
  readonly user: UserEvent;
  readonly game: GameService;
  readonly openHelp: ReturnType<typeof vi.fn>;
  readonly openSettings: ReturnType<typeof vi.fn>;
  readonly handBack: ReturnType<typeof vi.fn>;
  readonly detectChanges: () => void;
}

/** Renders the bar, and listens to what it asks for. */
async function renderBar(): Promise<RenderedBar> {
  const openHelp = vi.fn();
  const openSettings = vi.fn();
  const handBack = vi.fn();
  const { fixture } = await render(BarComponent, {
    on: { openHelp, openSettings, handBack },
  });
  return {
    user: userEvent.setup(),
    game: TestBed.inject(GameService),
    openHelp,
    openSettings,
    handBack,
    detectChanges: () => {
      fixture.detectChanges();
    },
  };
}

/** Returns the value a figure in the bar gives, by its term. */
function figure(term: string): string {
  const name = screen
    .getAllByRole("term")
    .find((dt) => dt.textContent.trim() === term);
  return name?.nextElementSibling?.textContent.trim() ?? "";
}

/** Returns the badge that shows the speed and offers the others. */
function speedBadge(): HTMLElement {
  return screen.getByRole("button", { name: "Speed: Normal" });
}

/** Chooses a speed from the badge's menu. */
async function chooseSpeed(user: UserEvent, name: string): Promise<void> {
  await user.click(speedBadge());
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
        screen.getByRole("heading", { level: 1, name: "Snake" }),
      ).toBeInTheDocument();
    });

    it("shows the speed of the run", async () => {
      await renderBar();

      expect(speedBadge()).toHaveTextContent("Normal");
    });

    it("offers the speeds from the badge, the run's checked", async () => {
      const { user } = await renderBar();

      await user.click(speedBadge());

      expect(
        screen.getAllByRole("menuitemradio").map((item) => ({
          name: item.querySelector(".name")?.textContent,
          checked: item.getAttribute("aria-checked"),
        })),
      ).toEqual([
        { name: "Slow", checked: "false" },
        { name: "Normal", checked: "true" },
        { name: "Fast", checked: "false" },
      ]);
    });

    it("starts a run at the speed chosen while none is under way", async () => {
      const { user, game } = await renderBar();

      await chooseSpeed(user, "Fast");

      expect(
        await screen.findByRole("button", { name: "Speed: Fast" }),
      ).toBeInTheDocument();
      expect(game.run().speed).toBe("fast");
      expect(TestBed.inject(SettingsService).settings().speed).toBe("fast");
    });

    it("names the speed chosen before it throws away the run under way", async () => {
      const { user, game, detectChanges } = await renderBar();
      game.turn("up");
      detectChanges();

      await chooseSpeed(user, "Slow");

      expect(TestBed.inject(ConfirmService).prompt().title).toBe(
        "Start a new Slow game?",
      );
    });

    it("keeps the run under way when the player backs out", async () => {
      const { user, game, detectChanges } = await renderBar();
      game.turn("up");
      detectChanges();
      await chooseSpeed(user, "Slow");

      TestBed.inject(ConfirmService).cancel();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(game.run().speed).toBe("normal");
    });

    it("shows the score and the best", async () => {
      await renderBar();

      expect([figure("Score"), figure("Best")]).toEqual(["0", "0"]);
    });

    it("pauses a run under way", async () => {
      const { user, game, detectChanges } = await renderBar();
      game.turn("up");
      detectChanges();

      await user.click(screen.getByRole("button", { name: "Pause" }));

      expect(game.outcome()).toBe("paused");
    });

    it("goes on with a paused run, handing the board the focus", async () => {
      const { user, game, handBack, detectChanges } = await renderBar();
      game.turn("up");
      game.pause();
      detectChanges();

      await user.click(screen.getByRole("button", { name: "Resume" }));

      expect(game.outcome()).toBe("playing");
      expect(handBack).toHaveBeenCalledOnce();
    });

    it("dims Pause while there is no run to pause", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("does nothing at a dimmed Pause", async () => {
      const { user, game } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Pause" }));

      expect(game.outcome()).toBe("ready");
    });

    it("keeps the focus where it was through a press on Pause", async () => {
      await renderBar();

      const kept = !fireEvent.pointerDown(
        screen.getByRole("button", { name: "Pause" }),
      );

      expect(kept).toBe(true);
    });

    it("shows the sound pressed while it is on", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Sound" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("turns the sound off, which the settings keep", async () => {
      const { user } = await renderBar();

      await user.click(screen.getByRole("button", { name: "Sound" }));

      expect(TestBed.inject(SettingsService).settings().sound).toBe(false);
    });

    it("starts a new game", async () => {
      const { user, game } = await renderBar();

      await user.click(screen.getByRole("button", { name: "New Game" }));

      expect(game.runs()).toBe(1);
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

  describe("on a compact screen", () => {
    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    /** Opens the overflow menu. */
    async function openMenu(user: UserEvent): Promise<void> {
      await user.click(screen.getByRole("button", { name: "More actions" }));
    }

    it("keeps the speed in the bar, out of the menu", async () => {
      await renderBar();

      expect(speedBadge()).toBeVisible();
    });

    it("keeps Pause and New Game in the bar", async () => {
      await renderBar();

      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
      expect(screen.getByRole("button", { name: "New Game" })).toBeVisible();
    });

    it("moves the sound, How to play and the settings into the menu", async () => {
      const { user } = await renderBar();

      await openMenu(user);

      expect(
        screen.getAllByRole("menuitem").map((item) => item.textContent.trim()),
      ).toEqual(["Turn sound off", "How to play", "Settings"]);
    });

    it("turns the sound off from the menu", async () => {
      const { user } = await renderBar();
      await openMenu(user);

      await user.click(
        screen.getByRole("menuitem", { name: "Turn sound off" }),
      );

      expect(TestBed.inject(SettingsService).settings().sound).toBe(false);
    });

    it("offers to turn the sound back on from the menu", async () => {
      const { user, detectChanges } = await renderBar();
      TestBed.inject(SettingsService).update({ sound: false });
      detectChanges();

      await openMenu(user);

      expect(
        screen.getByRole("menuitem", { name: "Turn sound on" }),
      ).toBeInTheDocument();
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
  });
});
