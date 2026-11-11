import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderSoundSprite } from "@fz/dev/sounds";
import spritemap from "../src/scene/sounds/sounds.json";
import { SOUNDS } from "../src/view/effects/effects";
import { RECIPES, SPRITE_FOLDER } from "./build-sounds.mjs";

/** Returns a file of the sprite as it is checked in. */
function spriteFile(name: "sounds.wav" | "sounds.json"): Buffer {
  return readFileSync(join(SPRITE_FOLDER, name));
}

describe("the sounds", () => {
  it("are each made by a recipe of the view's name, in its order", () => {
    expect(RECIPES.map(({ name }) => name)).toEqual(SOUNDS);
  });

  it("loop none, as no key is held to hum", () => {
    expect(
      Object.values(spritemap.spritemap).filter(({ loop }) => loop),
    ).toEqual([]);
  });

  it("are what tools/build-sounds.mjs writes now, to the byte", () => {
    const sprite = renderSoundSprite(RECIPES);

    expect({
      wav: sprite.wav.equals(spriteFile("sounds.wav")),
      json: sprite.json,
    }).toEqual({ wav: true, json: spriteFile("sounds.json").toString("utf8") });
  });
});
