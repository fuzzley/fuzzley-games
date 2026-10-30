import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { FIRST_LIVES } from "../rules/tuning";
import {
  FRAME_MS,
  SPEC_LEVEL,
  STILL,
  loseBall,
  provideSpecLevels,
} from "../testing/play";
import { AppComponent } from "./app.component";
import { GameService } from "./play/game.service";

/** Renders the game on a fake canvas, whose scene is drawn at once. */
async function renderApp(): Promise<GameService> {
  await render(AppComponent, {
    providers: [provideFakePhaserCanvas(), ...provideSpecLevels()],
  });
  return TestBed.inject(GameService);
}

/** Returns the game with its first level's ball served. */
async function launchedApp(): Promise<GameService> {
  const game = await renderApp();
  game.launch();
  return game;
}

/** Lets the board take the focus it was handed after the next render. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Says the page went out of sight, or came back. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("AppComponent", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState");
  });

  it("puts the board in the page's main landmark", async () => {
    await renderApp();

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("application", {
        name: "Brick Breaker, level 1: Blasts",
      }),
    );
  });

  it("names the game in the bar", async () => {
    await renderApp();

    expect(screen.getByRole("banner")).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Brick Breaker" }),
    );
  });

  it("hands the board the focus as the page loads, so the keys steer at once", async () => {
    await renderApp();
    await settle();

    expect(screen.getByRole("application")).toHaveFocus();
  });

  it("pauses the level in play as the page goes out of sight", async () => {
    const game = await launchedApp();

    setVisibility("hidden");

    expect(game.outcome()).toBe("paused");
  });

  it("leaves the level going as the page comes back into sight", async () => {
    const game = await launchedApp();

    setVisibility("visible");

    expect(game.outcome()).toBe("playing");
  });

  describe("turning the screen", () => {
    let viewport: FakeViewport | null = null;

    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    afterEach(() => {
      viewport?.restore();
      viewport = null;
    });

    it("pauses the level in play, and says so", async () => {
      const game = await launchedApp();

      viewport?.setSize(844, 390);
      await settle();

      expect(game.outcome()).toBe("paused");
      expect(document.querySelector("fz-announcer")).toHaveTextContent(
        /^Paused, with a score of 0/,
      );
    });
  });

  describe("the bar", () => {
    it("pauses the level in play as the focus leaves the board for it", async () => {
      const game = await launchedApp();
      await settle();

      await userEvent.tab();

      expect(game.outcome()).toBe("paused");
    });

    it("hands the board the focus as its Resume goes on", async () => {
      const game = await launchedApp();
      await settle();
      // Taking the focus from the board pauses the level, and Pause reads Resume.
      within(screen.getByRole("banner"))
        .getByRole("button", { name: "Pause" })
        .focus();
      await settle();

      await userEvent.keyboard("{Enter}");
      await settle();

      expect(game.outcome()).toBe("playing");
      expect(screen.getByRole("application")).toHaveFocus();
    });
  });

  describe("the dialogs", () => {
    it.each(["Levels", "How to play", "Settings"])(
      "open %s from the bar",
      async (name) => {
        await renderApp();

        await userEvent.click(screen.getByRole("button", { name }));

        expect(screen.getByRole("dialog", { name })).toBeVisible();
      },
    );

    it("open the levels from the card over an ended run", async () => {
      const game = await renderApp();
      await game.startAt(SPEC_LEVEL.steel);
      for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);
      game.tick(FRAME_MS, STILL);
      await settle();

      await userEvent.click(
        screen.getByRole("button", { name: "Choose a level" }),
      );

      expect(screen.getByRole("dialog", { name: "Levels" })).toBeVisible();
    });
  });

  describe("the focus", () => {
    it.each([
      ["Levels", "Close levels"],
      ["How to play", "Close How to play"],
      ["Settings", "Close settings"],
    ])("goes back to the board once %s closes", async (open, close) => {
      await renderApp();
      await userEvent.click(screen.getByRole("button", { name: open }));

      await userEvent.click(screen.getByRole("button", { name: close }));
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes back to the board once the levels chosen from an ended run close", async () => {
      const game = await renderApp();
      await game.startAt(SPEC_LEVEL.steel);
      for (let life = 0; life < FIRST_LIVES; life++) loseBall(game);
      game.tick(FRAME_MS, STILL);
      await settle();
      await userEvent.click(
        screen.getByRole("button", { name: "Choose a level" }),
      );
      await settle();

      await userEvent.click(
        screen.getByRole("button", { name: "Close levels" }),
      );
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes back to the board once a question is answered no", async () => {
      const game = await launchedApp();
      void game.newGame();
      await settle();

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes to the board as a new run begins", async () => {
      const game = await launchedApp();
      void game.newGame();
      await settle();

      await userEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "New game",
        }),
      );
      await settle();

      expect(game.outcome()).toBe("ready");
      expect(screen.getByRole("application")).toHaveFocus();
    });
  });
});
