import { TestBed } from "@angular/core/testing";
import { render, screen } from "@testing-library/angular";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import { at } from "../../rules/cells";
import { digitsIn } from "../../rules/digits";
import { type GameOptions, playOn } from "../../testing/game";
import { solvedBut } from "../../testing/grid_picture";
import { GameService } from "../play/game.service";
import { PadComponent } from "./pad.component";

/** Eight rows with no digit in them, to draw a row of the player's above. */
const EMPTY = new Array<string>(8).fill(".........");

/** The player's 6 at row 1, column 1, which the solution holds. */
const RIGHT_6 = ["6........", ...EMPTY];

/** The player's 9 at row 1, column 1, where the solution has a 6. */
const WRONG_9 = ["9........", ...EMPTY];

/**
 * Renders the pad over a grid drawn as pictures, `EASY` unless given, with
 * row 1, column 1 selected, and returns the user, the game and a count of
 * the presses that hand the focus back.
 */
async function renderPad(options: GameOptions = {}): Promise<{
  user: UserEvent;
  game: GameService;
  pressed: ReturnType<typeof vi.fn>;
}> {
  const pressed = vi.fn();
  const { fixture } = await render(PadComponent, { on: { pressed } });
  const game = playOn(options);
  game.select(0);
  await fixture.whenStable();
  return { user: userEvent.setup(), game, pressed };
}

/** Returns a button on the pad by its name. */
function button(name: string | RegExp): HTMLElement {
  return screen.getByRole("button", { name });
}

describe("PadComponent", () => {
  it("names each digit's key with how many are left to place", async () => {
    await renderPad();

    expect(button("5, 4 left")).toBeInTheDocument();
    expect(button("6, 5 left")).toBeInTheDocument();
  });

  it("says a digit is all placed once all nine are", async () => {
    await renderPad({ digits: solvedBut("r1c1") });

    expect(button("1, all placed")).toBeInTheDocument();
    expect(button("6, 1 left")).toBeInTheDocument();
  });

  it("places the digit pressed in the selected square", async () => {
    const { user, game } = await renderPad();

    await user.click(button(/^6,/));

    expect(game.grid().digits[0]).toBe(6);
  });

  it("turns Notes mode on and off, as its key shows", async () => {
    const { user, game } = await renderPad();

    await user.click(button("Notes"));

    expect(button("Notes")).toHaveAttribute("aria-pressed", "true");
    expect(game.notesMode()).toBe(true);
  });

  it("adds a note from a digit in Notes mode", async () => {
    const { user, game } = await renderPad();
    await user.click(button("Notes"));

    await user.click(button(/^6,/));

    expect(digitsIn(at(game.grid().notes, 0))).toEqual([6]);
  });

  it("erases the selected square", async () => {
    const { user, game } = await renderPad({ digits: RIGHT_6 });

    await user.click(button("Erase"));

    expect(game.grid().digits[0]).toBe(0);
  });

  it("dims Undo while there is no move to take back", async () => {
    await renderPad();

    expect(button("Undo")).toHaveAttribute("aria-disabled", "true");
  });

  it("takes back the last move", async () => {
    const { user, game } = await renderPad();
    await user.click(button(/^6,/));

    await user.click(button("Undo"));

    expect(game.grid().digits[0]).toBe(0);
    expect(button("Undo")).toHaveAttribute("aria-disabled", "true");
  });

  it("shows a hint's words, and turns Hint into Fill in", async () => {
    const { user, game } = await renderPad();

    await user.click(button("Hint"));

    const hint = game.hint();
    expect(screen.getByText(hint?.title ?? "")).toBeInTheDocument();
    expect(button("Fill in")).toBeInTheDocument();
  });

  it("fills the hint in from the same key", async () => {
    const { user, game } = await renderPad();
    await user.click(button("Hint"));
    const hint = game.hint();

    await user.click(button("Fill in"));

    expect(game.grid().digits[hint?.index ?? -1]).toBe(hint?.digit);
    expect(button("Hint")).toBeInTheDocument();
  });

  it("offers to take out a wrong digit a hint finds", async () => {
    const { user } = await renderPad({ digits: WRONG_9 });

    await user.click(button("Hint"));

    expect(button("Take out")).toBeInTheDocument();
  });

  it("offers to add a note a hint finds missing", async () => {
    const { user } = await renderPad({ notes: { r1c1: "19" } });

    await user.click(button("Hint"));

    expect(button("Add note")).toBeInTheDocument();
  });

  it("dims Hint once the puzzle is solved", async () => {
    const { user } = await renderPad({ digits: solvedBut("r1c1") });

    await user.click(button(/^6,/));

    expect(button("Hint")).toHaveAttribute("aria-disabled", "true");
  });

  it("hands the focus back after a press with a pointer", async () => {
    const { user, pressed } = await renderPad();

    await user.click(button("Erase"));

    expect(pressed).toHaveBeenCalledOnce();
  });

  it("keeps the focus after a press from the keyboard", async () => {
    const { user, pressed } = await renderPad();
    button("Erase").focus();

    await user.keyboard("{Enter}");

    expect(pressed).not.toHaveBeenCalled();
    expect(button("Erase")).toHaveFocus();
  });

  it("marks the pad while Notes mode is on", async () => {
    const { fixture } = await render(PadComponent);

    TestBed.inject(GameService).toggleNotesMode();
    await fixture.whenStable();

    expect(fixture.nativeElement).toHaveClass("notes");
  });
});
