import { LAYERS, depthOf } from "./layers";

describe("depthOf", () => {
  it("draws the field at the back", () => {
    expect(depthOf("field")).toBe(0);
  });

  it("draws the ship in front of its shots, and its flourishes in front of it", () => {
    expect([
      depthOf("shots") < depthOf("ship"),
      depthOf("ship") < depthOf("effects"),
    ]).toEqual([true, true]);
  });

  it("draws the rocks behind everything that flies among them", () => {
    const flying = ["pickups", "strays", "hazards", "shots", "ship"] as const;

    expect(flying.every((layer) => depthOf("rocks") < depthOf(layer))).toBe(
      true,
    );
  });

  it("draws the frame and the deck at the front, which nothing on the field hides", () => {
    expect([depthOf("frame"), depthOf("deck")]).toEqual([
      LAYERS.length - 2,
      LAYERS.length - 1,
    ]);
  });
});
