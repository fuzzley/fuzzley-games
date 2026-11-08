import { MOST_POINTS_CHARACTERS } from "../effects/flourish";
import {
  type Glyph,
  type MeasuredText,
  PEN_STEPS,
  POINTS_CHARACTERS,
  POINTS_TEXT,
  type PointsCharacter,
  type PointsLayout,
  type PointsLettering,
  layOutPoints,
  letterPoints,
  letteringFont,
  letteringUnit,
  packPoints,
  pointsFace,
  pointsLayout,
  pointsSheet,
} from "./points_art";

/** The font family the specs letter the points in. */
const FAMILY = "Spec Sans";

/** The unit the specs letter the points at, in device pixels. */
const UNIT = 20;

/**
 * The largest unit a field is laid out at, on the largest screen at the
 * largest pixel ratio: 4,800 device pixels on its short side, which is
 * `FIELD_SHORT_SIDE`, 40 units.
 */
const LARGEST_UNIT = 120;

/** The largest texture every device takes, a side. */
const TEXTURE_SIDE = 2048;

/** How many labels of points the scene shows at most at once. */
const LABELS = 12;

/**
 * How the specs' font sets each character, as shares of its size: how far
 * the pen moves past it, how far its ink reaches left of the pen and right
 * of it, and above the baseline and below it.
 */
const SHAPES: Readonly<
  Record<
    PointsCharacter,
    readonly [advance: number, ink: readonly [number, number, number, number]]
  >
> = {
  "0": [0.55, [-0.04, 0.51, 0.7, 0.01]],
  "1": [0.55, [-0.08, 0.4, 0.7, 0]],
  "2": [0.55, [-0.04, 0.5, 0.71, 0]],
  "3": [0.55, [-0.03, 0.51, 0.7, 0.01]],
  "4": [0.55, [-0.02, 0.53, 0.7, 0]],
  "5": [0.55, [-0.04, 0.51, 0.7, 0.01]],
  "6": [0.55, [-0.04, 0.51, 0.7, 0.01]],
  "7": [0.55, [-0.03, 0.5, 0.7, 0]],
  "8": [0.55, [-0.04, 0.51, 0.7, 0.01]],
  "9": [0.55, [-0.04, 0.51, 0.7, 0.01]],
  "+": [0.6, [-0.05, 0.55, 0.55, -0.05]],
  ",": [0.25, [0.02, 0.2, 0.12, 0.16]],
  " ": [0.25, [0, 0, 0, 0]],
  "×": [0.5, [-0.06, 0.44, 0.5, -0.05]],
};

/** How much farther the specs' font sets "1" after "+" than their advance: a kerned pair. */
const PLUS_ONE = -0.05;

/**
 * How far the ink of each character the specs' font sets in no label
 * reaches above the baseline and below it, as shares of its size: as far as
 * any character's in a line.
 */
const LINE = { ascent: 0.9, descent: 0.25 } as const;

/**
 * Labels the points show, the widest and the tallest among them, with
 * "+1,000" and "+88,888", of commas no score of a rock or a stray has yet,
 * the latter seven characters, as many as the longest label
 * (`MOST_POINTS_CHARACTERS`): the worst a room must hold.
 */
const LABELS_SHOWN = [
  "+12",
  "+40 ×2",
  "+500 ×4",
  "+1,000",
  "+88,888",
  "+00 ×4",
] as const;

/** Returns the size the points are lettered at, at a unit, in device pixels. */
function sizeAt(unit: number): number {
  return POINTS_TEXT.size * unit;
}

/** Returns how far the specs' font moves the pen past a text, at a size, its kerning included. */
function widthOf(text: string, size: number): number {
  const characters = Array.from(text).filter(isCharacter);
  const kerned = text.split("+1").length - 1;
  return (
    characters.reduce((sum, character) => sum + SHAPES[character][0], 0) *
      size +
    kerned * PLUS_ONE * size
  );
}

/** Returns whether a character is one the specs' font sets. */
function isCharacter(character: string): character is PointsCharacter {
  return Object.hasOwn(SHAPES, character);
}

/** Returns how far a character's ink reaches in the specs' font, as shares of its size. */
function inkOf(character: string): readonly [number, number, number, number] {
  return isCharacter(character)
    ? SHAPES[character][1]
    : [0, 0, LINE.ascent, LINE.descent];
}

/**
 * Returns what a canvas set to the specs' font at a unit measures of a
 * text: a single character's own ink, or a longer text's advance, and how
 * high and low its characters' ink reaches.
 */
