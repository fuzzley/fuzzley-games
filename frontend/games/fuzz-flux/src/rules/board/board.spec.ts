import { WINDS } from "./board";

describe("WINDS", () => {
  // The design's turning wind: "a quarter counterclockwise every 2, 3 or 4
  // moves: down, right, up, left".
  it("lists the wind's ways in the order it turns, from down", () => {
    expect(WINDS).toEqual(["down", "right", "up", "left"]);
  });
});
