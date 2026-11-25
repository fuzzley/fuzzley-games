import { mixColors } from "@fz/phaser/color";
import type {
  ArtFrame,
  ArtScale,
  CircleCommand,
  LineCommand,
  RectCommand,
} from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
  pointInBillionths,
} from "../../../testing/art_frames";
import {
  FRAMES,
  type FrameName,
  HATCH_HOLDS,
  type HatchHolds,
} from "../frames";
import { HATCH_ART } from "./hatch";

const { steel, mark, chevrons } = ART_PALETTE;

/** A hatch as a level's wall has it, with no hits. */
const WHOLE = { tint: 0, hits: 0, full: 0, plates: 0 };

/** The hatch's frames at 31 CSS pixels a unit, 2 device pixels to one, a cell of 62. */
const FRAMES_DRAWN = HATCH_ART.frames(ART_PALETTE, ART_SCALE);

/** Returns a hatch's frame at 31 CSS pixels a unit. */
function frameOf(name: FrameName): ArtFrame {
  return frameNamed(FRAMES_DRAWN, name);
}

/** Returns the rectangles a frame fills in a color. */
function rectsIn(frame: ArtFrame, color: number): readonly RectCommand[] {
  return frame.commands.filter(
    (command): command is RectCommand =>
      command.kind === "rect" && command.color === color,
  );
}

/** Returns the circles a frame fills in a color. */
function circlesIn(frame: ArtFrame, color: number): readonly CircleCommand[] {
  return frame.commands.filter(
    (command): command is CircleCommand =>
      command.kind === "circle" && command.color === color,
  );
}

/** Returns the straight lines a frame draws, as their ends to a billionth. */
function linesIn(frame: ArtFrame): readonly (readonly object[])[] {
  return frame.commands
    .filter((command): command is LineCommand => command.kind === "line")
    .map(({ from, to }) => [pointInBillionths(from), pointInBillionths(to)]);
}

/** Returns a rectangle's place and size. */
function areaOf({ x, y, width, height }: RectCommand): object {
  return { x, y, width, height };
}

/** Returns every scale from 24 CSS pixels a unit, the least the field is drawn at, to 128 device pixels, the most the atlas is baked at, at a pixel ratio. */
function everyScale(pixelRatio: number): readonly ArtScale[] {
  const least = Math.ceil(24 * pixelRatio);
  return Array.from({ length: 128 - least + 1 }, (_, i) => ({
    unit: least + i,
    pixelRatio,
  }));
}

describe("HATCH_ART's layers", () => {
  it.each([
    [0, "hatch-3"],
    [1, "hatch-2"],
    [2, "hatch-1"],
    [3, "hatch-open"],
  ])(
    "shows a hatch of tint %i, the dots its bar has lost, as %s",
    (tint, frame) => {
      expect(HATCH_ART.layersOf({ ...WHOLE, tint })).toEqual([frame]);
    },
  );

  it("finds a hatch's layers without making them", () => {
    expect(HATCH_ART.layersOf(WHOLE)).toBe(HATCH_ART.layersOf(WHOLE));
  });

  it("refuses a hatch of a tint no look takes", () => {
    expect(() => HATCH_ART.layersOf({ ...WHOLE, tint: 4 })).toThrow(RangeError);
  });
});

