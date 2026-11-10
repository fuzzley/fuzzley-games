import { TILE_INKS } from "@fz/phaser/color";
import { TINT, type TintName, friendInk, inkAt } from "./inks";

describe("TINT", () => {
  it.each([
    ["red", 0xd4322d, 0xec5b56],
    ["orange", 0xb9530f, 0xe46612],
    ["amber", 0x936908, 0xc38b0a],
    ["green", 0x29803f, 0x28a046],
    ["teal", 0x167e7b, 0x169b97],
    ["blue", 0x256fd1, 0x458cea],
    ["violet", 0x8b55d2, 0xa573e6],
    ["pink", 0xcb3087, 0xe457a6],
  ] satisfies readonly (readonly [TintName, number, number])[])(
    "names the tiles' %s ink in both modes",
    (name, light, dark) => {
      const at = TINT[name];

      expect([TILE_INKS.light[at], TILE_INKS.dark[at]]).toEqual([light, dark]);
    },
  );
});

describe("inkAt", () => {
  it("gives the ink at a place in a list", () => {
    expect(inkAt([0x111111, 0x222222], 1)).toBe(0x222222);
  });

  it.each([-1, 2, 1.5])("refuses place %s, which the list hasn't", (at) => {
    expect(() => inkAt([0x111111, 0x222222], at)).toThrow(RangeError);
  });
});

describe("friendInk", () => {
  it.each([
    ["light", 0x0f8378],
    ["dark", 0x3fd2c2],
  ] as const)("gives a friend its ink in a %s palette", (mode, color) => {
    expect(friendInk(4, mode)).toBe(color);
  });

  it.each([-1, 8])("refuses ink %s, which no friend has", (ink) => {
    expect(() => friendInk(ink, "dark")).toThrow(RangeError);
  });
});
