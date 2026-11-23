import { COLUMNS } from "@fz/brick-wall/rules/field";
import { type ArtFrame, extentOf, widthOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE, billionths } from "../../testing/art_frames";
import {
  DIGIT,
  DIGITS,
  MOST_DIGITS,
  MOST_WRITTEN,
  PILL,
  PILL_FRAMES,
  PILL_LENGTHS,
  digitAcross,
  digitAt,
  digitFrameOf,
  digitsIn,
  pillFrameOf,
  pillFrames,
  pillPlace,
  pillWidth,
} from "./pill_art";

/** The pill's frames in the specs' palette, at their scale. */
const FRAMES = pillFrames(ART_PALETTE, ART_SCALE);

/** The depth of the field the specs place the pill on. */
const DEPTH = 11;

/** Returns where the pill of a rally stands beside a fuzzball at a place, to a billionth. */
function placeOf(x: number, y: number, rally = 5): { x: number; y: number } {
  const { x: across, y: up } = pillPlace({ x, y, rally }, DEPTH, {
    x: 0,
    y: 0,
  });
  return { x: billionths(across), y: billionths(up) };
}

/** Returns the area a frame's drawing covers, about its middle, in device pixels. */
function inkOf(frame: ArtFrame): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const areas = frame.commands.map(extentOf);
  return {
    left: Math.min(...areas.map(({ x }) => x)) - frame.width / 2,
    top: Math.min(...areas.map(({ y }) => y)) - frame.height / 2,
    right:
      Math.max(...areas.map(({ x, width }) => x + width)) - frame.width / 2,
    bottom:
      Math.max(...areas.map(({ y, height }) => y + height)) - frame.height / 2,
  };
}

describe("pillFrames", () => {
  it("draws a pill for each count of digits, then each digit", () => {
    expect(FRAMES.map((frame) => frame.name)).toEqual([
      ...PILL_LENGTHS.map(PILL_FRAMES.pill),
      ...DIGITS.map(PILL_FRAMES.digit),
    ]);
  });

  it.each(PILL_LENGTHS)(
    "draws the pill of %i digits as tall as a pill and as wide as they need, round at both ends, in the pill's fill",
    (length) => {
      const pill = frameNamed(FRAMES, PILL_FRAMES.pill(length));
      const wide = pillWidth(length) * ART_SCALE.unit;
      const tall = PILL.height * ART_SCALE.unit;

      expect(pill.commands).toEqual([
        {
          kind: "roundRect",
          x: (pill.width - wide) / 2,
          y: (pill.height - tall) / 2,
          width: wide,
          height: tall,
          radius: tall / 2,
          color: ART_PALETTE.pill.fill,
        },
      ]);
    },
  );

  it.each(DIGITS)(
    "draws %i in the pill's text, about its middle, as tall as a digit stands and its line",
    (digit) => {
      const frame = frameNamed(FRAMES, PILL_FRAMES.digit(digit));
      const line = widthOf(DIGIT.line, ART_SCALE);
      const half = (DIGIT.height * ART_SCALE.unit + line) / 2;
      const { top, bottom } = inkOf(frame);

      expect({
        colors: new Set(frame.commands.map((command) => command.color)),
        top: billionths(top),
        bottom: billionths(bottom),
      }).toEqual({
        colors: new Set([ART_PALETTE.pill.text]),
        top: billionths(-half),
        bottom: billionths(half),
      });
    },
  );

  it("draws each digit unlike every other", () => {
    const drawings = DIGITS.map((digit) =>
      JSON.stringify(frameNamed(FRAMES, PILL_FRAMES.digit(digit)).commands),
    );

    expect(new Set(drawings).size).toBe(DIGITS.length);
  });

  it("keeps each digit inside its room in the pill, so two side by side never touch", () => {
    const wide = DIGITS.filter((digit) => {
      const { left, right } = inkOf(
        frameNamed(FRAMES, PILL_FRAMES.digit(digit)),
      );
      return right - left >= PILL.pitch * ART_SCALE.unit;
    });

    expect(wide).toEqual([]);
  });

  it("keeps the digits of the widest pill inside its straight sides, clear of its round ends", () => {
    const length = MOST_DIGITS;
    const outmost = digitAcross(length, length - 1) * ART_SCALE.unit;
    const { right } = inkOf(frameNamed(FRAMES, PILL_FRAMES.digit(8)));

    expect(outmost + right).toBeLessThan(
      ((pillWidth(length) - PILL.height) / 2) * ART_SCALE.unit,
    );
  });

  it("draws a digit's strokes a CSS pixel wide at least", () => {
    const tiny = pillFrames(ART_PALETTE, { unit: 4, pixelRatio: 3 });
    const widths = frameNamed(tiny, PILL_FRAMES.digit(1)).commands.flatMap(
      (command) => (command.kind === "line" ? [command.width] : []),
    );

    expect(Math.min(...widths)).toBe(3);
  });
});

