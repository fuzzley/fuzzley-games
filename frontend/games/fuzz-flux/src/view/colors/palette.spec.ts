import { pieceInks } from "./inks";
import { BOARD_ROLES, type BoardRoles, boardPalette } from "./palette";

// Each role differs from the others, from white and black, and from every
// color mixed from them, so a color drawn from the wrong one shows.
const ROLES: BoardRoles = {
  page: "#fafafa",
  panel: "#f0f0f0",
  text: "#101010",
  muted: "#707070",
  warning: "#ffa500",
};

describe("boardPalette", () => {
  it("lays the board on the page, each square a well in the panel", () => {
    const { page, square } = boardPalette(ROLES, "light");

    expect({ page, square }).toEqual({ page: 0xfafafa, square: 0xf0f0f0 });
  });

  it.each([
    ["light", 0xe7e7e7, 0xdedede],
    ["dark", 0xe0e0e0, 0xd5d5d5],
  ] as const)(
    "washes the text over the square for dust in a %s palette, more for thick dust",
    (mode, dust, thick) => {
      expect(boardPalette(ROLES, mode).dust).toEqual({ 1: dust, 2: thick });
    },
  );

  it("specks dust in the muted text", () => {
    expect(boardPalette(ROLES, "light").specks).toBe(0x707070);
  });

  it("draws a light palette's frizzball half way from the text to the muted text, its eyes in the page's color holding pupils in the text, glinting in the page's color", () => {
    expect(boardPalette(ROLES, "light").frizzball).toEqual({
      body: 0x404040,
      eyes: 0xfafafa,
      pupils: 0x101010,
      glint: 0xfafafa,
    });
  });

  it("draws a dark palette's frizzball in the text, its eyes in the page's color with no pupils, glinting in the text", () => {
    expect(boardPalette(ROLES, "dark").frizzball).toEqual({
      body: 0x101010,
      eyes: 0xfafafa,
      pupils: undefined,
      glint: 0x101010,
    });
  });

  it("draws the sparks in the warning color", () => {
    expect(boardPalette(ROLES, "light").spark).toBe(0xffa500);
  });

  it("draws the hint's hand and a wave's mark in the text", () => {
    expect(boardPalette(ROLES, "light").marks).toBe(0x101010);
  });

  it("draws a line of wind in the muted text", () => {
    expect(boardPalette(ROLES, "dark").gust).toBe(0x707070);
  });

  it.each(["light", "dark"] as const)(
    "trims the sleepyhead's nightcap in the text in a %s palette",
    (mode) => {
      expect(boardPalette(ROLES, mode).nightcapTrim).toBe(0x101010);
    },
  );

  it.each(["light", "dark"] as const)(
    "takes in the pieces' inks of a %s palette",
    (mode) => {
      expect(boardPalette(ROLES, mode)).toMatchObject(pieceInks(mode));
    },
  );
});

describe("BOARD_ROLES", () => {
  it("reads each of the board's colors from the page's role of its name", () => {
    expect(BOARD_ROLES).toEqual({
      page: "page",
      panel: "panel",
      text: "text",
      muted: "muted",
      warning: "warning",
    });
  });
});
