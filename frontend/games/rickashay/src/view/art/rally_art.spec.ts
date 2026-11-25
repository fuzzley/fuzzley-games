import { COLUMNS } from "@fz/brick-wall/rules/field";
import { DANGER_ROW } from "@fz/brick-wall/rules/wall";
import { type ArtFrame, extentOf } from "@fz/phaser/shapes";
import { frameNamed } from "@fz/phaser/testing/pure";
import {
  ART_PALETTE,
  ART_SCALE,
  PIXEL_RATIOS,
  billionths,
} from "../../testing/art_frames";
import { RALLY_POP } from "../effects/flourish";
import {
  DIGITS,
  type Digit,
  FIRE,
  MOST_DIGITS,
  MOST_TONGUES,
  MOST_WRITTEN,
  RALLY,
  RALLY_FRAMES,
  RALLY_LENGTHS,
  LOOK_LINES,
  RALLY_LOOKS,
  RALLY_PLACE,
  type RallyLook,
  digitAcross,
  digitAt,
  digitFrameOf,
  digitsIn,
  leansLeft,
  rallyFrames,
  rallyLookOf,
  rallyStrength,
  stepsInto,
  tongueAcross,
  tongueHeight,
  tonguesIn,
} from "./rally_art";

/** The rally's frames in the specs' palette, at their scale. */
const FRAMES = rallyFrames(ART_PALETTE, ART_SCALE);

/** How far the danger line reaches under its row at its thickest, solid while the level is in danger, in field units: `@fz/brick-wall`'s scene draws it 0.05 either side. */
const DANGER_REACH = 0.05;

