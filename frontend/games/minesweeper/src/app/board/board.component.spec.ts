import { render, screen } from "@testing-library/angular";
import { fireEvent } from "@testing-library/dom";
import { type UserEvent, userEvent } from "@testing-library/user-event";
import type { PictureOptions } from "../../testing/field_picture";
import {
  type FakeViewport,
  installFakeViewport,
} from "../../testing/fake_viewport";
import { playOn } from "../../testing/game";
import { BoardComponent } from "./board.component";

/**
 * A field in play. Its top-right corner is a blank that opens the squares
 * around it; the 1 below the mine clears around itself once the mine is
 * flagged.
 */
const IN_PLAY = ["*..", "...", "..*"];

/** Returns the squares of the board, in the order they are shown. */
function squares(): HTMLElement[] {
  return screen.getAllByRole("gridcell");
}

/** Returns the square shown at an index. */
function square(index: number): HTMLElement {
  const found = squares()[index];
  if (!found) throw new Error(`No square ${index}`);
  return found;
}

/** Returns what each square is named, in the order they are shown. */
function names(): (string | null)[] {
  return squares().map((cell) => cell.getAttribute("aria-label"));
}

/** Renders the board over a field drawn as a picture. */
async function renderBoard(
  picture: readonly string[],
  options: PictureOptions = {},
): Promise<UserEvent> {
  const { fixture } = await render(BoardComponent);
  playOn(picture, options);
  await fixture.whenStable();
  return userEvent.setup();
}

describe("BoardComponent", () => {
  let viewport: FakeViewport | null = null;

  afterEach(() => {
    viewport?.restore();
    viewport = null;
    vi.useRealTimers();
  });

  it("is a grid named by its size", async () => {
    await renderBoard(["*...", "....", "...*"]);

    expect(
      screen.getByRole("grid", { name: "Minefield, 3 rows by 4 columns" }),
    ).toBeInTheDocument();
  });

  it("names each square by what it shows", async () => {
    await renderBoard(["F1_", "231", "x.*"]);

    expect(names()).toEqual([
      "Flagged",
      "1",
      "Blank",
      "2",
      "3",
      "1",
      "Mine, stepped on",
      "Hidden",
      "Hidden",
    ]);
  });

  it("reveals a square on a click", async () => {
    const user = await renderBoard(IN_PLAY);

    await user.click(square(2));

    expect(square(2)).toHaveAccessibleName("Blank");
    expect(square(4)).toHaveAccessibleName("2");
  });

  it("flags a square on a right click", async () => {
    const user = await renderBoard(IN_PLAY);

    await user.pointer({ keys: "[MouseRight]", target: square(0) });

    expect(square(0)).toHaveAccessibleName("Flagged");
  });

  it("reveals the square in focus on Enter", async () => {
    const user = await renderBoard(IN_PLAY);
    square(3).focus();

    await user.keyboard("{Enter}");

    expect(square(3)).toHaveAccessibleName("1");
  });

  it("reveals the square in focus on Space", async () => {
    const user = await renderBoard(IN_PLAY);
    square(3).focus();

    await user.keyboard(" ");

    expect(square(3)).toHaveAccessibleName("1");
  });

  it("flags the square in focus on F", async () => {
    const user = await renderBoard(IN_PLAY);
    square(0).focus();

    await user.keyboard("f");

    expect(square(0)).toHaveAccessibleName("Flagged");
  });

  it("leaves F alone with a modifier, such as the browser's Ctrl+F", async () => {
    const user = await renderBoard(IN_PLAY);
    square(0).focus();

    await user.keyboard("{Control>}f{/Control}");

    expect(square(0)).toHaveAccessibleName("Hidden");
  });

  it("clears around a number whose flags match it", async () => {
    const user = await renderBoard(["F1.", "...", "..*"]);

    await user.click(square(1));

    expect(names()).toEqual([
      "Flagged",
      "1",
      "Blank",
      "1",
      "2",
      "1",
      "Hidden",
      "Hidden",
      "Hidden",
    ]);
  });

  it("shows a mine stepped on", async () => {
    const user = await renderBoard(IN_PLAY);

    await user.click(square(0));

    expect(square(0)).toHaveAccessibleName("Mine, stepped on");
  });

  it("shows every mine, and every wrong flag, once the game is lost", async () => {
    const user = await renderBoard(["*f.", "...", "..*"], { livesLeft: 1 });

    await user.click(square(0));

    expect(square(1)).toHaveAccessibleName("Flagged, no mine");
    expect(square(8)).toHaveAccessibleName("Mine");
  });

  describe("on a touch screen", () => {
    /** Renders the board, then stops the clock, so a press is timed by hand. */
    async function renderTouchBoard(): Promise<void> {
      await renderBoard(IN_PLAY);
      vi.useFakeTimers();
    }

    /** Rests a finger on a square, and moves it as far as asked. */
    function press(target: HTMLElement, movedPx = 0): void {
      fireEvent.pointerDown(target, {
        pointerType: "touch",
        pointerId: 1,
        clientX: 0,
        clientY: 0,
      });
      if (movedPx) {
        fireEvent.pointerMove(target, {
          pointerType: "touch",
          pointerId: 1,
          clientX: movedPx,
          clientY: 0,
        });
      }
    }

    it("flags a square on a long press", async () => {
      await renderTouchBoard();

      press(square(0));
      vi.advanceTimersByTime(500);

      expect(square(0)).toHaveAccessibleName("Flagged");
    });

    it("doesn't reveal the square a long press lifts off", async () => {
      await renderTouchBoard();
      press(square(0));
      vi.advanceTimersByTime(500);

      fireEvent.pointerUp(square(0), { pointerType: "touch", pointerId: 1 });
      fireEvent.click(square(0));

      expect(square(0)).toHaveAccessibleName("Flagged");
    });

    it("flags nothing when the finger moves, as it does to scroll", async () => {
      await renderTouchBoard();

      press(square(0), 30);
      vi.advanceTimersByTime(500);

      expect(square(0)).toHaveAccessibleName("Hidden");
    });

    it("leaves a long press the browser reports as a right click to the timer", async () => {
      await renderTouchBoard();
      press(square(0));

      fireEvent.contextMenu(square(0));

      expect(square(0)).toHaveAccessibleName("Hidden");
    });
  });

  describe("on an upright screen", () => {
    beforeEach(() => {
      viewport = installFakeViewport(390, 844);
    });

    it("stands a field wider than tall on end", async () => {
      await renderBoard(["*..", "..."]);

      expect(
        screen.getByRole("grid", { name: "Minefield, 3 rows by 2 columns" }),
      ).toBeInTheDocument();
    });

    it("plays the square shown where it is shown", async () => {
      const user = await renderBoard(["*..", "..."]);

      await user.click(square(1));

      expect(names()).toEqual([
        "Hidden",
        "1",
        "Hidden",
        "Hidden",
        "Hidden",
        "Hidden",
      ]);
    });

    it("leaves a field taller than wide as it is", async () => {
      await renderBoard(["*.", "..", ".."]);

      expect(
        screen.getByRole("grid", { name: "Minefield, 3 rows by 2 columns" }),
      ).toBeInTheDocument();
    });
  });
});
