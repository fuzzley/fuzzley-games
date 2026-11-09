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
import { fieldFor, steerField } from "../rules/field/field";
import { createRun, startWave, waveStart } from "../rules/run/run";
import { saveGame } from "../rules/run/saved_game";
import { STILL } from "../rules/ship/ship";
import { FIELD_SHORT_SIDE } from "../rules/tuning";
import { parseWave, waveEntryOf } from "../rules/waves/waves";
import { stepTimes } from "../testing/field_picture";
import {
  FRAME_MS,
  SPEC_WAVE,
  SPEC_WAVES,
  clearToNext,
  endRun,
  playUntil,
  provideSpecWaves,
  shoot,
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

/** Returns the game with a run at the specs' first wave ended, its result card open. */
async function endedApp(): Promise<GameService> {
  const game = await renderApp();
  await game.startAt(SPEC_WAVE.pebble);
  endRun(game);
  playUntil(game, () => STILL, game.resultOpen);
  await settle();
  return game;
}

/**
 * Stores a run just begun on the Gift wave, its first move made, as a
 * player's browser would hold it.
 */
function storeRun(): void {
  const run = startWave(
    createRun({ id: 1, seed: 1, speed: "normal", wave: SPEC_WAVE.gift }),
  );
  const field = fieldFor(parseWave(waveEntryOf(SPEC_WAVES, run.wave)), {
    ...waveStart(run),
    torus: { width: FIELD_SHORT_SIDE, height: FIELD_SHORT_SIDE },
    speed: run.speed,
    held: STILL,
  });
  steerField(field, { ...STILL, turn: 1 });
  stepTimes(field, 1);
  const saved = saveGame(run, field, SPEC_WAVES, {
    broughtHome: [],
    tuned: false,
  });
  storage.setItem(SAVED_GAME_KEY, JSON.stringify({ version: 1, ...saved }));
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
      ...provideSpecWaves(),
      provideAppInitializer(() => {
        inject(SavedGameService);
      }),
    ],
  });
}

