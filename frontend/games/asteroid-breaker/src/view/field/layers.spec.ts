import { LAYERS, drawnBy } from "./layers";

describe("LAYERS", () => {
  it("lists the layers back to front: the place, a comet's lane, the halos, the tags, a broken rock's dust and shards, the rocks, all that flies among them, the sparks over the pickups, the crew in tow and the muzzle's flash under the ship, the ship, the burrs clinging to it, the flourishes, static's arcs over them, the points, then the frame and the deck", () => {
    expect(LAYERS).toEqual([
      "place",
      "lanes",
      "halos",
      "tags",
      "breaks",
      "rocks",
      "pickups",
      "sparks",
      "strays",
      "hazards",
      "shots",
      "tow",
      "flash",
      "ship",
      "burrs",
      "effects",
      "arcs",
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
      "place",
      "lanes",
      "halos",
      "tags",
      "breaks",
      "rocks",
      "pickups",
      "sparks",
      "strays",
      "hazards",
      "shots",
      "tow",
      "flash",
      "ship",
      "burrs",
      "effects",
      "arcs",
      "points",
    ]);
  });
});