function measureAt(unit: number): (text: string) => MeasuredText {
  const size = sizeAt(unit);
  return (text) => {
    const width = widthOf(text, size);
    const inks = Array.from(text, inkOf);
    const [left, right] = isCharacter(text) ? inkOf(text) : [0, width / size];
    return {
      width,
      actualBoundingBoxLeft: left * size,
      actualBoundingBoxRight: right * size,
      actualBoundingBoxAscent: Math.max(...inks.map((ink) => ink[2])) * size,
      actualBoundingBoxDescent: Math.max(...inks.map((ink) => ink[3])) * size,
    };
  };
}

/** Returns the points lettered in the specs' font at a unit. */
function letteredAt(unit: number): PointsLettering {
  return letterPoints(FAMILY, unit, measureAt(unit));
}

/** Returns a label laid out in a lettering, in a record that holds it. */
function laidOut(label: string, lettering: PointsLettering): PointsLayout {
  const layout = pointsLayout(MOST_POINTS_CHARACTERS);
  layOutPoints(label, lettering, layout);
  return layout;
}

/** Returns the glyph whose frames a frame's name is among. */
function glyphNamed(lettering: PointsLettering, name: string): Glyph {
  const glyph = POINTS_CHARACTERS.map(
    (character) => lettering.glyphs[character],
  ).find(
    ({ frames }) =>
      frames !== null &&
      (frames.fills.includes(name) || frames.outlines.includes(name)),
  );
  if (!glyph) throw new Error(`No glyph has the frame "${name}".`);
  return glyph;
}

