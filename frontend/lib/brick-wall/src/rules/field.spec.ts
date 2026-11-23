import {
  COLUMNS,
  DEPTHS,
  FIRST_X,
  LEAST_DEPTH,
  MOST_DEPTH,
  RADIUS,
  SIDE_MARGIN,
  isDepth,
} from "./field";

// The field's numbers are every wall game's; these hold what they must keep.
describe("the field", () => {
  it("lets a fuzzball through a gap one cell wide", () => {
    expect(2 * RADIUS).toBeLessThan(1);
  });

  it("keeps a waiting fuzzball clear of the side walls", () => {
    expect(SIDE_MARGIN).toBeGreaterThanOrEqual(RADIUS);
  });

  it("starts a level's first shot from the floor's middle", () => {
    expect(FIRST_X).toBe(COLUMNS / 2);
  });

  it("lets a field grow no shallower than it is", () => {
    expect(MOST_DEPTH).toBeGreaterThanOrEqual(LEAST_DEPTH);
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

describe("DEPTHS", () => {
  it("lists every depth a field has, shallowest first", () => {
    expect(DEPTHS).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  });
});
