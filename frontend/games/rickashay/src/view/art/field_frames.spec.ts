import { cellArea, dotFrame } from "@fz/brick-wall/view/art";
import {
  type ArtFrame,
  type Point,
  extentOf,
  widthOf,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  billionths,
  octagon,
  pointInBillionths,
} from "../../testing/art_frames";
import { SPRING_UNITS } from "../field/springs";
import {
  COUNT_DOT,
  FIELD_FRAMES,
  GRID_DOT,
  SPRING,
  SQUASHED,
  WARNING_FRAME,
  fieldFrames,
  springFrames,
} from "./field_frames";
import { FRAMES } from "./frames";
import { CUT_TILE } from "./kinds/brick";

/** The field's frames in the specs' palette, at their scale. */
const FIELD = fieldFrames(ART_PALETTE, ART_SCALE);

/** The springs' frames in the specs' palette, at their scale. */
const SPRINGS = springFrames(ART_PALETTE, ART_SCALE);

/** Describes a band drawn as one polygon round its outer edge and back round its inner, as steel's `cutOutline()` draws it: each edge's corners, clockwise from the top of its left side, to a billionth. */
interface Ring {
  readonly outer: readonly Point[];
  readonly inner: readonly Point[];
}

/** Returns the band a frame draws in a color, as {@link Ring} reads it. */
function ringIn(frame: ArtFrame, color: number): Ring {
  const band = frame.commands.find(
    (command) => command.kind === "polygon" && command.color === color,
  );
  const points =
    band?.kind === "polygon" ? band.points.map(pointInBillionths) : [];
  // The outer edge's eight corners and its first again, then the inner
  // edge's first, its corners backward and its first again.
  return { outer: points.slice(0, 8), inner: points.slice(10, 18).reverse() };
}

/** Returns how far down a frame's drawing reaches up, at the least: the top of the area it covers. */
function topOf(frame: ArtFrame): number {
  return Math.min(...frame.commands.map((command) => extentOf(command).y));
}

/** Returns how far down a frame's drawing reaches, at the most: the foot of the area it covers. */
function footOf(frame: ArtFrame): number {
  return Math.max(
    ...frame.commands.map((command) => {
      const { y, height } = extentOf(command);
      return y + height;
    }),
  );
}

describe("fieldFrames", () => {
  it("names the grid's dot, the count's and the warning frame", () => {
    expect(FIELD.map((frame) => frame.name)).toEqual([
      FIELD_FRAMES.gridDot,
      FIELD_FRAMES.countDot,
      FIELD_FRAMES.warning,
    ]);
  });

  it("draws the grid's dot in the field's line, as wide as a grid dot", () => {
    expect(frameNamed(FIELD, FIELD_FRAMES.gridDot)).toEqual(
      dotFrame(
        FIELD_FRAMES.gridDot,
        widthOf(GRID_DOT, ART_SCALE),
        ART_PALETTE.line,
      ),
    );
  });

  it("draws the count's dot in the jump line's color, as wide as a count dot", () => {
    expect(frameNamed(FIELD, FIELD_FRAMES.countDot)).toEqual(
      dotFrame(
        FIELD_FRAMES.countDot,
        widthOf(COUNT_DOT, ART_SCALE),
        ART_PALETTE.jumpLine,
      ),
    );
  });

  it("draws the dots a CSS pixel wide at least", () => {
    const tiny = fieldFrames(ART_PALETTE, { unit: 4, pixelRatio: 3 });

    expect(tiny.slice(0, 2).map((frame) => frame.width)).toEqual([3, 3]);
  });

  describe("the warning frame", () => {
    const warning = frameNamed(FIELD, FIELD_FRAMES.warning);
    const cell = cellArea(ART_SCALE);
    const band = widthOf(WARNING_FRAME.band, ART_SCALE);
    const seam = widthOf(WARNING_FRAME.seam, ART_SCALE);
    // The line the cut across the cell's top left corner runs along, x + y.
    const cutLine = CUT_TILE.cut * cell.width;

    it("is a cell", () => {
      expect([warning.width, warning.height]).toEqual([
        cell.width,
        cell.height,
      ]);
    });

    it("draws a band of the danger line's color round the cell's edge, its corners cut as a tile's", () => {
      expect(ringIn(warning, ART_PALETTE.dangerLine).outer).toEqual(
        octagon({ x: 0, y: 0 }, { x: cell.width, y: cell.height }, cutLine),
      );
    });

    it("draws the band a band's width wide, as wide across a cut as along a side", () => {
      const { inner } = ringIn(warning, ART_PALETTE.dangerLine);
      const [first, second] = inner;

      expect({
        left: first?.x,
        top: second?.y,
        acrossCut: billionths(
          ((first?.x ?? 0) + (first?.y ?? 0) - cutLine) / Math.SQRT2,
        ),
      }).toEqual({ left: band, top: band, acrossCut: billionths(band) });
    });

    it("draws a seam of the field's color right inside the band, a seam wide, so it stands apart from a tile near the danger color", () => {
      const seamRing = ringIn(warning, ART_PALETTE.field);
      const [first] = seamRing.inner;

      expect({
        joined: seamRing.outer,
        left: first?.x,
      }).toEqual({
        joined: ringIn(warning, ART_PALETTE.dangerLine).inner,
        left: band + seam,
      });
    });
  });
});

