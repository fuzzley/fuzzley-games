import {
  type LineCommand,
  ORIGIN,
  type PolygonCommand,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  billionths,
  pointInBillionths,
} from "../../../testing/art_frames";
import { brickColor } from "../../colors/brick_colors";
import { FRAMES } from "../frames";
import { PLAIN_ART } from "./brick";
import { SPRING_ART } from "./spring";

/** A spring brick, whole, in a row of the fourth ink. */
const BRICK = { tint: 3, hits: 1, full: 1, plates: 0 };

/** The spring brick's coil at 31 CSS pixels a unit, 2 device pixels to one, a cell of 62. */
const COIL = frameNamed(
  SPRING_ART.frames(ART_PALETTE, ART_SCALE),
  FRAMES.spring,
);

/** Returns the straight lines a frame of the coil draws, its plates. */
function platesIn(commands: typeof COIL.commands): readonly LineCommand[] {
  return commands.filter(
    (command): command is LineCommand => command.kind === "line",
  );
}

/** Returns the band a frame of the coil fills, its zigzag, failing the spec where it has none. */
function zigzagIn(commands: typeof COIL.commands): PolygonCommand {
  const [band] = commands.filter(
    (command): command is PolygonCommand => command.kind === "polygon",
  );
  if (band === undefined) throw new Error("The coil has no zigzag");
  return band;
}

describe("SPRING_ART's layers", () => {
  it("shows a spring brick as the pink tile and its coil, whatever its row's ink", () => {
    expect(SPRING_ART.layersOf(BRICK)).toEqual(["tile-7", "spring"]);
  });

  it("finds a brick's layers without making them", () => {
    expect(SPRING_ART.layersOf(BRICK)).toBe(SPRING_ART.layersOf(BRICK));
  });

  it("stands it on a tile in the spring brick's own color, which its shards take", () => {
    const [tile] = SPRING_ART.layersOf(BRICK);

    const [, body] = frameNamed(
      PLAIN_ART.frames(ART_PALETTE, ART_SCALE),
      tile,
    ).commands;

    expect(body?.color).toBe(
      brickColor({ kind: "spring", tint: BRICK.tint }, ART_PALETTE),
    );
  });
});

describe("SPRING_ART's frame", () => {
  it("brings one frame, the coil, a cell", () => {
    expect(
      SPRING_ART.frames(ART_PALETTE, ART_SCALE).map(
        ({ name, width, height }) => [name, width, height],
      ),
    ).toEqual([["spring", 62, 62]]);
  });

  it("cuts the coil out in the marks' color: its top plate, a line round at its ends, the zigzag's band, and its foot, with nothing else", () => {
    expect(COIL.commands.map(({ kind, color }) => [kind, color])).toEqual(
      ["line", "circle", "circle", "polygon", "line", "circle", "circle"].map(
        (kind) => [kind, ART_PALETTE.mark],
      ),
    );
  });

  it("lays its top plate and its foot across its cell's middle, 0.38 of it wide, at 0.24 and 0.72 of the way down, as the art's", () => {
    expect(
      platesIn(COIL.commands).map(({ from, to }) => [
        pointInBillionths(from),
        pointInBillionths(to),
      ]),
    ).toEqual(
      [14.88, 44.64].map((y) => [
        { x: billionths(31 - 11.78), y: billionths(y) },
        { x: billionths(31 + 11.78), y: billionths(y) },
      ]),
    );
  });

  // The band's points run along its left side and back along its right,
  // so each point of its line lies halfway between a point and its pair.
  it("zigzags between them in 4 turns, out to its right first and then to either side in turn, as the art's", () => {
    const { points } = zigzagIn(COIL.commands);

    const line = points
      .slice(0, points.length / 2)
      .map((point, i) => {
        const pair = points[points.length - 1 - i] ?? point;
        return { x: (point.x + pair.x) / 2, y: (point.y + pair.y) / 2 };
      })
      .map(pointInBillionths);

    expect(line).toEqual(
      [
        [31, 14.88],
        [42.78, 20.832],
        [19.22, 26.784],
        [42.78, 32.736],
        [19.22, 38.688],
        [31, 44.64],
      ].map(([x = 0, y = 0]) => pointInBillionths({ x, y })),
    );
  });

  // The band's last end is cut square across its line, so it is as long
  // as the band is wide.
  it("draws its plates and its zigzag 4 device pixels wide at 31 CSS pixels a unit, the art's line", () => {
    const { points } = zigzagIn(COIL.commands);
    const half = points.length / 2;
    const [from = ORIGIN, to = ORIGIN] = points.slice(half - 1, half + 1);

    expect([
      ...platesIn(COIL.commands).map(({ width }) => width),
      billionths(Math.hypot(to.x - from.x, to.y - from.y)),
    ]).toEqual([4, 4, 4]);
  });

  it("draws its plates 0.064 of a unit wide, to the nearest device pixel: 8 at 123 pixels a unit, 1 to a CSS pixel", () => {
    const large = SPRING_ART.frames(ART_PALETTE, { unit: 123, pixelRatio: 1 });

    expect(
      platesIn(frameNamed(large, FRAMES.spring).commands).map(
        ({ width }) => width,
      ),
    ).toEqual([8, 8]);
  });

  it("cuts the zigzag's first end level, along its top plate", () => {
    const { points } = zigzagIn(COIL.commands);
    const [first = ORIGIN, last = ORIGIN] = [points[0], points.at(-1)];

    expect(billionths(first.y)).toBe(billionths(last.y));
  });

  it("draws the coil whole at 29 CSS pixels a unit, under the detail rule, since it is what tells the kind", () => {
    const small = SPRING_ART.frames(ART_PALETTE, { unit: 58, pixelRatio: 2 });

    expect(frameNamed(small, FRAMES.spring).commands).toHaveLength(
      COIL.commands.length,
    );
  });
});
