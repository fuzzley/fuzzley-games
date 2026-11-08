import { readNamedRects, readRect } from "@fz/dev/board-page";
import type { CssRect } from "./layout";
import { namedRectsAttribute, rectAttribute } from "./rect_attribute";

/** A rectangle whose numbers are each a fraction. */
const FRACTIONAL: CssRect = {
  x: 0.1 + 0.2,
  y: 1 / 3,
  width: 260.5,
  height: 299.75,
};

describe("rectAttribute", () => {
  it("writes a rectangle as its x, its y, its width and its height, parted by spaces", () => {
    expect(rectAttribute({ x: 20, y: 25.5, width: 260, height: 300 })).toBe(
      "20 25.5 260 300",
    );
  });

  it.each<[string, CssRect]>([
    ["whole numbers", { x: 20, y: 25, width: 260, height: 300 }],
    ["fractions", FRACTIONAL],
    ["numbers past the canvas", { x: -12.5, y: -3, width: 1e21, height: 5e-7 }],
  ])(
    "writes a rectangle of %s as the layout check reads it back",
    (_, rect) => {
      expect(readRect(rectAttribute(rect))).toEqual(rect);
    },
  );

  it("writes a rectangle not yet laid out as one the layout check reads as none", () => {
    const unlaid = { x: NaN, y: NaN, width: NaN, height: NaN };

    expect(readRect(rectAttribute(unlaid))).toBeNull();
  });
});

describe("namedRectsAttribute", () => {
  /** A rectangle of whole numbers, for a spec that needs one to list. */
  const STICK: CssRect = { x: 0, y: 600, width: 180, height: 200 };

  it("writes each rectangle after its name, in their order, parted by commas", () => {
    const listed = namedRectsAttribute([
      ["stick", STICK],
      ["buttons", { x: 180, y: 600, width: 180.5, height: 200 }],
    ]);

    expect(listed).toBe("stick 0 600 180 200, buttons 180 600 180.5 200");
  });

  it("keeps a name that reads as a number where it is listed", () => {
    const listed = namedRectsAttribute([
      ["stick", STICK],
      ["2", STICK],
    ]);

    expect(listed).toBe("stick 0 600 180 200, 2 0 600 180 200");
  });

  it("writes named rectangles as the layout check reads them back", () => {
    const read = readNamedRects(
      namedRectsAttribute([
        ["stick", STICK],
        ["buttons", FRACTIONAL],
      ]),
    );

    expect(read.map(({ name, rect }) => ({ name, rect }))).toEqual([
      { name: "stick", rect: STICK },
      { name: "buttons", rect: FRACTIONAL },
    ]);
  });

  it("writes nothing for no rectangles", () => {
    expect(namedRectsAttribute([])).toBe("");
  });

  it.each([
    ["nothing", ""],
    ["two words", "left stick"],
    ["a tab", "left\tstick"],
    ["a comma", "stick,buttons"],
  ])(
    "throws for a name of %s, which the list couldn't be read back by",
    (_, name) => {
      expect(() =>
        namedRectsAttribute([
          ["buttons", FRACTIONAL],
          [name, STICK],
        ]),
      ).toThrow(`not "${name}"`);
    },
  );
});
