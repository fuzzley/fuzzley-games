import { colorNumber, mixColors } from "./color";

describe("colorNumber", () => {
  it("reads six hex digits", () => {
    const color = colorNumber("#2f7d4f");

    expect(color).toBe(0x2f7d4f);
  });

  it("reads three hex digits, each doubled", () => {
    const color = colorNumber("#fA0");

    expect(color).toBe(0xffaa00);
  });

  it("reads a value with the space a computed style leaves around it", () => {
    const color = colorNumber(" #102030 ");

    expect(color).toBe(0x102030);
  });

  it.each(["", "red", "#12345", "rgb(1, 2, 3)", "#ggg"])(
    "refuses %j, which is not a color in hex",
    (css) => {
      expect(() => colorNumber(css)).toThrow("Not a color in hex");
    },
  );
});

describe("mixColors", () => {
  it("returns the color under for a weight of 0", () => {
    const color = mixColors(0xffffff, 0x123456, 0);

    expect(color).toBe(0x123456);
  });

  it("returns the color on top for a weight of 1", () => {
    const color = mixColors(0x123456, 0xffffff, 1);

    expect(color).toBe(0x123456);
  });

  it("mixes each channel by the weight, rounding as the browser does", () => {
    // White at 3% over black, as a wash of white text over a black panel.
    const color = mixColors(0xffffff, 0x000000, 0.03);

    expect(color).toBe(0x080808);
  });

  it("mixes the channels apart", () => {
    const color = mixColors(0xff0000, 0x0000ff, 0.5);

    expect(color).toBe(0x800080);
  });
});
