import { LAYERS, depthOf } from "./layers";

describe("depthOf", () => {
  it("draws each layer in front of those before it in the list", () => {
    const depths = LAYERS.map(depthOf);

    expect(depths).toEqual(LAYERS.map((_, i) => i));
  });

  it("draws the field at the back and the tags at the front", () => {
    expect([depthOf("field"), depthOf("tags")]).toEqual([0, LAYERS.length - 1]);
  });

  it.each(["bricks", "effects", "capsules", "bolts", "paddle"] as const)(
    "draws the balls in front of the %s, so nothing hides them",
    (layer) => {
      expect(depthOf("balls")).toBeGreaterThan(depthOf(layer));
    },
  );
});
