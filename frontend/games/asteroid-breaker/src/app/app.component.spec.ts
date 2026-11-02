import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import {
  FRAME_MS,
  SPEC_WAVE,
  endRun,
  provideSpecWaves,
  shoot,
} from "../testing/play";
import { AppComponent } from "./app.component";
import { GameService } from "./play/game.service";

/** Renders the game on a fake canvas, and waits for its scene to be drawn. */
async function renderApp(): Promise<GameService> {
  const { fixture } = await render(AppComponent, {
    providers: [provideFakePhaserCanvas(), ...provideSpecWaves()],
  });
  await fixture.whenStable();
  return TestBed.inject(GameService);
}

/** Returns the game with its first wave started by a first move. */
async function startedApp(): Promise<GameService> {
  const game = await renderApp();
  game.tick(FRAME_MS, shoot(game));
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
    vi.restoreAllMocks();
  });

  it("names the game in the heading of the page's main landmark, over the board", async () => {
    await renderApp();

    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("heading", { level: 1, name: "Asteroid Breaker" }),
    ).toBeInTheDocument();
    expect(main).toContainElement(
      screen.getByRole("application", {
        name: "Asteroid Breaker, wave 1: Pebble",
      }),
    );
  });

  it("hands the board the focus as the page loads, so the keys steer at once", async () => {
    await renderApp();
    await settle();

    expect(screen.getByRole("application")).toHaveFocus();
  });

  it("draws no focus ring as the page loads, as nothing was pressed to put it there", async () => {
    // jsdom draws no ring, so what the board was asked for is all there is to see.
    const focus = vi.spyOn(HTMLElement.prototype, "focus");

    await renderApp();
    await settle();

    expect(focus).toHaveBeenCalledWith({ focusVisible: false });
  });

  it("pauses the wave in play as the page goes out of sight", async () => {
    const game = await startedApp();

    setVisibility("hidden");

    expect(game.outcome()).toBe("paused");
  });

  it("leaves the wave going as the page comes back into sight", async () => {
    const game = await startedApp();

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

    it("pauses the wave in play, and says so", async () => {
      const game = await startedApp();

      viewport?.setSize(844, 390);
      await settle();

      expect(game.outcome()).toBe("paused");
      expect(document.querySelector("fz-announcer")).toHaveTextContent(
        /^Paused, with a score of 0/,
      );
    });
  });

  describe("an ended run", () => {
    it("has its result put away at once, leaving the board's card to offer another run", async () => {
      const game = await renderApp();
      await game.startAt(SPEC_WAVE.pebble);
      endRun(game);

      game.tick(FRAME_MS, shoot(game));
      await settle();

      expect(game.resultClosed()).toBe(true);
      expect(screen.getByRole("button", { name: "New game" })).toBeVisible();
    });
  });

  describe("the focus", () => {
    it("goes back to the board once a question is answered no, wherever it was before", async () => {
      const game = await startedApp();
      screen.getByRole("application").blur();
      void game.newGame();
      await settle();

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes to the board as a run begins from the card over an ended one", async () => {
      const game = await renderApp();
      await game.startAt(SPEC_WAVE.pebble);
      endRun(game);
      game.tick(FRAME_MS, shoot(game));
      await settle();

      await userEvent.click(screen.getByRole("button", { name: "New game" }));
      await settle();

      expect(game.outcome()).toBe("ready");
      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes to the board as a new run begins", async () => {
      const game = await startedApp();
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
