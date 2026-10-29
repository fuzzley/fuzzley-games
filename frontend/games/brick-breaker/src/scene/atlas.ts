import { type AtlasFrame, bakeAtlas } from "@fz/phaser/scene";
import { type GameObjects, Math as PhaserMath, type Scene } from "phaser";
import { atlasFrames } from "../view/art";
import type { BricksPalette } from "../view/palette";
import type { ArtFrame, ArtScale, DrawCommand, Point } from "../view/shapes";

/** The atlas's texture key, which every image on the field shows a frame of. */
export const ATLAS = "bricks-atlas";

/**
 * Bakes every frame the field shows into the atlas, at a scale and in a
 * palette, and returns the frames as the view drew them.
 */
export function bakeBricksAtlas(
  scene: Scene,
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const frames = atlasFrames(palette, scale);
  bakeAtlas(scene, ATLAS, frames.map(atlasFrameOf));
  return frames;
}

/** Returns a frame of the view's art as `bakeAtlas()` draws one. */
function atlasFrameOf(frame: ArtFrame): AtlasFrame {
  return {
    name: frame.name,
    width: frame.width,
    height: frame.height,
    draw: (graphics) => {
      for (const command of frame.commands) play(graphics, command);
    },
  };
}

/** Draws one of the view's commands with a `Graphics`. */
function play(graphics: GameObjects.Graphics, command: DrawCommand): void {
  switch (command.kind) {
    case "rect":
      graphics.fillStyle(command.color);
      graphics.fillRect(command.x, command.y, command.width, command.height);
      return;
    case "roundRect":
      graphics.fillStyle(command.color);
      graphics.fillRoundedRect(
        command.x,
        command.y,
        command.width,
        command.height,
        command.radius,
      );
      return;
    case "circle":
      graphics.fillStyle(command.color);
      graphics.fillCircle(command.x, command.y, command.radius);
      return;
    case "ring":
      graphics.lineStyle(command.width, command.color);
      graphics.strokeCircle(command.x, command.y, command.radius);
      return;
    case "polyline":
      graphics.lineStyle(command.width, command.color);
      graphics.strokePoints(vectorsOf(command.points));
      return;
    case "polygon":
      graphics.fillStyle(command.color);
      graphics.fillPoints(vectorsOf(command.points), true);
      return;
  }
}

/** Returns points as the vectors a `Graphics` takes. */
function vectorsOf(points: readonly Point[]): PhaserMath.Vector2[] {
  return points.map((point) => new PhaserMath.Vector2(point.x, point.y));
}