/** Describes a rectangle, in whole pixels. */
interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Returns whether a rectangle lies wholly inside another. */
function inside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** Returns whether two rectangles share no pixel. */
function apart(a: Rect, b: Rect): boolean {
  return (
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

describe("POINTS_CHARACTERS", () => {
  it("holds every character a label of points is written in", () => {
    expect(
      Array.from("+1,234,567,890 ×4").every((character) =>
        POINTS_CHARACTERS.some((each) => each === character),
      ),
    ).toBe(true);
  });
});

describe("pointsFace", () => {
  it("names the points' weight, in a family, at a size", () => {
    expect(pointsFace(FAMILY)).toBe("700 1px Spec Sans");
  });
});

describe("letteringUnit", () => {
  it("letters at a field's unit rounded down to a whole device pixel, one at least, however large", () => {
    expect([0.4, 12.5, 29.75, 30, 45.3, 120].map(letteringUnit)).toEqual([
      1, 12, 29, 30, 45, 120,
    ]);
  });
});

describe("letterPoints", () => {
  const lettering = letteredAt(UNIT);
  const size = sizeAt(UNIT);
  const outline = POINTS_TEXT.outline * UNIT;

  it("letters the points in the family, bold, at the unit's size, outlined a share of it, past the art's largest unit", () => {
    const large = letteredAt(45);

    expect({
      family: large.family,
      font: large.font,
      unit: large.unit,
      outline: large.outline,
    }).toEqual({
      family: FAMILY,
      font: `700 ${String(POINTS_TEXT.size * 45)}px Spec Sans`,
      unit: 45,
      outline: POINTS_TEXT.outline * 45,
    });
  });

  it("writes the font as CSS does, bold, at the points' size in device pixels", () => {
    expect(letteringFont(FAMILY, UNIT)).toBe(`700 ${String(size)}px Spec Sans`);
  });

  it("takes the line's ascent and descent from the ink of a line's highest and deepest characters, as Phaser's Text does", () => {
    expect({ ascent: lettering.ascent, descent: lettering.descent }).toEqual({
      ascent: LINE.ascent * size,
      descent: LINE.descent * size,
    });
  });

  it.each(POINTS_CHARACTERS.filter((character) => character !== " "))(
    "frames %j's ink and the outline round it a pixel clear of its frames' edges at every step, on whole pixels",
    (character) => {
      const glyph = lettering.glyphs[character];
      const [, [left, right, ascent, descent]] = SHAPES[character];
      const reach = outline / 2 + 1;
      const lastStep = (PEN_STEPS - 1) / PEN_STEPS;
      // Clear by the reach, and by less than a pixel more.
      const clear = (gap: number): boolean => gap >= 0 && gap < 1;
      expect({
        left: clear(glyph.x - left * size - reach),
        right: clear(glyph.width - (glyph.x + lastStep + right * size) - reach),
        top: clear(glyph.y - ascent * size - reach),
        bottom: clear(glyph.height - (glyph.y + descent * size) - reach),
        whole: [glyph.x, glyph.y, glyph.width, glyph.height].every(
          Number.isInteger,
        ),
      }).toEqual({
        left: true,
        right: true,
        top: true,
        bottom: true,
        whole: true,
      });
    },
  );

  it("keeps each character's advance, and its kerning with each after it", () => {
    const plus = lettering.glyphs["+"];

    expect({
      advance: plus.advance,
      kerned: plus.kerning["1"],
      unkerned: plus.kerning["2"],
    }).toEqual({
      advance: 0.6 * size,
      kerned: expect.closeTo(PLUS_ONE * size, 9) as unknown,
      unkerned: expect.closeTo(0, 9) as unknown,
    });
  });

  it("names each character's fill and outline at each step for it", () => {
    expect(lettering.glyphs["0"].frames).toEqual({
      fills: ["points-0-0", "points-0-1", "points-0-2", "points-0-3"],
      outlines: [
        "points-0-outline-0",
        "points-0-outline-1",
        "points-0-outline-2",
        "points-0-outline-3",
      ],
    });
  });

  it("names the frames of the signs for them, and gives a space none", () => {
    expect(
      (["+", ",", "×", " "] as const).map((character) => {
        const frames = lettering.glyphs[character].frames;
        return frames && [frames.fills[0], frames.outlines[3]];
      }),
    ).toEqual([
      ["points-plus-0", "points-plus-outline-3"],
      ["points-comma-0", "points-comma-outline-3"],
      ["points-times-0", "points-times-outline-3"],
      null,
    ]);
  });
});

describe("packPoints", () => {
  const lettering = letteredAt(UNIT);
  const atlas = packPoints(lettering);

  it("writes each character filled at each step of a pixel, then outlined at each, its pen a step further in its frame each time", () => {
    const glyph = lettering.glyphs["4"];

    expect(
      atlas.frames
        .filter(({ character }) => character === "4")
        .map(({ name, outlined, x, y, width, height, penX, penY }) => ({
          name,
          outlined,
          size: [width, height],
          pen: [penX - x, penY - y],
        })),
    ).toEqual(
      [false, true].flatMap((outlined) =>
        [0, 1, 2, 3].map((step) => ({
          name: `points-4${outlined ? "-outline" : ""}-${String(step)}`,
          outlined,
          size: [glyph.width, glyph.height],
          pen: [glyph.x + step / PEN_STEPS, glyph.y],
        })),
      ),
    );
  });

  it("packs every character's frames but a space's, each of its own name, none over another, inside the atlas on whole pixels", () => {
    const { frames, width, height } = atlas;
    const sheet = { x: 0, y: 0, width, height };

    expect({
      count: frames.length,
      names: new Set(frames.map(({ name }) => name)).size,
      spaces: frames.filter(({ character }) => character === " ").length,
      inside: frames.every((frame) => inside(frame, sheet)),
      apart: frames.every((a, i) =>
        frames.slice(i + 1).every((b) => apart(a, b)),
      ),
      whole: frames.every(({ x, y }) => Number.isInteger(x + y)),
    }).toEqual({
      count: (POINTS_CHARACTERS.length - 1) * PEN_STEPS * 2,
      names: (POINTS_CHARACTERS.length - 1) * PEN_STEPS * 2,
      spaces: 0,
      inside: true,
      apart: true,
      whole: true,
    });
  });

  it("refuses a lettering whose character lacks a frame at a step", () => {
    const four = lettering.glyphs["4"];
    const lacking = {
      ...lettering,
      glyphs: {
        ...lettering.glyphs,
        "4": { ...four, frames: { fills: [], outlines: [] } },
      },
    };

    expect(() => packPoints(lacking)).toThrow(RangeError);
  });

  it("fits the points' atlas in 2048 × 2048 at the largest unit", () => {
    const { width, height } = packPoints(letteredAt(LARGEST_UNIT));

    expect(Math.max(width, height)).toBeLessThanOrEqual(TEXTURE_SIDE);
  });
});

describe("layOutPoints", () => {
  const lettering = letteredAt(UNIT);
  const { glyphs, outline, ascent, descent } = lettering;
  const size = sizeAt(UNIT);

  it("boxes a label as a Text boxes a line of it, its outline round it, whole pixels across", () => {
    const layout = laidOut("+12", lettering);

    expect({ width: layout.width, height: layout.height }).toEqual({
      width: Math.ceil(outline + widthOf("+12", size)),
      height: ascent + descent + outline,
    });
  });

  it("sets each character from its pen, on from the last by its advance and their kerning, taken to the nearest step of a pixel", () => {
    // The pens lie at 3, 13.45 and 23.9: half an outline in, then on by
    // 0.6 less the kerning, then by 0.55, of the size, 19.
    const layout = laidOut("+12", lettering);

    expect({
      fills: layout.fills.slice(0, 3),
      outlines: layout.outlines.slice(0, 3),
      xs: layout.xs.slice(0, 3),
    }).toEqual({
      fills: ["points-plus-0", "points-1-2", "points-2-0"],
      outlines: [
        "points-plus-outline-0",
        "points-1-outline-2",
        "points-2-outline-0",
      ],
      xs: [3 - glyphs["+"].x, 13 - glyphs["1"].x, 24 - glyphs["2"].x],
    });
  });

  it("sets each character on the baseline, half an outline and the ascent down from the box's top, on a whole pixel", () => {
    const layout = laidOut("+40 ×2", lettering);

    const baseline = Math.round(outline / 2 + ascent);
    expect(layout.ys.slice(0, 6)).toEqual(
      (["+", "4", "0", " ", "×", "2"] as const).map(
        (character) => baseline - glyphs[character].y,
      ),
    );
  });

  it("sets no frame for a space, moving the pen on past it", () => {
    // The space's pen lies at 35.3, and the times sign's 4.75 on, at 40.05.
    const layout = laidOut("+40 ×2", lettering);

    expect({
      fill: layout.fills[3],
      outline: layout.outlines[3],
      next: [layout.fills[4], layout.xs[4]],
    }).toEqual({
      fill: null,
      outline: null,
      next: ["points-times-0", 40 - glyphs["×"].x],
    });
  });

  it("sets no more than the label's characters", () => {
    const layout = pointsLayout(MOST_POINTS_CHARACTERS);
    layOutPoints("+500 ×4", lettering, layout);

    layOutPoints("+40", lettering, layout);

    expect({
      length: layout.length,
      fills: layout.fills.slice(0, layout.length),
    }).toEqual({
      length: 3,
      fills: ["points-plus-0", "points-4-2", "points-0-3"],
    });
  });

  it("refuses a character the points aren't written in", () => {
    expect(() => {
      laidOut("-40", lettering);
    }).toThrow(RangeError);
  });

  it("refuses a label longer than its record holds", () => {
    expect(() => {
      laidOut("+12,500 ×4", lettering);
    }).toThrow(RangeError);
  });
});

describe("pointsSheet", () => {
  const lettering = letteredAt(UNIT);
  const sheet = pointsSheet(lettering, LABELS, MOST_POINTS_CHARACTERS);

  it("gives each label a room of its own, apart from every other, inside the sheet", () => {
    const { rooms, width, height } = sheet;
    const whole = { x: 0, y: 0, width, height };

    expect({
      rooms: rooms.length,
      inside: rooms.every((room) => inside(room, whole)),
      apart: rooms.every((a, i) =>
        rooms.slice(i + 1).every((b) => apart(a, b)),
      ),
    }).toEqual({ rooms: LABELS, inside: true, apart: true });
  });

  it.each(LABELS_SHOWN)(
    "holds %j's box, cut to whole pixels, and every frame stamped for it inside its room",
    (label) => {
      const layout = laidOut(label, lettering);
      const [room] = sheet.rooms;
      if (!room) throw new Error("No room.");
      const left = room.x + sheet.boxX;
      const top = room.y + sheet.boxY;
      const box = {
        x: left,
        y: top,
        width: layout.width,
        height: Math.floor(layout.height),
      };
      const stamps = [...layout.fills, ...layout.outlines]
        .map((name, i) => {
          const at = i % MOST_POINTS_CHARACTERS;
          if (!name || at >= layout.length) return null;
          const { width, height } = glyphNamed(lettering, name);
          return {
            x: left + (layout.xs[at] ?? 0),
            y: top + (layout.ys[at] ?? 0),
            width,
            height,
          };
        })
        .filter((stamp) => stamp !== null);

      expect({
        box: inside(box, room),
        stamps: stamps.every((stamp) => inside(stamp, room)),
      }).toEqual({ box: true, stamps: true });
    },
  );

  it("fits the sheet in 2048 × 2048 at the largest unit", () => {
    const { width, height } = pointsSheet(
      letteredAt(LARGEST_UNIT),
      LABELS,
      MOST_POINTS_CHARACTERS,
    );

    expect(Math.max(width, height)).toBeLessThanOrEqual(TEXTURE_SIDE);
  });
});
