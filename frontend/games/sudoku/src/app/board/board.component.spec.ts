import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { fireEvent } from "@testing-library/dom";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { type GameOptions, playOn } from "../../testing/game";
import { squareAt } from "../../testing/grid_picture";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { BoardComponent } from "./board.component";

/** Returns the square a name such as `r1c1` names, as the board shows it. */
function square(name: string): HTMLElement {
  const found = screen.getAllByRole("gridcell")[squareAt(name)];
  if (!found) throw new Error(`No square ${name}`);
  return found;
}

/** The player's 6 at row 1, column 1, which the solution holds. */
const RIGHT_6 = ["6........", ...new Array<string>(8).fill(".........")];

/** Renders the board over a grid drawn as pictures, `EASY` unless given. */
async function renderBoard(options: GameOptions = {}): Promise<{
  user: UserEvent;
  fixture: ComponentFixture<BoardComponent>;
}> {
  const { fixture } = await render(BoardComponent);
  playOn(options);
  await fixture.whenStable();
  return { user: userEvent.setup(), fixture };
}

/** Renders the board, clicks a square and returns the user. */
async function renderAndSelect(
  name: string,
  options: GameOptions = {},
): Promise<UserEvent> {
  const { user } = await renderBoard(options);
  await user.click(square(name));
  return user;
}

describe("BoardComponent", () => {
  it("is a grid named for its size", async () => {
    await renderBoard();

    expect(
      screen.getByRole("grid", { name: "Sudoku, 9 rows by 9 columns" }),
    ).toBeInTheDocument();
  });

  it("names each square by what it holds", async () => {
    await renderBoard({ digits: RIGHT_6, notes: { r1c2: "19" } });

    expect(square("r1c1")).toHaveAccessibleName("6");
    expect(square("r1c2")).toHaveAccessibleName("Blank, notes 1 9");
    expect(square("r1c3")).toHaveAccessibleName("Blank");
    expect(square("r1c4")).toHaveAccessibleName("5, given");
  });

  it("selects a square on a click", async () => {
    await renderAndSelect("r5c5");

    expect(square("r5c5")).toHaveAttribute("aria-selected", "true");
    expect(square("r5c5")).toHaveAttribute("tabindex", "0");
    expect(square("r1c1")).toHaveAttribute("aria-selected", "false");
  });

  it("moves the selection with the arrow keys", async () => {
    const user = await renderAndSelect("r1c1");

    await user.keyboard("{ArrowRight}{ArrowDown}");

    expect(square("r2c2")).toHaveFocus();
    expect(square("r2c2")).toHaveAttribute("aria-selected", "true");
  });

  it("places a digit on its key", async () => {
    const user = await renderAndSelect("r1c1");

    await user.keyboard("6");

    expect(square("r1c1")).toHaveAccessibleName("6");
  });

  it("places a digit from the top row of an AZERTY keyboard, which types a symbol", async () => {
    await renderAndSelect("r1c1");

    fireEvent.keyDown(square("r1c1"), { code: "Digit6", key: "-" });

    expect(square("r1c1")).toHaveAccessibleName("6");
  });

  it("adds a note on Shift and a digit", async () => {
    const user = await renderAndSelect("r1c1");

    await user.keyboard("{Shift>}6{/Shift}");

    expect(square("r1c1")).toHaveAccessibleName("Blank, notes 6");
  });

  it("leaves a number pad key alone while it moves rather than types", async () => {
    await renderAndSelect("r1c1");

    fireEvent.keyDown(square("r1c1"), {
      code: "Numpad6",
      key: "ArrowRight",
      shiftKey: true,
    });

    expect(square("r1c1")).toHaveAccessibleName("Blank");
  });

  it("adds a note from a digit in Notes mode, which N turns on", async () => {
    const user = await renderAndSelect("r1c1");

    await user.keyboard("n6");

    expect(square("r1c1")).toHaveAccessibleName("Blank, notes 6");
  });

  it("erases the square on Backspace", async () => {
    const user = await renderAndSelect("r1c1", { digits: RIGHT_6 });

    await user.keyboard("{Backspace}");

    expect(square("r1c1")).toHaveAccessibleName("Blank");
  });

  it("leaves keys with Ctrl to the browser", async () => {
    const user = await renderAndSelect("r1c1");

    await user.keyboard("{Control>}6{/Control}");

    expect(square("r1c1")).toHaveAccessibleName("Blank");
  });

  it("marks a digit that repeats, on every square it repeats on", async () => {
    const user = await renderAndSelect("r1c1");

    await user.keyboard("5");

    expect(square("r1c1")).toHaveAccessibleName("5, repeats in row 1");
    expect(square("r1c1")).toHaveClass("marked");
    expect(square("r1c4")).toHaveClass("marked");
  });

  it("marks a wrong digit with the assist on", async () => {
    const user = await renderAndSelect("r1c1");
    TestBed.inject(SettingsService).update({ markMistakes: true });

    await user.keyboard("9");

    expect(square("r1c1")).toHaveAccessibleName("9, wrong");
    expect(square("r1c1")).toHaveClass("marked");
  });

  it("leaves a wrong digit unmarked with the assist off", async () => {
    const user = await renderAndSelect("r1c1");

    await user.keyboard("9");

    expect(square("r1c1")).toHaveAccessibleName("9");
    expect(square("r1c1")).not.toHaveClass("marked");
  });

  it("shows a hint on H, selecting its square, and fills it in on Enter", async () => {
    const user = await renderAndSelect("r1c1");
    const game = TestBed.inject(GameService);

    await user.keyboard("h");
    const hint = game.hint();
    await user.keyboard("{Enter}");

    const index = hint?.index ?? -1;
    expect(screen.getAllByRole("gridcell")[index]).toHaveFocus();
    expect(game.grid().digits[index]).toBe(hint?.digit);
  });

  it("shades the selected square's units and digit", async () => {
    await renderAndSelect("r1c4");

    expect(square("r1c4")).toHaveAttribute("data-shade", "selected");
    expect(square("r1c9")).toHaveAttribute("data-shade", "related");
    expect(square("r6c5")).toHaveAttribute("data-shade", "same");
    expect(square("r9c1")).not.toHaveAttribute("data-shade");
  });

  it("puts the focus on the selected square when asked", async () => {
    const { fixture } = await renderBoard();
    TestBed.inject(GameService).select(squareAt("r5c5"));

    fixture.componentInstance.focus();
    await fixture.whenStable();

    expect(square("r5c5")).toHaveFocus();
  });

  it("moves the focus with the selection while the board has it", async () => {
    const { fixture } = await renderBoard();
    square("r1c1").focus();

    TestBed.inject(GameService).select(squareAt("r9c9"));
    await fixture.whenStable();

    expect(square("r9c9")).toHaveFocus();
  });
});
