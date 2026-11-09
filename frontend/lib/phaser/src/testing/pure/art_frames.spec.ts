import { type ArtFrame, circle, rect } from "../../shapes";
import { drawnIn, frameNamed } from "./art_frames";

const RED = 0xff0000;
const BLUE = 0x0000ff;

const BACK = rect({ x: 0, y: 0, width: 8, height: 8 }, { color: RED });
const FACE = circle({ x: 4, y: 4 }, 3, { color: RED });
const EYE = circle({ x: 4, y: 4 }, 1, { color: BLUE });

const BALL: ArtFrame = {
  name: "ball",
  width: 8,
  height: 8,
  commands: [BACK, FACE, EYE],
};
const TILE: ArtFrame = { name: "tile", width: 8, height: 8, commands: [BACK] };

describe("frameNamed", () => {
  it("finds the frame that has the name", () => {
    expect(frameNamed([BALL, TILE], "tile")).toBe(TILE);
  });

  it("throws, naming it, when no frame has the name", () => {
    expect(() => frameNamed([BALL, TILE], "brick")).toThrow('No frame "brick"');
  });
});

describe("drawnIn", () => {
  it("keeps the commands of the kind that draw in the color", () => {
    expect({
      redCircles: drawnIn(BALL, "circle", RED),
      blueCircles: drawnIn(BALL, "circle", BLUE),
      redRects: drawnIn(BALL, "rect", RED),
      blueRects: drawnIn(BALL, "rect", BLUE),
    }).toEqual({
      redCircles: [FACE],
      blueCircles: [EYE],
      redRects: [BACK],
      blueRects: [],
    });
  });
});