/** Lets the board take the focus it was handed after the next render. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("AppComponent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts the board in the page's main landmark", async () => {
    await renderApp();

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("application", {
        name: "Asteroid Breaker, wave 1: Pebble",
      }),
    );
  });

  it("names the game in the bar", async () => {
    await renderApp();

    expect(screen.getByRole("banner")).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Asteroid Breaker" }),
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

    setPageVisibility("hidden");

    expect(game.outcome()).toBe("paused");
  });

  it("leaves the wave going as the page comes back into sight", async () => {
    const game = await startedApp();

    setPageVisibility("visible");

    expect(game.outcome()).toBe("playing");
  });

  it("leaves the next wave waiting for its first move as the page goes out of sight", async () => {
    const game = await renderApp();
    clearToNext(game);

    setPageVisibility("hidden");

    expect(game.outcome()).toBe("ready");
  });

  describe("a run taken up", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the run stored, paused, over the board", async () => {
      storeRun();

      await renderTakingUp();

      expect(
        within(screen.getByRole("main")).getByRole("button", {
          name: "Resume",
        }),
      ).toBeVisible();
    });

    it("says where it stands, once the live region has been in the page a moment", async () => {
      storeRun();
      await renderTakingUp();

      vi.advanceTimersByTime(ARRIVAL_MS);
      TestBed.tick();

      expect(document.querySelector("fz-announcer")).toHaveTextContent(
        "Your last run is paused on wave 2, Gift, with a score of 0 and 3 ships. Press Enter to go on.",
      );
    });
  });

  describe("turning the screen", () => {
    let viewport: FakeViewport;

    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    it("pauses the wave in play, and says so", async () => {
      const game = await startedApp();

      viewport.setSize(844, 390);
      await settle();

      expect(game.outcome()).toBe("paused");
      expect(document.querySelector("fz-announcer")).toHaveTextContent(
        /^Paused, with a score of 0/,
      );
    });
  });

  describe("an ended run", () => {
    it("shows its result over the board", async () => {
      await endedApp();

      expect(
        screen.getByRole("alertdialog", { name: "Game over" }),
      ).toBeVisible();
    });

    it("leaves the board's card to offer another run once its result is put away", async () => {
      await endedApp();

      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      await settle();

      expect(
        within(screen.getByRole("application")).getByRole("button", {
          name: "New game",
        }),
      ).toBeVisible();
      expect(screen.getByRole("application")).toHaveFocus();
    });
  });

  describe("the sectors", () => {
    it("open from the bar", async () => {
      await renderApp();

      await userEvent.click(screen.getByRole("button", { name: "Sectors" }));

      expect(screen.getByRole("dialog", { name: "Sectors" })).toBeVisible();
    });

    it("hand the board the focus back as they close", async () => {
      await renderApp();
      await userEvent.click(screen.getByRole("button", { name: "Sectors" }));

      await userEvent.click(
        screen.getByRole("button", { name: "Close sectors" }),
      );
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("open from the result card, which goes away", async () => {
      const game = await endedApp();

      await userEvent.click(
        screen.getByRole("button", { name: "Choose a sector" }),
      );

      expect(screen.getByRole("dialog", { name: "Sectors" })).toBeVisible();
      expect(game.resultOpen()).toBe(false);
    });

    it("take the focus from the result card they open from", async () => {
      await endedApp();

      await userEvent.click(
        screen.getByRole("button", { name: "Choose a sector" }),
      );

      expect(
        screen.getByRole("button", { name: "Close sectors" }),
      ).toHaveFocus();
    });

    it("hand the board the focus as a run begins from them", async () => {
      const game = await endedApp();
      await userEvent.click(
        screen.getByRole("button", { name: "Choose a sector" }),
      );

      await userEvent.click(screen.getByRole("button", { name: /^Specs/ }));
      await settle();

      expect(game.outcome()).toBe("ready");
      expect(screen.getByRole("application")).toHaveFocus();
    });
  });

  describe("How to play", () => {
    it("opens from the bar", async () => {
      await renderApp();

      await userEvent.click(
        screen.getByRole("button", { name: "How to play" }),
      );

      expect(screen.getByRole("dialog", { name: "How to play" })).toBeVisible();
    });

    it("hands the board the focus back as it closes", async () => {
      await renderApp();
      await userEvent.click(
        screen.getByRole("button", { name: "How to play" }),
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Close How to play" }),
      );
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    describe("with the scene it loads", () => {
      let scene: SceneRun<HostedScene> | null = null;

      beforeEach(() => {
        paintRoles(FIELD_ROLES, ROLES);
      });

      afterEach(() => {
        scene?.destroy();
        scene = null;
      });

      /** Runs the scene the board hands its canvas, its first frame drawn. */
      async function runBoardScene(): Promise<SceneRun<HostedScene>> {
        const board = screen.getByRole("application");
        const make =
          await TestBed.inject(FakePhaserCanvas).host.latest.source();
        const run = await runScene(make, {
          config: { input: { keyboard: { target: board } } },
        });
        scene = run;
        run.advance(FRAME_MS);
        return run;
      }

      it("has the scene encode no picture before How to play opens", async () => {
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
  });

  describe("the settings", () => {
    it("open from the bar", async () => {
      await renderApp();

      await userEvent.click(screen.getByRole("button", { name: "Settings" }));

      expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
    });

    it("hand the board the focus back as they close", async () => {
      await renderApp();
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));

      await userEvent.click(
        screen.getByRole("button", { name: "Close settings" }),
      );
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
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

    it("goes back to the board as the result card closes, wherever it was before", async () => {
      const game = await renderApp();
      await game.startAt(SPEC_WAVE.pebble);
      endRun(game);
      screen.getByRole("application").blur();
      playUntil(game, () => STILL, game.resultOpen);
      await settle();

      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes to the board as a run begins from the result card", async () => {
      const game = await endedApp();

      await userEvent.click(
        screen.getByRole("button", { name: /^Try again from/ }),
      );
      await settle();

      expect(game.outcome()).toBe("ready");
      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes to the board as a run begins from the board's card over an ended one", async () => {
      const game = await endedApp();
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      await settle();

      await userEvent.click(
        within(screen.getByRole("application")).getByRole("button", {
          name: "New game",
        }),
      );
      await settle();

      expect(game.outcome()).toBe("ready");
      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes back to the board as the bar's Resume goes on with a paused wave, wherever it was before", async () => {
      const game = await startedApp();
      game.pause();
      await settle();
      screen.getByRole("application").blur();

      await userEvent.click(
        within(screen.getByRole("banner")).getByRole("button", {
          name: "Resume",
        }),
      );
      await settle();

      expect(game.outcome()).toBe("playing");
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
