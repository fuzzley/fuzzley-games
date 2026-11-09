import { ApplicationRef, inject, provideAppInitializer } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import type { HostedScene } from "@fz/phaser/host";
import {
  FakePhaserCanvas,
  type SceneRun,
  provideFakePhaserCanvas,
  runScene,
} from "@fz/phaser/testing";
import { ARRIVAL_MS } from "@fz/ui/announcer";
import { render, screen, within } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import {
  MemoryStorage,
  provideMemoryStorage,
  setPageVisibility,
} from "@fz/ui/testing";
import { Textures } from "phaser";
import { createField } from "../rules/field/field";
import { parseLevel } from "../rules/levels/levels";
import { createRun, startLevel } from "../rules/run/run";
import { saveGame } from "../rules/run/saved_game";
import { FIRST_LIVES } from "../rules/tuning";
import {
  FRAME_MS,
  SPEC_LEVEL,
  SPEC_LEVELS,
  STILL,
  loseBall,
  provideSpecLevels,
} from "../testing/play";
import { paintRoles } from "@fz/style/testing";
import { FIELD_ROLES } from "./board/field_roles";
import { ROLES } from "../testing/roles";
import { AppComponent } from "./app.component";
import { GameService } from "./play/game.service";
import { SAVED_GAME_KEY, SavedGameService } from "./play/saved_game.service";

/** What the player's browser keeps, empty for each test. */
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  TestBed.configureTestingModule({
    providers: [provideMemoryStorage(storage)],
  });
});

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
  storage.setItem(
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

describe("AppComponent", () => {
  afterEach(() => {
    vi.useRealTimers();
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

    setPageVisibility("hidden");

    expect(game.outcome()).toBe("paused");
  });

  it("leaves the level going as the page comes back into sight", async () => {
    const game = await launchedApp();

    setPageVisibility("visible");

    expect(game.outcome()).toBe("playing");
  });

  describe("turning the screen", () => {
    let viewport: FakeViewport;

    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    it("pauses the level in play, and says so", async () => {
      const game = await launchedApp();

      viewport.setSize(844, 390);
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

  describe("How to play, with the scene the board loads", () => {
    let scene: SceneRun<HostedScene> | null = null;

    beforeEach(() => {
      paintRoles(FIELD_ROLES, ROLES);
    });

    afterEach(() => {
      scene?.destroy();
      scene = null;
      vi.restoreAllMocks();
    });

    /** Runs the scene the board hands its canvas, its first frame drawn. */
    async function runBoardScene(): Promise<SceneRun<HostedScene>> {
      const board = screen.getByRole("application");
      const make = await TestBed.inject(FakePhaserCanvas).host.latest.source();
      const run = await runScene(make, {
        config: { input: { keyboard: { target: board } } },
      });
      scene = run;
      run.advance(FRAME_MS);
      return run;
    }

    it("has the scene encode no picture before it opens", async () => {
      const encode = vi.spyOn(Textures.TextureManager.prototype, "getBase64");
      await renderApp();

      await runBoardScene();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(encode).not.toHaveBeenCalled();
    });

    it("shows the pictures the scene drew", async () => {
      await renderApp();
      await runBoardScene();

      await userEvent.click(
        screen.getByRole("button", { name: "How to play" }),
      );

      expect(
        within(
          screen.getByRole("dialog", { name: "How to play" }),
        ).queryAllByRole("presentation"),
      ).not.toHaveLength(0);
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
