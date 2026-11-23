import { type ArtFrame, type Point, widthOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  billionths,
  octagon,
  pointInBillionths,
} from "../../testing/art_frames";
import { cellOf } from "./cells";
import { dotFrame } from "./field_frames";
import { FRAMES } from "./frames";
import {
  GUIDE_DOT,
  GUIDE_FRAMES,
  GUIDE_RING,
  GUIDE_STRUCK,
  guideFrames,
} from "./guide_frames";
import { CUT_TILE } from "./kinds/brick";

/** The guide's frames in the specs' palette, at their scale. */
const FRAMES_DRAWN = guideFrames(ART_PALETTE, ART_SCALE);

/**
 * Returns a band a frame draws in a color, drawn as steel's `cutOutline()`
 * draws one: one polygon round its outer edge and back round its inner,
 * each edge's corners clockwise from the top of its left side, to a
 * billionth.
 */
function edgesIn(
  frame: ArtFrame,
  color: number,
): { outer: readonly Point[]; inner: readonly Point[] } {
  const band = frame.commands.find(
    (command) => command.kind === "polygon" && command.color === color,
  );
  const points =
    band?.kind === "polygon" ? band.points.map(pointInBillionths) : [];
  // The outer edge's eight corners and its first again, then the inner
  // edge's first, its corners backward and its first again.
  return { outer: points.slice(0, 8), inner: points.slice(10, 18).reverse() };
}

/** Returns the widths of the lines a frame draws. */
function lineWidthsOf(frame: ArtFrame): number[] {
  return frame.commands.flatMap((command) =>
    command.kind === "ring" || command.kind === "line" ? [command.width] : [],
  );
}

describe("guideFrames", () => {
  it("names the guide's dot, its ring and the band round a brick it strikes", () => {
    expect(FRAMES_DRAWN.map((frame) => frame.name)).toEqual([
      FRAMES.guideDot,
      FRAMES.guideRing,
      GUIDE_FRAMES.struck,
    ]);
  });

  it("draws the dot in the guide's color, as wide as a guide's dot", () => {
    expect(frameNamed(FRAMES_DRAWN, FRAMES.guideDot)).toEqual(
      dotFrame(
        FRAMES.guideDot,
        widthOf(GUIDE_DOT, ART_SCALE),
        ART_PALETTE.guide,
      ),
    );
  });

  it("draws the ring about its frame's middle, in the guide's rings' color, its line as the art's", () => {
    const ring = frameNamed(FRAMES_DRAWN, FRAMES.guideRing);

    expect(ring.commands).toEqual([
      {
        kind: "ring",
        x: ring.width / 2,
        y: ring.height / 2,
        radius: GUIDE_RING.radius * ART_SCALE.unit,
        color: ART_PALETTE.guideRing,
        width: widthOf(GUIDE_RING.width, ART_SCALE),
      },
    ]);
  });

  describe("the band round a struck brick", () => {
    const struck = frameNamed(FRAMES_DRAWN, GUIDE_FRAMES.struck);
    const cell = cellOf(ART_SCALE);
    const band = widthOf(GUIDE_STRUCK.band, ART_SCALE);
    const seam = widthOf(GUIDE_STRUCK.seam, ART_SCALE);

    it("is a cell", () => {
      expect([struck.width, struck.height]).toEqual([cell.width, cell.height]);
    });

    it("draws a band of the guide's color along the cell's edge, its corners cut as a tile's", () => {
      expect(edgesIn(struck, ART_PALETTE.guide).outer).toEqual(
        octagon(
          { x: 0, y: 0 },
          { x: cell.width, y: cell.height },
          CUT_TILE.cut * cell.width,
        ),
      );
    });

    it("draws a seam of the field's color right inside the band, a seam wide, which parts it from the tile", () => {
      const seamEdges = edgesIn(struck, ART_PALETTE.field);
      const [first] = seamEdges.inner;

      expect({ joined: seamEdges.outer, left: first?.x }).toEqual({
        joined: edgesIn(struck, ART_PALETTE.guide).inner,
        left: billionths(band + seam),
      });
    });
  });

  it("draws the dot and the ring's line a CSS pixel wide at least", () => {
    const tiny = guideFrames(ART_PALETTE, { unit: 4, pixelRatio: 3 });

    expect({
      dot: frameNamed(tiny, FRAMES.guideDot).width,
      ring: lineWidthsOf(frameNamed(tiny, FRAMES.guideRing)),
    }).toEqual({ dot: 3, ring: [3] });
  });
});
