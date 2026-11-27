// A rim round a drawing, the drawing widened by a width in a color and laid
// under it, so its outline reads where what lies behind it is close to its
// own color: a special's fuzzball against its second fur, and the hint's
// hand and a wave's mark against whatever piece they lie over.

import { type DrawCommand, inset, stroke } from "@fz/phaser/shapes";

/**
 * Returns a drawing widened by a width, in a color, for it to lie on.
 *
 * A line is widened either side, its ends left as they are, as `stroke()`'s
 * round dots end every line the art strokes, and are widened all round.
 */
export function rimOf(
  commands: readonly DrawCommand[],
  width: number,
  color: number,
): readonly DrawCommand[] {
  return commands.flatMap((command): readonly DrawCommand[] => {
    switch (command.kind) {
      case "rect":
        return [{ ...command, ...inset(command, -width), color }];
      case "roundRect":
        return [
          {
            ...command,
            ...inset(command, -width),
            radius: command.radius + width,
            color,
          },
        ];
      case "circle":
        return [{ ...command, radius: command.radius + width, color }];
      case "ring":
      case "line":
      case "polyline":
        return [{ ...command, width: command.width + 2 * width, color }];
      case "polygon":
        return [
          { ...command, color },
          ...stroke([...command.points, ...command.points.slice(0, 1)], {
            color,
            width: 2 * width,
          }),
        ];
    }
  });
}
