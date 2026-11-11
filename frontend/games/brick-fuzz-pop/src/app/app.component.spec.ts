import { TestBed } from "@angular/core/testing";
import { FRAME_MS } from "@fz/core/testing";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { recordOf } from "@fz/core/records";
import { figure, figureValue, setPageVisibility } from "@fz/ui/testing";
import { render, screen, within } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { BRICK_KIND_IDS } from "../rules/catalog/bricks";
import type { Pictures } from "../scene/pictures";
import {
  SPEC_POINTS,
  type SpecRound,
  STILL,
  playRoundOut,
  playUntilCard,
  provideSpecPlay,
  release,
  scriptedRounds,
} from "../testing/play";
import { AppComponent } from "./app.component";
import { DebugService } from "./debug/debug.service";
import { GameService } from "./play/game.service";

/** What a spec gets back from rendering the app. */
interface RenderedApp {
  readonly game: GameService;
  readonly user: UserEvent;
  /** Waits for the page to show what the game now holds. */
  readonly settle: () => Promise<void>;
}

/** Renders the app over the specs' levels, its rounds played as a script says. */
async function renderApp(
  ...script: readonly SpecRound[]
): Promise<RenderedApp> {
  const { fixture } = await render(AppComponent, {
    providers: [
      ...provideSpecPlay(scriptedRounds(...script)),
      { provide: DEBUG_MENU, useValue: false },
    ],
  });
  return {
    game: TestBed.inject(GameService),
    user: userEvent.setup(),
    settle: () => fixture.whenStable(),
  };
}

/** Renders the app with its first run ended, its result card open. */
async function endedApp(...script: readonly SpecRound[]): Promise<RenderedApp> {
  const app = await renderApp(...script);
  playUntilCard(app.game);
  await app.settle();
  return app;
}

/** Returns one of the bar's buttons by its name. */
function barButton(name: string): HTMLElement {
  return within(screen.getByRole("banner")).getByRole("button", { name });
}

