import { TestBed } from "@angular/core/testing";
import { type FakeViewport, installFakeViewport } from "@fz/game-ui/testing";
import { FakePhaserCanvas, provideFakePhaserCanvas } from "@fz/phaser/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { AppComponent } from "./app.component";
import { GameService } from "./play/game.service";
import {
  type Arrows,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
} from "./settings/settings.service";

/**
 * Renders the game on a fake canvas, whose scene is drawn at once unless
 * `readyAtOnce` is false.
 */
async function renderApp(readyAtOnce = true): Promise<GameService> {
  await render(AppComponent, {
    providers: [provideFakePhaserCanvas({ readyAtOnce })],
  });
  return TestBed.inject(GameService);
}

/** Lets the board take the focus it was handed after the next render. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Keeps when the player wants the arrows, as their browser would. */
function wantArrows(arrows: Arrows): void {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ version: 1, ...DEFAULT_SETTINGS, arrows }),
  );
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
  let viewport: FakeViewport | null = null;

  afterEach(() => {
    Reflect.deleteProperty(document, "visibilityState");
    viewport?.restore();
    viewport = null;
  });

  /** Makes the window a phone's, pointed at with a finger. */
  function onTouchScreen(): void {
    viewport = installFakeViewport(390, 844);
    viewport.setCoarsePointer(true);
  }

  it("puts the board in the page's main landmark", async () => {
    await renderApp();

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("application", { name: "Snake, 17 by 17" }),
    );
  });

  it("names the game", async () => {
    await renderApp();

    expect(
      screen.getByRole("heading", { level: 1, name: "Snake" }),
    ).toBeInTheDocument();
  });

  it("hands the board the focus as the page loads, so the keys steer at once", async () => {
    await renderApp();

    expect(screen.getByRole("application")).toHaveFocus();
  });

  it("pauses the run as the page goes out of sight", async () => {
    const game = await renderApp();
    game.turn("up");

    setVisibility("hidden");

    expect(game.outcome()).toBe("paused");
  });

  it("leaves the run going as the page comes back into sight", async () => {
    const game = await renderApp();
    game.turn("up");

    setVisibility("visible");

    expect(game.outcome()).toBe("playing");
  });

  describe("turning the screen", () => {
    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    it("pauses the run under way, and says so", async () => {
      const game = await renderApp();
      game.turn("up");

      viewport?.setSize(844, 390);
      await settle();

      expect(game.outcome()).toBe("paused");
      expect(document.querySelector("fz-announcer")).toHaveTextContent(
        /^Paused, with a score of 0/,
      );
    });

    it("pauses it turned back upright too", async () => {
      viewport?.setSize(844, 390);
      const game = await renderApp();
      game.turn("up");

      viewport?.setSize(390, 844);
      await settle();

      expect(game.outcome()).toBe("paused");
    });

    it("leaves a run waiting for its first direction waiting", async () => {
      const game = await renderApp();

      viewport?.setSize(844, 390);
      await settle();

      expect(game.outcome()).toBe("ready");
    });

    it("leaves the run going through a change of size that doesn't turn it", async () => {
      const game = await renderApp();
      game.turn("up");

      viewport?.setSize(390, 664);
      await settle();

      expect(game.outcome()).toBe("playing");
    });
  });

  describe("the arrows", () => {
    it("wait for the board to be drawn", async () => {
      onTouchScreen();
      const game = await renderApp(false);

      fireEvent.pointerDown(screen.getByRole("button", { name: "Up" }), {
        button: 0,
      });

      expect(game.outcome()).toBe("ready");
      expect(screen.getByRole("button", { name: "Up" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("start the run once the board is drawn", async () => {
      onTouchScreen();
      const game = await renderApp(false);
      TestBed.inject(FakePhaserCanvas).host.latest.ready();
      await settle();

      fireEvent.pointerDown(screen.getByRole("button", { name: "Up" }), {
        button: 0,
      });

      expect(game.outcome()).toBe("playing");
    });

    it("show on a touch screen", async () => {
      onTouchScreen();

      await renderApp();

      expect(screen.getByRole("group", { name: "Arrows" })).toBeVisible();
    });

    it("stay away where the pointer is a mouse", async () => {
      await renderApp();

      expect(
        screen.queryByRole("group", { name: "Arrows" }),
      ).not.toBeInTheDocument();
    });

    it("show with a mouse too where the player wants them always", async () => {
      wantArrows("always");

      await renderApp();

      expect(screen.getByRole("group", { name: "Arrows" })).toBeVisible();
    });

    it("stay away on a touch screen where the player wants them never", async () => {
      onTouchScreen();
      wantArrows("never");

      await renderApp();

      expect(
        screen.queryByRole("group", { name: "Arrows" }),
      ).not.toBeInTheDocument();
    });

    it("hand the board the focus once one is pressed", async () => {
      wantArrows("always");
      await renderApp();
      screen.getByRole("button", { name: "Left" }).focus();

      fireEvent.pointerDown(screen.getByRole("button", { name: "Up" }), {
        button: 0,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(screen.getByRole("application")).toHaveFocus();
    });
  });

  describe("the focus", () => {
    it("goes back to the board once the settings close", async () => {
      await renderApp();
      await userEvent.click(screen.getByRole("button", { name: "Settings" }));

      await userEvent.click(
        screen.getByRole("button", { name: "Close settings" }),
      );
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("goes back to the board once a question is answered no", async () => {
      const game = await renderApp();
      game.turn("up");
      await userEvent.click(screen.getByRole("button", { name: "New Game" }));

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await settle();

      expect(screen.getByRole("application")).toHaveFocus();
    });

    it("leaves the board as a dialog opens, pausing the run", async () => {
      const game = await renderApp();
      game.turn("up");

      await userEvent.click(
        screen.getByRole("button", { name: "How to play" }),
      );

      expect(game.outcome()).toBe("paused");
    });
  });
});
