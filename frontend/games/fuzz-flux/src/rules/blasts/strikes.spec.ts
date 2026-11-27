import { boardFrom } from "../../testing/board_picture";
import { nearestFirst, stepsApart, wholeBoardStrikes } from "./strikes";

describe("nearestFirst", () => {
  it("strikes the squares reached nearest first, and at one step by their indices", () => {
    const board = boardFrom(["rgrg"]);

    expect(
      nearestFirst(board, [
        { square: 3, step: 1 },
        { square: 2, step: 0 },
        { square: 1, step: 1 },
        { square: 0, step: 2 },
      ]),
    ).toEqual([
      { square: 2, step: 0 },
      { square: 1, step: 1 },
      { square: 3, step: 1 },
      { square: 0, step: 2 },
    ]);
  });

  it("strikes a square listed twice once, at the step it is first listed with", () => {
    const board = boardFrom(["rgrg"]);

    expect(
      nearestFirst(board, [
        { square: 1, step: 2 },
        { square: 0, step: 1 },
        { square: 1, step: 0 },
      ]),
    ).toEqual([
      { square: 0, step: 1 },
      { square: 1, step: 2 },
    ]);
  });

  it("passes over a gap", () => {
    const board = boardFrom(["r_g"]);

    expect(
      nearestFirst(board, [
        { square: 0, step: 0 },
        { square: 1, step: 1 },
        { square: 2, step: 2 },
      ]),
    ).toEqual([
      { square: 0, step: 0 },
      { square: 2, step: 2 },
    ]);
  });
});

describe("wholeBoardStrikes", () => {
  it("strikes every open square of a board at its steps across and down from where a blast goes off", () => {
    const board = boardFrom(["rgr", "g_g"]);

    expect(wholeBoardStrikes(board, 1)).toEqual([
      { square: 1, step: 0 },
      { square: 0, step: 1 },
      { square: 2, step: 1 },
      { square: 3, step: 2 },
      { square: 5, step: 2 },
    ]);
  });
});

describe("stepsApart", () => {
  it("counts the steps across and down between two squares, either way", () => {
    expect([
      stepsApart({ x: 1, y: 4 }, { x: 3, y: 1 }),
      stepsApart({ x: 3, y: 1 }, { x: 1, y: 4 }),
    ]).toEqual([5, 5]);
  });
});
