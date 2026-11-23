import { friendInk } from "./inks";

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
