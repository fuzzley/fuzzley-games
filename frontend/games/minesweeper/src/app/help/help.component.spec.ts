import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { GameService } from "../play/game.service";
import { HelpComponent } from "./help.component";

describe("HelpComponent", () => {
  it("stays shut until asked to open", async () => {
    await render(HelpComponent, { inputs: { open: false } });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens as a dialog named How to play", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(
      screen.getByRole("dialog", { name: "How to play" }),
    ).toBeInTheDocument();
  });

  it("says how many lives a game starts with", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByText(/Lives\./).parentElement).toHaveTextContent(
      "You start with 3 lives. If you open a mine, you lose one and keep playing. When you have none left, the game is over.",
    );
  });

  it("says a mine ends a game with 1 life", async () => {
    const { detectChanges } = await render(HelpComponent, {
      inputs: { open: true },
    });

    await TestBed.inject(GameService).changeSettings({ lives: 1 });
    detectChanges();

    expect(screen.getByText(/Lives\./).parentElement).toHaveTextContent(
      "You start with 1 life. If you open a mine, the game is over.",
    );
  });

  it("gives the keys for each control", async () => {
    await render(HelpComponent, { inputs: { open: true } });

    expect(screen.getByRole("cell", { name: "F" })).toBeInTheDocument();
  });

  it("asks to close from its close button", async () => {
    const closed = vi.fn();
    await render(HelpComponent, { inputs: { open: true }, on: { closed } });

    await userEvent.click(
      screen.getByRole("button", { name: "Close How to play" }),
    );

    expect(closed).toHaveBeenCalledOnce();
  });
});