describe("pillFrameOf and digitFrameOf", () => {
  it.each(PILL_LENGTHS)("names the pill of %i digits", (length) => {
    expect(pillFrameOf(length)).toBe(PILL_FRAMES.pill(length));
  });

  it.each(DIGITS)("names the digit %i", (digit) => {
    expect(digitFrameOf(digit)).toBe(PILL_FRAMES.digit(digit));
  });
});

describe("pillWidth", () => {
  it("makes a pill of two digits 1.43 units wide, near the art's 58 of a cell of 40", () => {
    expect(billionths(pillWidth(2))).toBe(1.43);
  });
});

describe("MOST_DIGITS", () => {
  it("holds as many digits as the longest pill", () => {
    expect(MOST_DIGITS).toBe(Math.max(...PILL_LENGTHS));
  });
});

describe("digitsIn", () => {
  it.each([
    [1, 1],
    [9, 1],
    [10, 2],
    [99, 2],
    [100, 3],
    [999, 3],
    [1000, 4],
    [MOST_WRITTEN, 4],
    [MOST_WRITTEN + 1, 4],
  ])("writes a rally of %i in %i digits", (rally, digits) => {
    expect(digitsIn(rally)).toBe(digits);
  });
});

describe("digitAt", () => {
  it("reads a rally's digits from the left", () => {
    expect([0, 1, 2].map((at) => digitAt(307, at))).toEqual([3, 0, 7]);
  });

  it("writes a rally past the most it writes as the most", () => {
    expect([0, 1, 2, 3].map((at) => digitAt(123_456, at))).toEqual([
      9, 9, 9, 9,
    ]);
  });
});

describe("digitAcross", () => {
  it("stands a lone digit at the pill's middle", () => {
    expect(digitAcross(1, 0)).toBe(0);
  });

  it("stands two digits a digit's room apart, either side of the pill's middle", () => {
    expect([digitAcross(2, 0), digitAcross(2, 1)]).toEqual([
      -PILL.pitch / 2,
      PILL.pitch / 2,
    ]);
  });
});

describe("pillPlace", () => {
  const over = PILL.over + PILL.height / 2;

  it("stands the pill beside the fuzzball on its right and over its middle, its near end and its foot clear of it", () => {
    expect(placeOf(3, 4)).toEqual({
      x: billionths(3 + PILL.beside + pillWidth(1) / 2),
      y: billionths(4 + over),
    });
  });

  it("stands it on the fuzzball's left where the right wall would cut it", () => {
    const x = COLUMNS - PILL.beside - pillWidth(1) + 0.01;

    expect(placeOf(x, 4).x).toBe(
      billionths(x - PILL.beside - pillWidth(1) / 2),
    );
  });

  it("stands it on the right where it just reaches the right wall", () => {
    const x = COLUMNS - PILL.beside - pillWidth(1);

    expect(placeOf(x, 4).x).toBe(
      billionths(x + PILL.beside + pillWidth(1) / 2),
    );
  });

  it("stands a wider pill on the fuzzball's left sooner, as its rally takes more digits", () => {
    const x = COLUMNS - PILL.beside - pillWidth(1);

    expect(placeOf(x, 4, 150).x).toBe(
      billionths(x - PILL.beside - pillWidth(3) / 2),
    );
  });

  it("stands it under the fuzzball's middle where the ceiling would cut it", () => {
    const y = DEPTH - PILL.over - PILL.height + 0.01;

    expect(placeOf(3, y).y).toBe(billionths(y - over));
  });

  it("stands it over the fuzzball's middle where it just reaches the ceiling", () => {
    const y = DEPTH - PILL.over - PILL.height;

    expect(placeOf(3, y).y).toBe(billionths(y + over));
  });
});
