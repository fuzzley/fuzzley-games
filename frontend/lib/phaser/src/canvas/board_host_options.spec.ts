import { boardHostOptions } from "./board_host_options";

/** Returns a board's element, told apart from any other by its id. */
function boardElement(): HTMLElement {
  const board = document.createElement("div");
  board.id = "board";
  return board;
}

describe("boardHostOptions", () => {
  it("names the game", () => {
    const board = boardElement();

    expect(boardHostOptions("Snake", board).title).toBe("Snake");
  });

  it("hears the keys only on the board's element", () => {
    const board = boardElement();

    expect(boardHostOptions("Snake", board).config?.input).toMatchObject({
      keyboard: { target: board },
    });
  });

  it("takes the mouse and fingers, and nothing from a gamepad", () => {
    const board = boardElement();

    expect(boardHostOptions("Snake", board).config?.input).toMatchObject({
      mouse: true,
      touch: true,
      gamepad: false,
    });
  });

  it("keeps the browser's menu shut over the board", () => {
    const board = boardElement();

    expect(boardHostOptions("Snake", board).config?.disableContextMenu).toBe(
      true,
    );
  });

  it("shows the page through until the scene draws", () => {
    const board = boardElement();

    expect(boardHostOptions("Snake", board).background).toBe("transparent");
  });
});