describe("HATCH_ART's frames", () => {
  it("brings a bar of 1, 2 and 3 dots and an open hatch, each a cell", () => {
    expect(
      FRAMES_DRAWN.map(({ name, width, height }) => [name, width, height]),
    ).toEqual(
      [...HATCH_HOLDS.map(FRAMES.hatch), FRAMES.hatchOpen].map((name) => [
        name,
        62,
        62,
      ]),
    );
  });

  it.each(HATCH_HOLDS)(
    "lays a bar of %i dots along the top of its cell, the cell's width, 0.02 to 0.2 of the way down, on whole device pixels, as the art's",
    (holds) => {
      expect(rectsIn(frameOf(FRAMES.hatch(holds)), steel).map(areaOf)).toEqual([
        { x: 0, y: 1, width: 62, height: 11 },
      ]);
    },
  );

  it("brightens the bar's top edge with white, and darkens the seam between its leaves with black, as the art's", () => {
    const frame = frameOf(FRAMES.hatch(3));

    expect([
      rectsIn(frame, mixColors(0xffffff, steel, 0.42)).map(areaOf),
      rectsIn(frame, mixColors(0x000000, steel, 0.34)).map(areaOf),
    ]).toEqual([
      [{ x: 0, y: 1, width: 62, height: 3 }],
      [{ x: 30, y: 4, width: 2, height: 8 }],
    ]);
  });

  it.each<[HatchHolds, readonly number[]]>([
    [1, [31]],
    [2, [26.66, 35.34]],
    [3, [22.32, 31, 39.68]],
  ])(
    "cuts %i dots out of the bar in the marks' color, 0.14 of the cell apart about the middle of the bar under its bright edge",
    (holds, xs) => {
      const dots = circlesIn(frameOf(FRAMES.hatch(holds)), mark);

      expect(
        dots.map(({ x, y, radius }) => [x, y, radius].map(billionths)),
      ).toEqual(xs.map((x) => [x, 8, 2.232].map(billionths)));
    },
  );

  it.each([...HATCH_HOLDS.map(FRAMES.hatch), FRAMES.hatchOpen])(
    "draws %s's two chevrons under the bar, pointing up, in the chevrons' color, a line wide, 4 device pixels at 31 CSS pixels a unit",
    (name) => {
      const frame = frameOf(name);
      const lines = frame.commands.filter(
        (command): command is LineCommand => command.kind === "line",
      );

      expect([
        linesIn(frame),
        lines.map(({ color }) => color),
        lines.map(({ width }) => width),
      ]).toEqual([
        [0.6, 0.84].flatMap((down) =>
          [
            [
              [0.33, down],
              [0.5, down - 0.16],
            ],
            [
              [0.5, down - 0.16],
              [0.67, down],
            ],
          ].map((ends) =>
            ends.map(([x = 0, y = 0]) =>
              pointInBillionths({ x: x * 62, y: y * 62 }),
            ),
          ),
        ),
        [chevrons, chevrons, chevrons, chevrons],
        [4, 4, 4, 4],
      ]);
    },
  );

  it("lays the bar, its bright edge, its seam and an open hatch's posts to the art's shares at 123 device pixels a unit too, 1 to a CSS pixel, each on whole pixels", () => {
    const large = HATCH_ART.frames(ART_PALETTE, { unit: 123, pixelRatio: 1 });
    const bar = frameNamed(large, FRAMES.hatch(3));

    expect([
      rectsIn(bar, steel).map(areaOf),
      rectsIn(bar, mixColors(0xffffff, steel, 0.42)).map(areaOf),
      rectsIn(bar, mixColors(0x000000, steel, 0.34)).map(areaOf),
      rectsIn(frameNamed(large, FRAMES.hatchOpen), chevrons).map(areaOf),
    ]).toEqual([
      [{ x: 0, y: 2, width: 123, height: 23 }],
      [{ x: 0, y: 2, width: 123, height: 5 }],
      [{ x: 61, y: 7, width: 2, height: 18 }],
      [
        { x: 0, y: 2, width: 11, height: 62 },
        { x: 112, y: 2, width: 11, height: 62 },
      ],
    ]);
  });

  it("draws an open hatch as two posts against its cell's sides, in the chevrons' color, with no bar", () => {
    const frame = frameOf(FRAMES.hatchOpen);

    expect([
      rectsIn(frame, chevrons).map(areaOf),
      rectsIn(frame, steel),
      circlesIn(frame, mark),
    ]).toEqual([
      [
        { x: 0, y: 1, width: 6, height: 31 },
        { x: 56, y: 1, width: 6, height: 31 },
      ],
      [],
      [],
    ]);
  });
});

describe.each(PIXEL_RATIOS)(
  "HATCH_ART's frames at every unit from 24 CSS pixels to 128 device pixels, %f to a CSS pixel",
  (pixelRatio) => {
    const drawn = everyScale(pixelRatio).map((scale) => ({
      unit: scale.unit,
      frames: HATCH_ART.frames(ART_PALETTE, scale),
    }));

    it("runs the bar the whole width of its cell, so hatches side by side draw one bar", () => {
      const short = drawn.flatMap(({ unit, frames }) =>
        HATCH_HOLDS.flatMap((holds) =>
          rectsIn(frameNamed(frames, FRAMES.hatch(holds)), steel)
            .filter(({ x, width }) => x !== 0 || width !== unit)
            .map(() => unit),
        ),
      );

      expect(short).toEqual([]);
    });

    it("keeps every dot on the bar, under its bright edge", () => {
      const off = drawn.flatMap(({ unit, frames }) => {
        const frame = frameNamed(frames, FRAMES.hatch(3));
        const [bar] = rectsIn(frame, steel);
        const [edge] = rectsIn(frame, mixColors(0xffffff, steel, 0.42));
        const top = (edge?.y ?? 0) + (edge?.height ?? 0);
        const foot = (bar?.y ?? 0) + (bar?.height ?? 0);
        return circlesIn(frame, mark)
          .filter(({ y, radius }) => y - radius < top || y + radius > foot)
          .map(() => unit);
      });

      expect(off).toEqual([]);
    });

    it("draws each of an open hatch's posts a device pixel wide at the least", () => {
      const thin = drawn.flatMap(({ unit, frames }) =>
        rectsIn(frameNamed(frames, FRAMES.hatchOpen), chevrons)
          .filter(({ width }) => width < 1)
          .map(() => unit),
      );

      expect(thin).toEqual([]);
    });

    it("keeps the dots apart", () => {
      const touching = drawn.flatMap(({ unit, frames }) => {
        const [first, second] = circlesIn(
          frameNamed(frames, FRAMES.hatch(3)),
          mark,
        );
        const gap =
          (second?.x ?? 0) -
          (first?.x ?? 0) -
          (first?.radius ?? 0) -
          (second?.radius ?? 0);
        return gap < pixelRatio ? [unit] : [];
      });

      expect(touching).toEqual([]);
    });
  },
);
