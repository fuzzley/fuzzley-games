import {
  type ArtFrame,
  type ArtScale,
  type Point,
  arcPoints,
  circle,
  polygon,
  star,
  stroke,
} from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  billionths,
} from "../../../testing/art_frames";
import { FRAMES } from "../frames";
import { cellOf } from "../symbols";
import { BOMB_ART } from "./bomb";
import { tileCommands } from "./brick";

const BOMB = ART_PALETTE.kinds.bomb;

/** A palette in which the bomb has inks of its own, each unlike the others and the game's, so a spec sees which it reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  kinds: {
    ...ART_PALETTE.kinds,
    bomb: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
  },
};

/** How a bomb looks as it stands, whole, as it breaks at its first hit. */
const WHOLE = { tint: 0, hits: 1, full: 1, plates: 0 } as const;

/** Returns the bomb's frame in a palette at a scale. */
function bombIn(palette = ART_PALETTE, scale: ArtScale = ART_SCALE): ArtFrame {
  return frameNamed(BOMB_ART.frames(palette, scale), FRAMES.bomb);
}

/** Returns the middles of the circles a frame cuts out in the bomb's glyph at a radius, to a billionth. */
function circlesOf(frame: ArtFrame, radius: number): readonly Point[] {
  return drawnIn(frame, "circle", BOMB.glyph).flatMap((command) =>
    command.kind === "circle" &&
    billionths(command.radius) === billionths(radius)
      ? [{ x: billionths(command.x), y: billionths(command.y) }]
      : [],
  );
}

describe("BOMB_ART", () => {
  const frame = bombIn();

  it("shows a bomb as its one frame", () => {
    expect(BOMB_ART.layersOf(WHOLE)).toEqual(["bomb"]);
  });

  it("gives a bomb's shards its own body's color", () => {
    expect(BOMB_ART.colorOf(WHOLE, OWN_INKS)).toBe(OWN_INKS.kinds.bomb.body);
  });

  it("brings its one frame to the atlas", () => {
    expect(
      BOMB_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual(["bomb"]);
  });

  it("stands on the chunky tile in its own body's color", () => {
    expect(bombIn(OWN_INKS).commands.slice(0, 3)).toEqual(
      tileCommands(cellOf(ART_SCALE), OWN_INKS.kinds.bomb.body),
    );
  });

  it("draws over its tile in its own face's and glyph's colors, and the sparks'", () => {
    const { face, glyph } = OWN_INKS.kinds.bomb;

    expect(
      new Set(
        bombIn(OWN_INKS)
          .commands.slice(3)
          .map(({ color }) => color),
      ),
    ).toEqual(new Set([face, glyph, OWN_INKS.spark]));
  });

  it("cuts its round body out of its tile, below and left of the tile's middle", () => {
    expect(circlesOf(frame, 0.195 * 62)).toEqual([
      { x: billionths(0.46 * 62), y: billionths(0.56 * 62) },
    ]);
  });

  it("cuts a dot toward each brick around it but the top right one, where its spark is", () => {
    const at = (across: number, down: number) => ({
      x: billionths((0.5 + across * 0.33) * 62),
      y: billionths((0.48 + down * 0.31) * 62),
    });

    expect(circlesOf(frame, 0.027 * 62)).toEqual([
      at(-1, -1),
      at(0, -1),
      at(-1, 0),
      at(1, 0),
      at(-1, 1),
      at(0, 1),
      at(1, 1),
    ]);
  });

  it("leaves its dots out at 29 CSS pixels a unit, where 31 shows them", () => {
    expect({
      29: circlesOf(
        bombIn(ART_PALETTE, { unit: 58, pixelRatio: 2 }),
        0.027 * 58,
      ).length,
      31: circlesOf(frame, 0.027 * 62).length,
    }).toEqual({ 29: 0, 31: 7 });
  });

  it("joins its body to its fuse by a neck in its glyph's color, a block 0.14 of the cell by 0.1 turned an eighth of a turn back, toward the fuse", () => {
    const [neck] = drawnIn(frame, "polygon", BOMB.glyph);
    const turned = (across: number, down: number) => ({
      x: billionths((0.612 + (across + down) * Math.SQRT1_2) * 62),
      y: billionths((0.408 + (down - across) * Math.SQRT1_2) * 62),
    });

    expect(
      neck?.kind === "polygon" &&
        neck.points.map(({ x, y }) => ({ x: billionths(x), y: billionths(y) })),
    ).toEqual([
      turned(-0.07, -0.05),
      turned(0.07, -0.05),
      turned(0.07, 0.05),
      turned(-0.07, 0.05),
    ]);
  });

  it("draws after its dots its body, its neck and its fuse in its glyph's color, rounded at the fuse's ends and bend, then the shine on the bomb in its face's, an arc about its middle from 196° to 248°", () => {
    const { face, glyph } = OWN_INKS.kinds.bomb;
    const cut = { color: glyph };
    const middle = { x: 0.46 * 62, y: 0.56 * 62 };
    const neck = [
      [-0.07, -0.05],
      [0.07, -0.05],
      [0.07, 0.05],
      [-0.07, 0.05],
    ].map(([across = 0, down = 0]) => ({
      x: (0.612 + (across + down) * Math.SQRT1_2) * 62,
      y: (0.408 + (down - across) * Math.SQRT1_2) * 62,
    }));

    expect(bombIn(OWN_INKS).commands.slice(10, -2)).toEqual([
      circle(middle, 0.195 * 62, cut),
      polygon(neck, cut),
      ...stroke(
        [
          { x: 0.63 * 62, y: 0.39 * 62 },
          { x: 0.675 * 62, y: 0.32 * 62 },
          { x: 0.72 * 62, y: 0.275 * 62 },
        ],
        { color: glyph, width: 2 },
      ),
      ...stroke(
        arcPoints(
          middle,
          0.125 * 62,
          (196 * Math.PI) / 180,
          (248 * Math.PI) / 180,
        ),
        { color: face, width: 2 },
      ),
    ]);
  });

  it("draws its fuse 0.036 of a cell wide and its shine 0.034, 5 and 4 pixels at 128 device pixels a unit, 1 to a CSS pixel", () => {
    const large = bombIn(OWN_INKS, { unit: 128, pixelRatio: 1 });
    const { face, glyph } = OWN_INKS.kinds.bomb;
    const widths = (color: number) =>
      new Set(
        drawnIn(large, "line", color).map((command) =>
          command.kind === "line" ? command.width : NaN,
        ),
      );

    expect({ fuse: widths(glyph), shine: widths(face) }).toEqual({
      fuse: new Set([5]),
      shine: new Set([4]),
    });
  });

  it("lights a spark in the sparks' color at its fuse's end, on a larger star cut out of its tile, the last it draws", () => {
    const middle = { x: 0.765 * 62, y: 0.235 * 62 };

    expect(frame.commands.slice(-2)).toEqual([
      polygon(star(middle, 0.15 * 62, 0.064 * 62, 4), { color: BOMB.glyph }),
      polygon(star(middle, 0.105 * 62, 0.036 * 62, 4), {
        color: ART_PALETTE.spark,
      }),
    ]);
  });
});