/** Describes the area a drawing covers about its frame's middle, in device pixels. */
interface Ink {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Returns the area a frame's drawing covers, about its middle, in device pixels. */
function inkOf(frame: ArtFrame): Ink {
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

/** Returns a digit's frame in a look, in the specs' palette, at their scale. */
function digitFrame(look: RallyLook, digit: Digit): ArtFrame {
  return frameNamed(FRAMES, RALLY_FRAMES.digit(look, digit));
}

/** Returns a frame with none of its commands in a color. */
function frameWithout(frame: ArtFrame, color: number): ArtFrame {
  return {
    ...frame,
    commands: frame.commands.filter((command) => command.color !== color),
  };
}

/** Returns the area a digit's ink covers in a look, about its middle, in device pixels, but the cut round it on fire. */
function inkOfDigit(look: RallyLook, digit: Digit): Ink {
  return inkOf(frameWithout(digitFrame(look, digit), ART_PALETTE.rally.cut));
}

/** Returns the colors a frame's commands are drawn in, in turn, each run of one color once. */
function colorsInTurn(frame: ArtFrame): readonly number[] {
  return frame.commands
    .map(({ color }) => color)
    .filter((color, at, colors) => color !== colors[at - 1]);
}

/** Returns the widths of a frame's lines, each once, the widest first. */
function linesIn(frame: ArtFrame): readonly number[] {
  const widths = frame.commands.flatMap((command) =>
    command.kind === "line" ? [command.width] : [],
  );
  return [...new Set(widths)].sort((one, other) => other - one);
}

/** Returns how far a look's ink reaches up and down from a digit's middle, in field units, but the cut on fire, as its widths read before they round to device pixels. */
function halfTall(look: RallyLook): number {
  const { line, border } = LOOK_LINES[look];
  return RALLY.height / 2 + line / 2 + border;
}

describe("rallyFrames", () => {
  it("draws each digit in each look, then a tongue of the fire", () => {
    expect(FRAMES.map((frame) => frame.name)).toEqual([
      ...RALLY_LOOKS.flatMap((look) =>
        DIGITS.map((digit) => RALLY_FRAMES.digit(look, digit)),
      ),
      RALLY_FRAMES.flame,
    ]);
  });

  it.each([
    ["faint", [ART_PALETTE.rally.color]],
    ["bold", [ART_PALETTE.rally.color]],
    ["bordered", [ART_PALETTE.rally.border, ART_PALETTE.rally.warm]],
    [
      "fire",
      [ART_PALETTE.rally.cut, ART_PALETTE.rally.border, ART_PALETTE.rally.hot],
    ],
  ] as const)(
    "draws each %s digit's strokes in the look's lines, the widest under the next, each color under every stroke's next",
    (look, colors) => {
      expect(
        DIGITS.filter(
          (digit) =>
            JSON.stringify(colorsInTurn(digitFrame(look, digit))) !==
            JSON.stringify(colors),
        ),
      ).toEqual([]);
    },
  );

  it.each([
    ["faint", [6]],
    ["bold", [8]],
    ["bordered", [12, 8]],
    ["fire", [16, 12, 8]],
  ] as const)(
    "strokes a %s digit's lines as wide as the look's line, its border and its cut give, in device pixels",
    (look, widths) => {
      expect(linesIn(digitFrame(look, 8))).toEqual(widths);
    },
  );

  it.each(PIXEL_RATIOS)(
    "borders a digit a CSS pixel wide at least, and cuts it as wide, on the smallest field, at %f to a CSS pixel",
    (pixelRatio) => {
      const scale = { unit: Math.ceil(24 * pixelRatio), pixelRatio };
      const fire = frameNamed(
        rallyFrames(ART_PALETTE, scale),
        RALLY_FRAMES.digit("fire", 1),
      );
      const [cut = 0, border = 0, stroke = 0] = linesIn(fire);

      expect({
        border: (border - stroke) / 2 >= pixelRatio,
        cut: (cut - border) / 2 >= pixelRatio,
      }).toEqual({ border: true, cut: true });
    },
  );

  it.each(RALLY_LOOKS)(
    "draws each %s digit about its middle, as tall as a digit stands and its widest line but the cut",
    (look) => {
      const [widest = NaN] = linesIn(
        frameWithout(digitFrame(look, 8), ART_PALETTE.rally.cut),
      );
      const half = (RALLY.height * ART_SCALE.unit + widest) / 2;
      const tops = DIGITS.map((digit) => {
        const { top, bottom } = inkOfDigit(look, digit);
        return { top: billionths(top), bottom: billionths(bottom) };
      });

      expect(new Set(tops.map((ink) => JSON.stringify(ink)))).toEqual(
        new Set([
          JSON.stringify({
            top: billionths(-half),
            bottom: billionths(half),
          }),
        ]),
      );
    },
  );

  it("stands each thin digit 0.69 units tall to its line's round ends, within a device pixel", () => {
    const { top, bottom } = inkOfDigit("faint", 8);

    expect(Math.abs(bottom - top - 0.69 * ART_SCALE.unit)).toBeLessThanOrEqual(
      1,
    );
  });

  it.each(RALLY_LOOKS)("draws each %s digit unlike every other", (look) => {
    const drawings = DIGITS.map((digit) =>
      JSON.stringify(digitFrame(look, digit).commands),
    );

    expect(new Set(drawings).size).toBe(DIGITS.length);
  });

  it.each(RALLY_LOOKS)(
    "keeps each %s digit inside its room, so two side by side stand a twentieth of a unit apart at least",
    (look) => {
      const wide = DIGITS.filter((digit) => {
        const { left, right } = inkOfDigit(look, digit);
        return right - left > (RALLY.pitch - 0.05) * ART_SCALE.unit;
      });

      expect(wide).toEqual([]);
    },
  );

  it("keeps each digit on fire inside its room, its cut too, so no cut reaches a neighbor's border", () => {
    const wide = DIGITS.filter((digit) => {
      const { left, right } = inkOf(digitFrame("fire", digit));
      return right - left > RALLY.pitch * ART_SCALE.unit;
    });

    expect(wide).toEqual([]);
  });

  it("keeps the longest rally inside the field's side walls", () => {
    const length = MOST_DIGITS;
    const { x } = RALLY_PLACE;
    const { left } = inkOf(digitFrame("fire", 0));
    const { right } = inkOf(digitFrame("fire", 8));

    expect({
      left: x + digitAcross(length, 0) + left / ART_SCALE.unit > 0,
      right:
        x + digitAcross(length, length - 1) + right / ART_SCALE.unit < COLUMNS,
    }).toEqual({ left: true, right: true });
  });

  it("draws a digit's strokes a CSS pixel wide at least", () => {
    const tiny = rallyFrames(ART_PALETTE, { unit: 1, pixelRatio: 3 });
    const widths = frameNamed(
      tiny,
      RALLY_FRAMES.digit("faint", 1),
    ).commands.flatMap((command) =>
      command.kind === "line" ? [command.width] : [],
    );

    expect(Math.min(...widths)).toBe(3);
  });

  describe("the fire's tongue", () => {
    const flame = frameNamed(FRAMES, RALLY_FRAMES.flame);

    it("fills one tongue of flame in the flame's color", () => {
      expect(
        flame.commands.map(({ kind, color }) => ({ kind, color })),
      ).toEqual([{ kind: "polygon", color: ART_PALETTE.rally.flame }]);
    });

    it("stands its root's middle at its frame's foot, within a device pixel, and rises as tall as the tallest tongue, leaning right", () => {
      const [tongue] = flame.commands;
      const points = tongue?.kind === "polygon" ? tongue.points : [];
      const [rootLeft] = points;
      const rootRight = points.at(-1);
      const top = Math.min(...points.map(({ y }) => y));
      const tip = points.find(({ y }) => y === top);
      const middle = flame.width / 2;

      expect({
        rootMiddle: billionths(
          ((rootLeft?.x ?? NaN) + (rootRight?.x ?? NaN)) / 2,
        ),
        foot: flame.height - (rootLeft?.y ?? NaN) < 1,
        tall: billionths((rootLeft?.y ?? NaN) - (tip?.y ?? NaN)),
        leans: (tip?.x ?? NaN) > middle,
      }).toEqual({
        rootMiddle: billionths(middle),
        foot: true,
        tall: billionths(FIRE.height * ART_SCALE.unit),
        leans: true,
      });
    });
  });
});

describe("rallyLookOf", () => {
  it.each([
    [1, "faint"],
    [9, "faint"],
    [10, "bold"],
    [24, "bold"],
    [25, "bordered"],
    [44, "bordered"],
    [45, "fire"],
    [162, "fire"],
  ] as const)("draws a rally of %i %s", (rally, look) => {
    expect(rallyLookOf(rally)).toBe(look);
  });
});

describe("stepsInto", () => {
  it.each([
    [null, "fire", false],
    ["faint", "faint", false],
    ["faint", "bold", true],
    ["bold", "bordered", true],
    ["bordered", "fire", true],
    ["faint", "fire", true],
    ["fire", "faint", false],
  ] as const)("steps from %s into %s: %s", (shown, look, steps) => {
    expect(stepsInto(shown, look)).toBe(steps);
  });
});

describe("rallyStrength", () => {
  it("shows the thin digits at the palette's strength and every other look's whole", () => {
    expect(RALLY_LOOKS.map((look) => rallyStrength(look, ART_PALETTE))).toEqual(
      [ART_PALETTE.rally.alpha, 1, 1, 1],
    );
  });
});

describe("digitFrameOf", () => {
  it.each(
    RALLY_LOOKS.flatMap((look) =>
      DIGITS.map((digit) => [look, digit] as const),
    ),
  )("names the %s digit %i", (look, digit) => {
    expect(digitFrameOf(look, digit)).toBe(RALLY_FRAMES.digit(look, digit));
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

describe("the fire's tongues", () => {
  it("burns a tongue behind each digit, one between each two and one at either end, as many as the longest rally's at most", () => {
    expect({
      counts: RALLY_LENGTHS.map(tonguesIn),
      most: MOST_TONGUES,
    }).toEqual({ counts: [3, 5, 7, 9], most: tonguesIn(MOST_DIGITS) });
  });

  it("stands two digits' tongues half a digit's room apart about the rally's middle, one behind each digit", () => {
    const across = [0, 1, 2, 3, 4].map((at) => tongueAcross(2, at));

    expect({
      across,
      behindDigits: [across[1], across[3]],
    }).toEqual({
      across: [-0.6, -0.3, 0, 0.3, 0.6],
      behindDigits: [digitAcross(2, 0), digitAcross(2, 1)],
    });
  });

  it("stands the middle tongue tallest, and the ends 0.6 as tall, so the fire mounds behind the number", () => {
    expect(
      [0, 1, 2, 3, 4].map((at) => billionths(tongueHeight(2, at))),
    ).toEqual([0.6, 0.9, 1, 0.9, 0.6].map(billionths));
  });

  it("leans the tongues left of the middle left, and the rest right", () => {
    expect([0, 1, 2, 3, 4].map((at) => leansLeft(2, at))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});

describe("RALLY_PLACE", () => {
  it("stands the rally across the field's middle", () => {
    expect(RALLY_PLACE.x).toBe(COLUMNS / 2);
  });

  it.each(RALLY_LOOKS)(
    "keeps the %s rally's digits a tenth of a unit or more over the floor",
    (look) => {
      expect(RALLY_PLACE.y - halfTall(look)).toBeGreaterThanOrEqual(0.1);
    },
  );

  it.each(RALLY_LOOKS)(
    "keeps the %s rally's digits a tenth of a unit or more under the danger line",
    (look) => {
      expect(
        DANGER_ROW - (RALLY_PLACE.y + halfTall(look)),
      ).toBeGreaterThanOrEqual(0.1);
    },
  );

  it("keeps the rally on fire's cut a twentieth of a unit or more clear of the floor and of the danger line", () => {
    const half = halfTall("fire") + LOOK_LINES.fire.cut;

    expect.soft(RALLY_PLACE.y - half).toBeGreaterThanOrEqual(0.05);
    expect
      .soft(DANGER_ROW - (RALLY_PLACE.y + half))
      .toBeGreaterThanOrEqual(0.05);
  });

  it.each(RALLY_LOOKS)(
    "keeps the %s rally clear of the floor and of the danger line at its thickest as it pops, and its cut in the floor's row",
    (look) => {
      const popped = 1 + RALLY_POP;
      const half = halfTall(look) * popped;
      const cut = (halfTall(look) + LOOK_LINES[look].cut) * popped;

      expect.soft(RALLY_PLACE.y - half).toBeGreaterThanOrEqual(DANGER_REACH);
      expect
        .soft(DANGER_ROW - (RALLY_PLACE.y + half))
        .toBeGreaterThanOrEqual(DANGER_REACH);
      expect.soft(RALLY_PLACE.y - cut).toBeGreaterThanOrEqual(0);
      expect.soft(DANGER_ROW - (RALLY_PLACE.y + cut)).toBeGreaterThanOrEqual(0);
    },
  );

  it("stands the fire's tallest tongue a tenth of a unit or more under the danger line", () => {
    expect(DANGER_ROW - FIRE.height).toBeGreaterThanOrEqual(0.1);
  });
});
