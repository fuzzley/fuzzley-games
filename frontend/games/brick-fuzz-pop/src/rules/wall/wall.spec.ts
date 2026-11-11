import { isDepth, thirdsOf } from "./wall";

describe("thirdsOf", () => {
  // plan.md's table in "The wall": a depth, its jump, and the row a wall
  // opens on and a jump lands it on.
  it.each([
    [11, 3, 5],
    [12, 3, 6],
    [13, 4, 5],
    [14, 4, 6],
    [15, 4, 7],
    [16, 5, 6],
    [17, 5, 7],
    [18, 5, 8],
    [19, 6, 7],
    [20, 6, 8],
    [21, 6, 9],
    [22, 7, 8],
  ])(
    "gives a field %s deep a jump of %s rows, its wall opening on row %s",
    (depth, jump, opensOn) => {
      expect(thirdsOf(depth)).toEqual({
        depth,
        jump,
        jumpLine: depth - jump,
        opensOn,
      });
    },
  );

  it("runs the jump line under the top third, the jump's rows", () => {
    const { depth, jump, jumpLine } = thirdsOf(16);

    expect(depth - jumpLine).toBe(jump);
  });

  // A jump brings down nothing that stood under the jump line, so a wall it
  // lands stands where a level opens, or higher.
  it("lands a jump from the jump line on the row a level opens on", () => {
    const { jump, jumpLine, opensOn } = thirdsOf(19);

    expect(jumpLine - jump).toBe(opensOn);
  });

  it.each([10, 23, 11.5, Number.NaN])("refuses a depth of %s", (depth) => {
    expect(() => thirdsOf(depth)).toThrow(
      `A field is a whole number from 11 to 22 rows deep, not ${depth}.`,
    );
  });
});

describe("isDepth", () => {
  it.each([11, 16, 22])("takes %s rows as a field's depth", (depth) => {
    expect(isDepth(depth)).toBe(true);
  });

  it.each([10, 23, 11.5, Number.NaN, "11", null])("refuses %o", (value) => {
    expect(isDepth(value)).toBe(false);
  });
});
