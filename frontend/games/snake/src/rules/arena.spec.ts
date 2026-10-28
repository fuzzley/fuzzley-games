import { landing, onBoard } from "./arena";

describe("arena", () => {
  it.each([
    [{ x: 0, y: 0 }, true],
    [{ x: 4, y: 4 }, true],
    [{ x: -1, y: 0 }, false],
    [{ x: 0, y: -1 }, false],
    [{ x: 5, y: 0 }, false],
    [{ x: 0, y: 5 }, false],
  ])("says whether %o is on a board of 5", (square, on) => {
    expect(onBoard(square, 5)).toBe(on);
  });

  it("lands a step on the board", () => {
    expect(landing({ x: 3, y: 4 }, "right", 5)).toEqual({ x: 4, y: 4 });
  });

  it("lands no step off the board: it runs into the wall", () => {
    expect(landing({ x: 4, y: 4 }, "down", 5)).toBeNull();
  });
});
