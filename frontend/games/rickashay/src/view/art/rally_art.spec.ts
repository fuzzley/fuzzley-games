import { COLUMNS } from "@fz/brick-wall/rules/field";
import { DANGER_ROW } from "@fz/brick-wall/rules/wall";
import { type ArtFrame, extentOf, widthOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import { ART_PALETTE, ART_SCALE, billionths } from "../../testing/art_frames";
import {
  DIGITS,
  MOST_DIGITS,
  MOST_WRITTEN,
  RALLY,
  RALLY_FRAMES,
  RALLY_LENGTHS,
  RALLY_PLACE,
  digitAcross,
  digitAt,
  digitFrameOf,
  digitsIn,
  rallyFrames,
} from "./rally_art";

/** The rally's frames in the specs' palette, at their scale. */
const FRAMES = rallyFrames(ART_PALETTE, ART_SCALE);

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

/** Returns the ink of a digit's frame in the specs' palette, at their scale. */
function inkOfDigit(digit: (typeof DIGITS)[number]): ReturnType<typeof inkOf> {
  return inkOf(frameNamed(FRAMES, RALLY_FRAMES.digit(digit)));
}

describe("rallyFrames", () => {
  it("draws each digit", () => {
    expect(FRAMES.map((frame) => frame.name)).toEqual(
      DIGITS.map(RALLY_FRAMES.digit),
    );
  });

  it.each(DIGITS)(
    "draws %i in the rally's color, about its middle, as tall as a digit stands and its line",
    (digit) => {
      const frame = frameNamed(FRAMES, RALLY_FRAMES.digit(digit));
      const line = widthOf(RALLY.line, ART_SCALE);
      const half = (RALLY.height * ART_SCALE.unit + line) / 2;
      const { top, bottom } = inkOf(frame);

      expect({
        colors: new Set(frame.commands.map((command) => command.color)),
        top: billionths(top),
        bottom: billionths(bottom),
      }).toEqual({
        colors: new Set([ART_PALETTE.rally.color]),
        top: billionths(-half),
        bottom: billionths(half),
      });
    },
  );

  it("stands each digit 0.69 units tall to its line's round ends, within a device pixel", () => {
    const { top, bottom } = inkOfDigit(8);

    expect(Math.abs(bottom - top - 0.69 * ART_SCALE.unit)).toBeLessThanOrEqual(
      1,
    );
  });

  it("draws each digit unlike every other", () => {
    const drawings = DIGITS.map((digit) =>
      JSON.stringify(frameNamed(FRAMES, RALLY_FRAMES.digit(digit)).commands),
    );

    expect(new Set(drawings).size).toBe(DIGITS.length);
  });

  it("keeps each digit inside its room, so two side by side stand a twentieth of a unit apart at least", () => {
    const wide = DIGITS.filter((digit) => {
      const { left, right } = inkOfDigit(digit);
      return right - left > (RALLY.pitch - 0.05) * ART_SCALE.unit;
    });

    expect(wide).toEqual([]);
  });

  it("keeps the longest rally inside the field's side walls", () => {
    const length = MOST_DIGITS;
    const { x } = RALLY_PLACE;
    const { left } = inkOfDigit(0);
    const { right } = inkOfDigit(8);

    expect({
      left: x + digitAcross(length, 0) + left / ART_SCALE.unit > 0,
      right:
        x + digitAcross(length, length - 1) + right / ART_SCALE.unit < COLUMNS,
    }).toEqual({ left: true, right: true });
  });

  it("draws a digit's strokes a CSS pixel wide at least", () => {
    const tiny = rallyFrames(ART_PALETTE, { unit: 1, pixelRatio: 3 });
    const widths = frameNamed(tiny, RALLY_FRAMES.digit(1)).commands.flatMap(
      (command) => (command.kind === "line" ? [command.width] : []),
    );

    expect(Math.min(...widths)).toBe(3);
  });
});

describe("digitFrameOf", () => {
  it.each(DIGITS)("names the digit %i", (digit) => {
    expect(digitFrameOf(digit)).toBe(RALLY_FRAMES.digit(digit));
  });
});

describe("MOST_DIGITS", () => {
  it("writes a rally in as many digits as the longest it is written in", () => {
    expect(MOST_DIGITS).toBe(Math.max(...RALLY_LENGTHS));
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
  it("stands a lone digit at the rally's middle", () => {
    expect(digitAcross(1, 0)).toBe(0);
  });

  it("stands two digits a digit's room apart, either side of the rally's middle", () => {
    expect([digitAcross(2, 0), digitAcross(2, 1)]).toEqual([
      -RALLY.pitch / 2,
      RALLY.pitch / 2,
    ]);
  });
});

describe("RALLY_PLACE", () => {
  /** How far a digit's ink reaches up and down from the rally's middle, in field units. */
  const half = (RALLY.height + RALLY.line) / 2;

  it("stands the rally across the field's middle", () => {
    expect(RALLY_PLACE.x).toBe(COLUMNS / 2);
  });

  it("keeps the rally's digits a tenth of a unit and more over the floor", () => {
    expect(RALLY_PLACE.y - half).toBeGreaterThanOrEqual(0.1);
  });

  it("keeps the rally's digits a tenth of a unit and more under the danger line", () => {
    expect(DANGER_ROW - (RALLY_PLACE.y + half)).toBeGreaterThanOrEqual(0.1);
  });
});
