import { LAYERS, drawnBy } from "./layers";

describe("LAYERS", () => {
  it("lists the layers back to front: the field, the tags, the rocks, all that flies among them, the ship, a held hit's flash, the flourishes, the points, then the frame and the deck", () => {
    expect(LAYERS).toEqual([
      "field",
      "tags",
      "rocks",
      "pickups",
      "strays",
      "hazards",
      "shots",
      "ship",
      "flash",
      "effects",
      "points",
      "frame",
      "deck",
    ]);
  });
});

describe("drawnBy", () => {
  it("gives the deck's camera, which stands still, the frame and the deck", () => {
    expect(drawnBy("deck")).toEqual(["frame", "deck"]);
  });

  it("gives the field's camera every other layer, back to front", () => {
    expect(drawnBy("field")).toEqual([
      "field",
      "tags",
      "rocks",
      "pickups",
      "strays",
      "hazards",
      "shots",
      "ship",
      "flash",
      "effects",
      "points",
    ]);
  });
});
