import { mixColors } from "@fz/phaser/color";
import {
  type ArtFrame,
  type ArtScale,
  circle,
  extentOf,
  inset,
  line,
  outlineRoundRect,
  polygon,
  roundRect,
  stroke,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE } from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { FRAMES } from "../frames";
import { cellOf, turned } from "../symbols";
import { tileBody, tileRadius } from "./brick";
import { PRISM_ART } from "./prism";

/** A palette in which the prism and its rays have inks of their own, each unlike the others and the game's, so a spec sees which it reads. */
const OWN_INKS = {
  ...ART_PALETTE,
  field: 0x000044,
  rays: [0x000001, 0x000002, 0x000003] as const,
  kinds: {
    ...ART_PALETTE.kinds,
    prism: { body: 0x110000, face: 0x220000, glyph: 0x330000 },
  },
};

const { body, face, glyph } = OWN_INKS.kinds.prism;

/** How a prism looks as it stands, whole, as it breaks at its first hit. */
const WHOLE: KindLook = { tint: 0, hits: 1, full: 1, plates: 0 };

/** Its triangle's corners at 31 CSS pixels a unit, 2 device pixels to one: its top, then its bottom left and right. */
const [TOP, LEFT, RIGHT] = [
  { x: 0.5 * 62, y: 0.37 * 62 },
  { x: 0.24 * 62, y: 0.82 * 62 },
  { x: 0.76 * 62, y: 0.82 * 62 },
] as const;

const TRIANGLE = [TOP, LEFT, RIGHT];

/** Returns the prism's frame in a palette at a scale. */
function prismIn(palette = OWN_INKS, scale: ArtScale = ART_SCALE): ArtFrame {
  return frameNamed(PRISM_ART.frames(palette, scale), FRAMES.prism);
}

/** Returns the widths of the lines a frame draws in a color, each once. */
function widthsIn(frame: ArtFrame, color: number): ReadonlySet<number> {
  return new Set(
    frame.commands.flatMap((command) =>
      command.kind === "line" && command.color === color ? [command.width] : [],
    ),
  );
}

/** Returns the widths of the dots a frame draws in the prism's own glyph's color, at its triangle's corners and where its facets meet, each once. */
function dotsIn(frame: ArtFrame): ReadonlySet<number> {
  return new Set(
    frame.commands.flatMap((command) =>
      command.kind === "circle" && command.color === glyph
        ? [command.radius * 2]
        : [],
    ),
  );
}

describe("PRISM_ART", () => {
  const frame = prismIn();

  it("shows a prism as its one frame", () => {
    expect(PRISM_ART.layersOf(WHOLE)).toEqual(["prism"]);
  });

  it("brings its one frame to the atlas", () => {
    expect(
      PRISM_ART.frames(ART_PALETTE, ART_SCALE).map(({ name }) => name),
    ).toEqual(["prism"]);
  });

  it("fills its glass in its own face's color, outlined 2 pixels wide in its body's, inside the chunky tile's edge", () => {
    const cell = cellOf(ART_SCALE);
    const glass = inset(tileBody(cell), 1);
    const round = tileRadius(cell) - 1;

    expect(frame.commands.slice(0, 2)).toEqual([
      roundRect(glass, round, { color: face }),
      outlineRoundRect(glass, round, { color: body, width: 2 }),
    ]);
  });

  it.each([
    { unit: 63, pixelRatio: 2.625 },
    { unit: 62, pixelRatio: 2 },
    { unit: 128, pixelRatio: 1 },
  ])(
    "reaches its glass's outline to the chunky tile's edge, no further, at $unit device pixels a unit, $pixelRatio to a CSS pixel",
    (scale) => {
      const outline = prismIn(OWN_INKS, scale).commands[1];

      expect(outline && extentOf(outline)).toEqual(tileBody(cellOf(scale)));
    },
  );

  it("leaves three rays from over its triangle's top, up and to the left, straight up and up and to the right, each in the palette's ray of its place, 3 pixels wide and round at its ends", () => {
    const ray = (degrees: number, color: number) =>
      stroke(
        [0.11, 0.27].map((reach) => {
          const way = turned({ x: reach * 62, y: 0 }, degrees);
          return { x: 31 + way.x, y: 0.41 * 62 + way.y };
        }),
        { color, width: 3 },
      );

    expect(frame.commands.slice(2, 11)).toEqual([
      ...ray(-142, 0x000001),
      ...ray(-90, 0x000002),
      ...ray(-38, 0x000003),
    ]);
  });

  it("fills its triangle in its own glyph's color washed 0.3 over the field, outlines it 2 pixels wide in its glyph's, round at its corners, then facets it from inside to each corner", () => {
    const outline = { color: glyph, width: 2 };
    const facets = { color: glyph, width: 2 };
    const meeting = { x: 31, y: 0.67 * 62 };

    expect(frame.commands.slice(11)).toEqual([
      polygon(TRIANGLE, { color: mixColors(glyph, 0x000044, 0.3) }),
      line(TOP, LEFT, outline),
      line(LEFT, RIGHT, outline),
      line(RIGHT, TOP, outline),
      ...TRIANGLE.map((corner) => circle(corner, 1, outline)),
      ...TRIANGLE.map((corner) => line(meeting, corner, facets)),
      circle(meeting, 1, facets),
    ]);
  });

  it("draws its glass's outline 0.03 of a cell wide, its rays 0.054, its triangle's outline 0.04 and its facets 0.026, 4, 7, 5 and 3 pixels at 128 device pixels a unit, 1 to a CSS pixel", () => {
    const scale = { unit: 128, pixelRatio: 1 };
    const large = prismIn(OWN_INKS, scale);
    const cell = cellOf(scale);

    expect({
      glass: large.commands[1],
      rays: widthsIn(large, 0x000002),
      dots: dotsIn(large),
    }).toEqual({
      glass: outlineRoundRect(inset(tileBody(cell), 2), tileRadius(cell) - 2, {
        color: body,
        width: 4,
      }),
      rays: new Set([7]),
      dots: new Set([5, 3]),
    });
  });

  it("draws its facets 3 pixels wide at 100 device pixels a unit, 1 to a CSS pixel, where 0.02 of a cell would be 2", () => {
    expect(dotsIn(prismIn(OWN_INKS, { unit: 100, pixelRatio: 1 }))).toEqual(
      new Set([4, 3]),
    );
  });
});
