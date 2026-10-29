import { LAYERS, depthOf } from "./layers";

describe("depthOf", () => {
  it("draws each layer in front of those before it in the list", () => {
    const depths = LAYERS.map(depthOf);

    expect(depths).toEqual(LAYERS.map((_, i) => i));
  });

  it("draws the field at the back", () => {
    expect(depthOf("field")).toBe(0);
  });

  it("draws the balls at the front, so nothing hides them", () => {
    expect(depthOf("balls")).toBe(LAYERS.length - 1);
  });
});
