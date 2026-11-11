import { mixColors } from "@fz/phaser/color";
import { type ArtFrame, extentOf, outlineRoundRect } from "@fz/phaser/shapes";
import { drawnIn, frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_FRAMES,
  ART_PALETTE,
  inBillionths,
} from "../../../testing/art_frames";
import type { KindLook } from "../art";
import { atlasFrames } from "../atlas_frames";
import { FRAMES } from "../frames";
import { STEEL_ART } from "./steel";

const STEEL = ART_PALETTE.kinds.steel;

/** The sheen's color: the steel, half white. */
const SHEEN = mixColors(0xffffff, STEEL.body, 0.5);

/** Returns the steel brick's frame at a unit of a number of CSS pixels, 2 device pixels to one. */
function steelAt(css: number): ArtFrame {
  return frameNamed(
    atlasFrames(ART_PALETTE, { unit: css * 2, pixelRatio: 2 }),
    FRAMES.steel,
  );
}

describe("STEEL_ART", () => {
  // A brick that never breaks has no hits, as the rules give it.
  const steel: KindLook = { tint: 0, hits: 0, full: 0, plates: 0 };
  const frame = frameNamed(ART_FRAMES, FRAMES.steel);

  it("shows a steel brick as its one frame", () => {
    expect(STEEL_ART.layersOf(steel)).toEqual(["steel"]);
  });

  it("gives a steel brick's shards the steel", () => {
    expect(STEEL_ART.colorOf(steel, ART_PALETTE)).toBe(STEEL.body);
  });

  it("draws its tile in the steel", () => {
    expect(drawnIn(frame, "roundRect", STEEL.body)).toHaveLength(1);
  });

  it("cuts its frame out in its glyph's color, a band a line wide whose edges lie on whole pixels", () => {
    expect(drawnIn(frame, "polygon", STEEL.glyph)).toEqual([
      outlineRoundRect({ x: 9, y: 9, width: 44, height: 40 }, 0.07 * 62, {
        color: STEEL.glyph,
        width: 2,
      }),
    ]);
  });

  describe("at 72 device pixels a unit, 3 to a CSS pixel, where its frame's line is 3 pixels wide", () => {
    const [bevel] = drawnIn(
      frameNamed(
        atlasFrames(ART_PALETTE, { unit: 72, pixelRatio: 3 }),
        FRAMES.steel,
      ),
      "polygon",
      STEEL.glyph,
    );

    it("draws its frame half a pixel in, so the band's edges are whole", () => {
      expect(bevel).toEqual(
        outlineRoundRect(
          { x: 10.5, y: 10.5, width: 51, height: 46 },
          0.07 * 72,
          { color: STEEL.glyph, width: 3 },
        ),
      );
    });

    it("keeps its frame as far in from its cell's left as from its right, 9 pixels", () => {
      const extent = bevel && inBillionths(extentOf(bevel));

      expect(extent && [extent.x, 72 - extent.x - extent.width]).toEqual([
        9, 9,
      ]);
    });
  });

  it("cuts a rivet out in its glyph's color in each corner of its frame at 31 CSS pixels a unit", () => {
    const rivets = drawnIn(frame, "circle", STEEL.glyph);

    expect(rivets).toMatchObject([
      { x: 0.26 * 62, y: 0.25 * 62, radius: 0.04 * 62 },
      { x: 0.74 * 62, y: 0.25 * 62, radius: 0.04 * 62 },
      { x: 0.26 * 62, y: 0.68 * 62, radius: 0.04 * 62 },
      { x: 0.74 * 62, y: 0.68 * 62, radius: 0.04 * 62 },
    ]);
  });

  it("draws two strokes of sheen across it, half white, three pixels wide", () => {
    expect(drawnIn(frame, "line", SHEEN)).toEqual(
      [
        [0.38, 0.57, 0.56, 0.39],
        [0.5, 0.61, 0.63, 0.48],
      ].map(([fromX = 0, fromY = 0, toX = 0, toY = 0]) => ({
        kind: "line",
        from: { x: fromX * 62, y: fromY * 62 },
        to: { x: toX * 62, y: toY * 62 },
        width: 3,
        color: SHEEN,
      })),
    );
  });

  it("rounds its sheen's ends with a dot each", () => {
    expect(drawnIn(frame, "circle", SHEEN)).toHaveLength(4);
  });

  it("leaves out its rivets at 29 CSS pixels a unit, too small for them", () => {
    expect(drawnIn(steelAt(29), "circle", STEEL.glyph)).toEqual([]);
  });

  it("keeps all but its rivets at 29 CSS pixels a unit", () => {
    expect(steelAt(29).commands.length).toBe(steelAt(31).commands.length - 4);
  });
});
