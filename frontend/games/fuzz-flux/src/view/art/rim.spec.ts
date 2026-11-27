import {
  circle,
  line,
  polygon,
  polyline,
  rect,
  ring,
  roundRect,
} from "@fz/phaser/shapes";
import { rimOf } from "./rim";

describe("rimOf", () => {
  it("widens each shape by the width it is handed, a line either side, in a color, keeping its alpha", () => {
    const area = { x: 0, y: 0, width: 4, height: 2 };

    expect(
      rimOf(
        [
          rect(area, { color: 1, alpha: 0.5 }),
          roundRect(area, 1, { color: 1 }),
          circle({ x: 0, y: 0 }, 2, { color: 1 }),
          ring({ x: 0, y: 0 }, 2, { color: 1, width: 1 }),
          line({ x: 0, y: 0 }, { x: 1, y: 0 }, { color: 1, width: 1 }),
          polyline([{ x: 0, y: 0 }], { color: 1, width: 1 }),
        ],
        1,
        9,
      ),
    ).toEqual([
      rect({ x: -1, y: -1, width: 6, height: 4 }, { color: 9, alpha: 0.5 }),
      roundRect({ x: -1, y: -1, width: 6, height: 4 }, 2, { color: 9 }),
      circle({ x: 0, y: 0 }, 3, { color: 9 }),
      ring({ x: 0, y: 0 }, 2, { color: 9, width: 3 }),
      line({ x: 0, y: 0 }, { x: 1, y: 0 }, { color: 9, width: 3 }),
      polyline([{ x: 0, y: 0 }], { color: 9, width: 3 }),
    ]);
  });

  it("widens a polygon by a line round its edge twice the width wide", () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 4 },
    ];

    const [filled, ...edge] = rimOf([polygon(corners, { color: 1 })], 1, 9);

    expect({
      filled,
      edge: edge.map((command) => [command.kind, command.color]),
      widths: new Set(
        edge.flatMap((command) =>
          command.kind === "line" ? [command.width] : [],
        ),
      ),
    }).toEqual({
      filled: polygon(corners, { color: 9 }),
      edge: [
        ["line", 9],
        ["line", 9],
        ["line", 9],
        ["circle", 9],
        ["circle", 9],
        ["circle", 9],
        ["circle", 9],
      ],
      widths: new Set([2]),
    });
  });
});