describe("springFrames", () => {
  const side = widthOf(SPRING_UNITS, ART_SCALE);
  const half = widthOf(SPRING.width * SPRING_UNITS, ART_SCALE) / 2;
  const off = frameNamed(SPRINGS, FRAMES.bounceOff);
  const on = frameNamed(SPRINGS, FRAMES.bounceOn);

  it("draws an unlit spring and a lit one, each a square as wide as a spring is at most", () => {
    expect(
      SPRINGS.map(({ name, width, height }) => ({ name, width, height })),
    ).toEqual([
      { name: FRAMES.bounceOff, width: side, height: side },
      { name: FRAMES.bounceOn, width: side, height: side },
    ]);
  });

  it("draws an unlit spring in the springs' off color and a lit one in their on", () => {
    expect({
      off: new Set(off.commands.map((command) => command.color)),
      on: new Set(on.commands.map((command) => command.color)),
    }).toEqual({
      off: new Set([ART_PALETTE.springs.off]),
      on: new Set([ART_PALETTE.springs.on]),
    });
  });

  it("stands a lit spring from its top plate to its foot, as the art does", () => {
    expect([topOf(on), footOf(on)].map(billionths)).toEqual(
      [SPRING.top * side - half, SPRING.foot * side + half].map(billionths),
    );
  });

  it("squashes an unlit spring on the same foot, so the two differ by their shape and not by their color alone", () => {
    const tall = (SPRING.foot - SPRING.top) * side;

    expect([topOf(off), footOf(off)].map(billionths)).toEqual(
      [
        SPRING.foot * side - SQUASHED * tall - half,
        SPRING.foot * side + half,
      ].map(billionths),
    );
  });

  it("zigzags a spring's turns from side to side between its plates", () => {
    const turns = on.commands.filter(
      (command) =>
        command.kind === "circle" &&
        Math.abs(command.x - SPRING.across * side) > 1 &&
        command.y > SPRING.top * side + 1 &&
        command.y < SPRING.foot * side - 1,
    );

    expect(turns).toHaveLength(SPRING.turns);
  });

  it("draws a spring's line a CSS pixel wide at least", () => {
    const [tiny] = springFrames(ART_PALETTE, { unit: 4, pixelRatio: 3 });
    const widths = (tiny?.commands ?? []).flatMap((command) =>
      command.kind === "line" ? [command.width] : [],
    );

    expect(Math.min(...widths)).toBe(3);
  });
});
