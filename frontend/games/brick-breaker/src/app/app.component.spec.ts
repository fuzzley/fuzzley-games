import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { provideSpecLevels } from "../testing/play";
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

  describe("the focus", () => {
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
