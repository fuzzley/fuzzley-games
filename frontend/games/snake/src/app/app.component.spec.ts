import { TestBed } from "@angular/core/testing";
import { provideFakePhaserCanvas } from "@fz/phaser/testing";
import { render, screen } from "@testing-library/angular";
import { AppComponent } from "./app.component";
import { GameService } from "./play/game.service";

/** Renders the game on a fake canvas. */
async function renderApp(): Promise<GameService> {
  await render(AppComponent, { providers: [provideFakePhaserCanvas()] });
  return TestBed.inject(GameService);
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
});