describe("AppComponent", () => {
  it("names the game in the page's one heading", async () => {
    await renderApp();

    expect(
      screen.getByRole("heading", { level: 1, name: "Brick Fuzz Pop" }),
    ).toBeInTheDocument();
  });

  it("keeps the board's place in the page's main landmark", async () => {
    await renderApp();

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  describe("the bar", () => {
    it("shows the run's figures", async () => {
      const { game, settle } = await renderApp("freed");
      playRoundOut(game);

      await settle();

      expect({
        level: figure("Level"),
        rounds:
          within(figureValue("Rounds")).queryByText(
            `1 round, par ${String(game.par())}`,
          ) !== null,
        rowsLeft: figure("Rows left"),
        score: figure("Score"),
        crew: figure("Crew"),
      }).toEqual({
        level: "1",
        rounds: true,
        rowsLeft: String(game.rowsLeft()),
        score: String(SPEC_POINTS.freed),
        crew: "2 fuzzballs",
      });
    });

    it("pauses the level in play", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      await settle();

      await user.click(barButton("Pause"));

      expect(game.outcome()).toBe("paused");
    });

    it("goes on with a paused level", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      game.pause();
      await settle();

      await user.click(barButton("Resume"));

      expect(game.outcome()).toBe("playing");
    });

    it("plays the flight in the air fast", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      await settle();

      await user.click(barButton("Fast-forward"));

      expect(game.fast()).toBe(true);
    });

    it("stops playing the flight in the air fast", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      game.fastForward(true);
      await settle();

      await user.click(barButton("Fast-forward"));

      expect(game.fast()).toBe(false);
    });

    it("shows a flight in the air playing fast", async () => {
      const { game, settle } = await renderApp("step");
      release(game);
      game.fastForward(true);

      await settle();

      expect(barButton("Fast-forward")).toHaveAttribute("aria-pressed", "true");
    });

    it("offers Fast-forward and Skip while a flight is in the air", async () => {
      const { game, settle } = await renderApp("step");
      release(game);

      await settle();

      expect(
        [barButton("Fast-forward"), barButton("Skip")].map((button) =>
          button.getAttribute("aria-disabled"),
        ),
      ).toEqual([null, null]);
    });

    it("skips the flight in the air", async () => {
      const { game, user, settle } = await renderApp("step");
      release(game);
      await settle();

      await user.click(barButton("Skip"));
      game.tick(FRAME_MS, STILL);

      expect(game.flying()).toBe(false);
    });

    it("turns the sound off", async () => {
      const { game, user } = await renderApp();

      await user.click(barButton("Sound"));

      expect(game.soundOn()).toBe(false);
    });

    it("shows the sound off", async () => {
      const { game, settle } = await renderApp();
      game.toggleSound();

      await settle();

      expect(barButton("Sound")).toHaveAttribute("aria-pressed", "false");
    });

    it("starts a new game, asking first with a run in progress", async () => {
      const { game, user, settle } = await renderApp("step");
      playRoundOut(game);
      await settle();

      await user.click(barButton("New game"));

      expect(
        screen.getByRole("alertdialog", { name: "Start a new game?" }),
      ).toBeVisible();
    });

    it("opens How to play", async () => {
      const { user } = await renderApp();

      await user.click(barButton("How to play"));

      expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    });

    it("closes How to play at Escape", async () => {
      const { user } = await renderApp();
      await user.click(barButton("How to play"));

      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("dialog", { name: "How to play" }),
      ).not.toBeInTheDocument();
    });

    it("opens the settings", async () => {
      const { user } = await renderApp();

      await user.click(barButton("Settings"));

      expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
    });

    it("closes the settings at Escape", async () => {
      const { user } = await renderApp();
      await user.click(barButton("Settings"));

      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("dialog", { name: "Settings" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("the room", () => {
    it("pauses the level in play as the page goes out of sight", async () => {
      const { game } = await renderApp("step");
      release(game);

      setPageVisibility("hidden");

      expect(game.outcome()).toBe("paused");
    });

    it("says so in the page's live region", async () => {
      const { game } = await renderApp("step");
      release(game);

      setPageVisibility("hidden");

      expect(
        await screen.findByText(
          `Paused, with a score of ${String(SPEC_POINTS.step)}. Press Enter to go on.`,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("the Levels dialog", () => {
    it("opens from the bar", async () => {
      const { user } = await renderApp();

      await user.click(barButton("Levels"));

      expect(screen.getByRole("dialog", { name: "Levels" })).toBeVisible();
    });

    it("closes at its Close", async () => {
      const { user } = await renderApp();
      await user.click(barButton("Levels"));

      await user.click(screen.getByRole("button", { name: "Close levels" }));

      expect(
        screen.queryByRole("dialog", { name: "Levels" }),
      ).not.toBeInTheDocument();
    });

    it("marks the level in play", async () => {
      const { game, user } = await renderApp();
      TestBed.inject(DebugService).openEveryLevel(true);
      await game.startAt(2);

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", { name: /^2 Stripes/ }),
      ).toHaveAttribute("aria-current", "true");
    });

    it("starts a run at the level chosen and closes", async () => {
      const { game, user, settle } = await renderApp();
      TestBed.inject(DebugService).openEveryLevel(true);
      await user.click(barButton("Levels"));

      await user.click(screen.getByRole("button", { name: /^2 Stripes/ }));
      await settle();

      expect({
        level: game.run().level,
        open: screen.queryByRole("dialog", { name: "Levels" }),
      }).toEqual({ level: 2, open: null });
    });

    it("stays open as the player keeps the run in progress", async () => {
      const { game, user, settle } = await renderApp("step");
      playRoundOut(game);
      await settle();
      await user.click(barButton("Levels"));
      await user.click(screen.getByRole("button", { name: /^1 Hello, wall/ }));

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      await settle();

      expect({
        rounds: game.rounds(),
        open: screen.queryByRole("dialog", { name: "Levels" }) !== null,
      }).toEqual({ rounds: 1, open: true });
    });

    it("offers every level while the debug menu opens them", async () => {
      const { user } = await renderApp();
      TestBed.inject(DebugService).openEveryLevel(true);

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", { name: /^3 Pips/ }),
      ).not.toHaveAttribute("aria-disabled");
    });

    it("keeps each level's stars while the debug menu opens every level", async () => {
      const { game, user, settle } = await renderApp("cleared");
      playUntilCard(game);
      TestBed.inject(DebugService).openEveryLevel(true);
      await settle();

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", { name: /^1 Hello, wall 3 of 3 stars/ }),
      ).toBeInTheDocument();
    });

    it("keeps a level locked until the one before it is cleared", async () => {
      const { user } = await renderApp();

      await user.click(barButton("Levels"));

      expect(
        screen.getByRole("button", { name: /^2 Stripes/ }),
      ).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("How to play", () => {
    it("asks the scene for no picture while it is shut", async () => {
      const { game, settle } = await renderApp();
      const pictures = vi.fn<() => Pictures>();
      game.onPictures(pictures);

      await settle();

      expect(pictures).not.toHaveBeenCalled();
    });

    it("shows the pictures the scene drew as it opens", async () => {
      const { game, user } = await renderApp();
      game.onPictures(() => ({
        bricks: recordOf(BRICK_KIND_IDS, () => "data:image/png;base64,AAAA"),
      }));

      await user.click(barButton("How to play"));

      expect(
        within(screen.getByRole("dialog", { name: "How to play" }))
          .getAllByRole("presentation")
          .some(
            (img) => img.getAttribute("src") === "data:image/png;base64,AAAA",
          ),
      ).toBe(true);
    });
  });

  describe("an ended run", () => {
    it("shows its result over the board", async () => {
      await endedApp("lost");

      expect(
        screen.getByRole("alertdialog", { name: "Game over" }),
      ).toBeVisible();
    });

    it("shows the run's score against the best, saying it is a new one", async () => {
      await endedApp("jump", "lost");
      const result = screen.getByRole("alertdialog", { name: "Game over" });

      expect({
        best: figure("Best", result),
        newBest: within(result).queryByText("New best") !== null,
      }).toEqual({ best: String(SPEC_POINTS.jump), newBest: true });
    });

    it("tries the lost level again from its result", async () => {
      const { game, user } = await endedApp("lost");

      await user.click(
        screen.getByRole("button", { name: "Try again from level 1" }),
      );

      expect([game.outcome(), game.rounds()]).toEqual(["ready", 0]);
    });

    it("closes its result, keeping it in the page, as the lost level is tried again", async () => {
      const { user } = await endedApp("lost");

      await user.click(
        screen.getByRole("button", { name: "Try again from level 1" }),
      );

      // A closed dialog is hidden, which leaves it no accessible name.
      expect(
        screen
          .getAllByRole("alertdialog", { hidden: true })
          .map((dialog) => [
            dialog.getAttribute("aria-label"),
            dialog.hasAttribute("open"),
          ]),
      ).toContainEqual(["Game over", false]);
    });

    it("starts a new game from a won run's result", async () => {
      const { game, user, settle } = await renderApp("cleared");
      playUntilCard(game);
      game.nextLevel();
      playUntilCard(game);
      game.nextLevel();
      playUntilCard(game);
      await settle();

      await user.click(
        within(
          screen.getByRole("alertdialog", { name: "Every level cleared!" }),
        ).getByRole("button", { name: "New game" }),
      );

      expect([game.outcome(), game.run().level]).toEqual(["ready", 1]);
    });

    it("opens the Levels dialog from its result, which goes away", async () => {
      const { game, user } = await endedApp("lost");

      await user.click(screen.getByRole("button", { name: "Choose a level" }));

      expect({
        levels: screen.queryByRole("dialog", { name: "Levels" }) !== null,
        resultClosed: game.resultClosed(),
      }).toEqual({ levels: true, resultClosed: true });
    });

    it("puts its result away as it closes, leaving the board to look at", async () => {
      const { game, user } = await endedApp("lost");

      await user.click(screen.getByRole("button", { name: "Close" }));

      expect({
        resultClosed: game.resultClosed(),
        shown: screen.queryByRole("alertdialog", { name: "Game over" }),
      }).toEqual({ resultClosed: true, shown: null });
    });
  });
});
