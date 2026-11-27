import { BRICK_LAYERS, DUST_LAYERS, ELEMENT_IDS } from "./elements";

describe("ELEMENT_IDS", () => {
  it("lists the design's five elements, in the order the levels bring them in", () => {
    expect(ELEMENT_IDS).toEqual([
      "dust",
      "brick",
      "cage",
      "sleepyhead",
      "burr",
    ]);
  });
});

describe("DUST_LAYERS", () => {
  it("counts a square's dust from none to the design's 2 layers", () => {
    expect(DUST_LAYERS).toEqual([0, 1, 2]);
  });
});

describe("BRICK_LAYERS", () => {
  it("counts a brick's layers from the last to the design's 4", () => {
    expect(BRICK_LAYERS).toEqual([1, 2, 3, 4]);
  });
});
