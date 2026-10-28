import { fadeTo, snakePalette } from "./palette";

const ROLES = {
  panel: "#ffffff",
  text: "#000000",
  accent: "#00ff00",
  danger: "#ff0000",
};

describe("snakePalette", () => {
  it("draws the board in the palette's roles, as numbers", () => {
    expect(snakePalette(ROLES)).toEqual({
      board: 0xffffff,
      checker: 0xf7f7f7,
      wall: 0xcccccc,
      snake: 0x00ff00,
      head: 0x00bf00,
      eye: 0xffffff,
      apple: 0xff0000,
      leaf: 0x00ff00,
      faded: 0xa6ffa6,
    });
  });
});

describe("fadeTo", () => {
  it.each([
    [0, 0x000000],
    [0.5, 0x808080],
    [1, 0xffffff],
    [-1, 0x000000],
    [2, 0xffffff],
  ])("fades %f of the way", (fade, color) => {
    expect(fadeTo(0x000000, 0xffffff, fade)).toBe(color);
  });
});
