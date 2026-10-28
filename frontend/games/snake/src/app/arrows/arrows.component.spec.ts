import { TestBed } from "@angular/core/testing";
import { fireEvent, render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { GameService } from "../play/game.service";
import { ArrowsComponent } from "./arrows.component";

/** Renders the arrows, and returns the game they steer. */
async function renderArrows(): Promise<GameService> {
  await render(ArrowsComponent);
  return TestBed.inject(GameService);
}

describe("ArrowsComponent", () => {
  it("offers an arrow for each way, in a group", async () => {
    await renderArrows();

    const group = screen.getByRole("group", { name: "Arrows" });
    expect(
      [...group.querySelectorAll("button")].map((b) => b.ariaLabel),
    ).toEqual(["Up", "Left", "Right", "Down"]);
  });

  it("turns the snake as a finger lands on an arrow", async () => {
    const game = await renderArrows();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Up" }), {
      button: 0,
    });

    expect(game.run()).toMatchObject({ outcome: "playing", turns: ["up"] });
  });

  it("keeps the focus where it was as a finger lands", async () => {
    await renderArrows();

    const kept = !fireEvent.pointerDown(
      screen.getByRole("button", { name: "Up" }),
      { button: 0 },
    );

    expect(kept).toBe(true);
  });

  it("ignores a press of another mouse button", async () => {
    const game = await renderArrows();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Up" }), {
      button: 2,
    });

    expect(game.outcome()).toBe("ready");
  });

  it("turns the snake at Enter on an arrow with the focus", async () => {
    const game = await renderArrows();
    screen.getByRole("button", { name: "Down" }).focus();

    await userEvent.keyboard("{Enter}");

    expect(game.run()).toMatchObject({ outcome: "playing", turns: ["down"] });
  });
});
