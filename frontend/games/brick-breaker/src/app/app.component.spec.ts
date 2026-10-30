import { inject, provideAppInitializer } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { ARRIVAL_MS } from "@fz/ui/announcer";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { createField } from "../rules/field";
import { parseLevel } from "../rules/levels";
import { createRun, startLevel } from "../rules/run";
import { saveGame } from "../rules/saved_game";
import { FIRST_LIVES } from "../rules/tuning";
import {
  FRAME_MS,
  SPEC_LEVEL,
  SPEC_LEVELS,
  STILL,
  loseBall,
  provideSpecLevels,
} from "../testing/play";
import { AppComponent } from "./app.component";
import { GameService } from "./play/game.service";
import { SAVED_GAME_KEY, SavedGameService } from "./play/saved_game.service";

/** Renders the game on a fake canvas, and waits for its scene to be drawn. */
async function renderApp(): Promise<GameService> {
  const { fixture } = await render(AppComponent, {
    providers: [provideFakePhaserCanvas(), ...provideSpecLevels()],
  });
  await fixture.whenStable();
  return TestBed.inject(GameService);
}

/** Stores a run just begun on the steel level, as a player's browser would hold it. */
function storeRun(): void {
  const entry = SPEC_LEVELS[SPEC_LEVEL.steel - 1];
  if (!entry) throw new Error("No steel level.");
  const run = startLevel(
    createRun({
      id: 1,
      seed: 1,
      speed: "normal",
      lastLevel: SPEC_LEVELS.length,
      level: entry.number,
    }),
  );
  const field = createField(parseLevel(entry), { speed: "normal", seed: 1 });
  localStorage.setItem(
    SAVED_GAME_KEY,
    JSON.stringify({ version: 1, ...saveGame(run, field, SPEC_LEVELS) }),
  );
}

/**
 * Renders the game as `main.ts` starts it, taking up the run stored, on fake
 * timers, so the live region waits until a spec moves them on.
 */
async function renderTakingUp(): Promise<void> {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  await render(AppComponent, {
    providers: [
      provideFakePhaserCanvas(),
      ...provideSpecLevels(),
      provideAppInitializer(() => {
        inject(SavedGameService);
      }),
    ],
  });
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
    vi.useRealTimers();
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

  it("doesn't say where a run taken up stands as the live region arrives", async () => {
    storeRun();

    await renderTakingUp();

    expect(document.querySelector("fz-announcer")).toHaveTextContent(/^$/);
  });

  it("says where a run taken up stands, once the live region has been in the page a moment", async () => {
    storeRun();
    await renderTakingUp();

    vi.advanceTimersByTime(ARRIVAL_MS);
    TestBed.tick();

    expect(document.querySelector("fz-announcer")).toHaveTextContent(
      "Your last run is paused on level 3, Steel, with a score of 0 and 3 lives. Press Enter to go on.",
    );
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
