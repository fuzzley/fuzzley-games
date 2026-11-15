import { type GameObjects, Math as PhaserMath } from "phaser";
import type { ArtFrame, DrawCommand, Point } from "../shapes";
import type { AtlasFrame } from "./bake_atlas";

/** Returns a frame drawn in shapes as `bakeAtlas()` draws one: each shape in turn, over those before it, at its alpha. */
export function atlasFrameOf(frame: ArtFrame): AtlasFrame {
  return {
    name: frame.name,
    width: frame.width,
    height: frame.height,
    draw: (graphics) => {
      for (const command of frame.commands) drawShape(graphics, command);
    },
  };
}

/** Draws a shape with a `Graphics`, at its alpha, or opaque where it has none. */
function drawShape(graphics: GameObjects.Graphics, command: DrawCommand): void {
  switch (command.kind) {
    case "rect":
      graphics.fillStyle(command.color, command.alpha);
      graphics.fillRect(command.x, command.y, command.width, command.height);
      return;
    case "roundRect":
      graphics.fillStyle(command.color, command.alpha);
      graphics.fillRoundedRect(
        command.x,
        command.y,
        command.width,
        command.height,
        command.radius,
      );
      return;
    case "circle":
      graphics.fillStyle(command.color, command.alpha);
      graphics.fillCircle(command.x, command.y, command.radius);
      return;
    case "ring":
      graphics.lineStyle(command.width, command.color, command.alpha);
      graphics.strokeCircle(command.x, command.y, command.radius);
      return;
    case "line":
      graphics.lineStyle(command.width, command.color, command.alpha);
      graphics.lineBetween(
        command.from.x,
        command.from.y,
        command.to.x,
        command.to.y,
      );
      return;
    case "polyline":
      graphics.lineStyle(command.width, command.color, command.alpha);
      graphics.strokePoints(vectorsOf(command.points));
      return;
    case "polygon":
      graphics.fillStyle(command.color, command.alpha);
      graphics.fillPoints(vectorsOf(command.points), true);
      return;
  }
}

/** Returns points as the vectors a `Graphics` takes. */
function vectorsOf(points: readonly Point[]): PhaserMath.Vector2[] {
  return points.map((point) => new PhaserMath.Vector2(point.x, point.y));
}
