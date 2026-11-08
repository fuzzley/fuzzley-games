import { cssHex } from "@fz/phaser/color";
import { drawCanvasTexture } from "@fz/phaser/scene";
import type { Scene } from "phaser";
import {
  type PointsLettering,
  letterPoints,
  letteringFont,
  packPoints,
} from "../view/art/points_art";
import type { BeltPalette } from "../view/colors/palette";

/** The points' atlas's texture key, which each label of points is stamped from. */
export const POINTS_ATLAS = "belt-points";

/**
 * Letters the points into an atlas of their own, from what a canvas
 * measures of their font: each character written as a canvas writes it,
 * filled and outlined, at each step of a pixel ({@link packPoints}).
 */
export class PointsAtlas {
  /**
   * Measures the font, on a canvas of its own: one of Phaser's pool would go
   * on to a texture with the context made here, which draws unlike the one
   * a texture makes for itself.
   */
  private readonly measuring: CanvasRenderingContext2D;

  /**
   * Takes the scene whose textures hold the atlas.
   *
   * @throws {Error} Where the page has no canvas to measure the points with.
   */
  constructor(private readonly scene: Scene) {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("No canvas to measure the points with.");
    this.measuring = context;
  }

  /**
   * Letters the points in a family at a unit, in a palette, into the atlas,
   * and returns how they are lettered.
   */
  bake(family: string, unit: number, palette: BeltPalette): PointsLettering {
    const { measuring } = this;
    measuring.font = letteringFont(family, unit);
    const lettering = letterPoints(family, unit, (text) =>
      measuring.measureText(text),
    );
    const { width, height, frames } = packPoints(lettering);
    const texture = drawCanvasTexture(
      this.scene,
      POINTS_ATLAS,
      width,
      height,
      (context) => {
        // As Phaser's `Text` writes a line: its outline's joins and ends round.
        context.font = lettering.font;
        context.textAlign = "left";
        context.textBaseline = "alphabetic";
        context.lineWidth = lettering.outline;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.fillStyle = cssHex(palette.shot);
        context.strokeStyle = cssHex(palette.outline);
        for (const { character, outlined, penX, penY } of frames) {
          if (outlined) context.strokeText(character, penX, penY);
          else context.fillText(character, penX, penY);
        }
      },
    );
    for (const frame of frames) {
      const { name, x, y } = frame;
      if (texture.has(name)) {
        texture.get(name).setSize(frame.width, frame.height, x, y);
      } else {
        texture.add(name, 0, x, y, frame.width, frame.height);
      }
    }
    return lettering;
  }
}
