import { TestBed } from "@angular/core/testing";
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

      expect(screen.getByText("Normal")).toBeInTheDocument();
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
